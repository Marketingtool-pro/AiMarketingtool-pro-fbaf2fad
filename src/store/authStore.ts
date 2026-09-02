import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Models, ExecutionMethod } from 'react-native-appwrite';
import { authService, dbService, account, functions, COLLECTIONS, Query } from '../services/appwrite';
import { biometricService } from '../services/biometric';
import {
  sendPhoneOTP as firebaseSendOTP,
  verifyPhoneOTP as firebaseVerifyOTP,
  signOutFirebase,
} from '../services/firebaseAuth';

// Appwrite Functions return responseBody as either an object (newer SDK)
// OR as a JSON string (older SDK) OR as a plain text error message (4xx).
// Always normalize to an object so consumers can read .success / .message safely.
export function parseAppwriteResponse(rb: any): any {
  if (!rb) return {};
  if (typeof rb === 'object') return rb;
  if (typeof rb === 'string') {
    try { return JSON.parse(rb); }
    catch (error: any) {
      console.warn('[authStore] Failed to parse Appwrite responseBody as JSON', {
        error: error?.message ?? String(error),
        responseBody: rb,
      });
      return { success: false, message: rb };
    }
  }
  return {};
}

interface UserProfile {
  $id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  subscription: 'free' | 'starter' | 'pro' | 'growth' | 'enterprise';
  generationsUsed: number;
  generationsLimit: number;
  credits?: number;
  generationsCount?: number;
  savedCount?: number;
  toolsUsed?: number;
  createdAt: string;
}

// Inline entitlement type — mirrors billingService.ts Entitlement.
// Defined here to avoid a circular import (billingService imports from authStore).
export interface LocalEntitlement {
  tier: 'starter' | 'pro' | 'enterprise';
  generationsLimit: number;
}

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  profile: UserProfile | null;
  localSubscriptionOverride: 'free' | 'starter' | 'pro' | 'growth' | 'enterprise';
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  tempPhone: string | null;
  tempVerificationId: string | null;
  biometricPending: boolean;
  mfaPending: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  sendPhoneOTP: (phoneNumber: string) => Promise<string>;
  verifyPhoneOTP: (userId: string, code: string) => Promise<void>;
  clearOtpTemp: () => void;
  verifyTOTP: (otp: string) => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  setup2FA: () => Promise<any>;
  enable2FA: (otp: string) => Promise<void>;
  disable2FA: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  grantEntitlement: (tier: UserProfile['subscription'], generationsLimit: number) => Promise<void>;
  grantCredits: (amount: number) => Promise<void>;
  incrementGenerationsUsed: (by?: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
  applyLocalEntitlement: (entitlement: LocalEntitlement) => void;
  clearError: () => void;
  fetchOrCreateProfile: (user: Models.User<Models.Preferences>) => Promise<UserProfile>;
}

/**
 * Store-review OTP bypass check.
 *
 * Deliberately strict, because this branch skips SMS verification entirely:
 *
 *  - Matches the FULL E.164 number. The previous implementation compared only
 *    the last 10 digits, which meant any number ending in the reviewer's last
 *    10 digits -- in any of the ~200 supported dialling codes -- could skip OTP.
 *  - Requires BOTH EXPO_PUBLIC_REVIEWER_PHONE and EXPO_PUBLIC_REVIEWER_OTP to
 *    be set. There are no hardcoded fallbacks, so the bypass is inert in any
 *    build that does not explicitly configure it.
 *
 * Note this is still a client-side check, and EXPO_PUBLIC_* values are inlined
 * into the JS bundle at build time. Configure it only for the build handed to
 * store review; the durable fix is to move the reviewer session server-side
 * (the Appwrite phone-session function) so no bypass ships to users at all.
 */
function isReviewerPhone(e164: string): boolean {
  const phone = process.env.EXPO_PUBLIC_REVIEWER_PHONE?.trim();
  const code = process.env.EXPO_PUBLIC_REVIEWER_OTP?.trim();
  if (!phone || !code) return false;
  return e164 === `+${phone.replace(/\D/g, '')}`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  localSubscriptionOverride: 'free',
  isLoading: true,
  isAuthenticated: false,
  error: null,
  tempPhone: null,
  tempVerificationId: null,
  biometricPending: false,
  mfaPending: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    // Reviewer bypass for App Store / Play Store — allows entry even if
    // Appwrite is unreachable or the demo account wasn't created.
    // Normalize email (trim + lowercase) and trim the password so iOS autofill
    // whitespace or an auto-capitalized first letter can never defeat the match.
    // Reviewer password(s): prefer EXPO_PUBLIC_REVIEWER_PASSWORDS (comma-separated) so the
    // value can be overridden via EAS env / .env. Falls back to the throwaway demo password
    // printed in the App Store Connect review notes so the bypass ALWAYS works for the
    // reviewer even if the env var didn't make it into the build (this mirrors the hardcoded
    // OTP fallback '123456' below). This is a reviewer-only demo account with no real data.
    const REVIEWER_PASSWORDS = (process.env.EXPO_PUBLIC_REVIEWER_PASSWORDS || 'MarketingTool2026Demo!')
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);
    if (
      email.trim().toLowerCase() === 'demo@marketingtool.pro' &&
      REVIEWER_PASSWORDS.length > 0 &&
      REVIEWER_PASSWORDS.includes(password.trim())
    ) {
      const mockUser = {
        $id: 'reviewer_bypass',
        name: 'App Store Reviewer',
        email: 'demo@marketingtool.pro',
        registration: new Date().toISOString(),
        status: true,
        passwordUpdate: new Date().toISOString(),
        emailVerification: true,
        phoneVerification: true,
        prefs: {},
      };
      // Still try to fetch/create a real profile in Appwrite so the app
      // behaves normally, but ignore errors so the reviewer isn't blocked.
      // Guideline 2.1(b): the reviewer account is a FREE account with its trial
      // generations used up, so App Review can SEE the post-trial In-App Purchase
      // flow — tapping Generate (or Profile -> Manage Plan) opens the StoreKit
      // paywall. All tools are open on every plan now, so a free account no
      // longer shows "locked" tools; only the generation quota gates.
      try {
        const profile = await get().fetchOrCreateProfile(mockUser as any);
        const reviewerProfile: UserProfile = {
          ...profile,
          subscription: 'free',
          generationsUsed: 3,
          generationsLimit: 3,
        };
        set({ user: mockUser as any, profile: reviewerProfile, isAuthenticated: true, isLoading: false });
      } catch {
        const fallbackProfile: UserProfile = {
          $id: 'reviewer_bypass',
          userId: 'reviewer_bypass',
          name: 'App Store Reviewer',
          email: 'demo@marketingtool.pro',
          subscription: 'free',
          generationsUsed: 3,
          generationsLimit: 3,
          createdAt: new Date().toISOString(),
        };
        set({ user: mockUser as any, profile: fallbackProfile, isAuthenticated: true, isLoading: false });
      }
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout')), 30000)
      );
      await Promise.race([authService.login(email, password), timeoutPromise]);
      const user = await Promise.race([authService.getCurrentUser(), timeoutPromise]) as any;
      if (user) {
        const profile = await get().fetchOrCreateProfile(user);
        set({ user, profile, isAuthenticated: true, isLoading: false });
        
        const bioAvailable = await biometricService.isBiometricAvailable();
        if (bioAvailable) {
          // Check if already enabled in settings before forcing it
          const bioEnabled = await biometricService.isBiometricEnabled();
          if (!bioEnabled) {
             // We could prompt here, but let's keep it simple
          }
        }
      }
    } catch (error: any) {
      if (error.type === 'user_mfa_required' || (error.code === 401 && error.message?.includes('MFA'))) {
        set({ mfaPending: true, isLoading: false });
        return;
      }
      set({ error: error.message || 'Login failed', isLoading: false });
      throw error;
    }
  },

  verifyTOTP: async (otp: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.verify2FA(otp);
      const user = await authService.getCurrentUser();
      if (user) {
        const profile = await get().fetchOrCreateProfile(user);
        set({ user, profile, isAuthenticated: true, isLoading: false, mfaPending: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Invalid 2FA code', isLoading: false });
      throw error;
    }
  },

  setup2FA: async () => {
    return await authService.createTOTP();
  },

  enable2FA: async (otp: string) => {
    set({ isLoading: true });
    try {
      // Must verify the TOTP code before enabling MFA, otherwise any caller
      // could enable MFA without proving they own the authenticator.
      await authService.verify2FA(otp);
      await authService.update2FA(true);
      const user = await authService.getCurrentUser();
      set({ user, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  disable2FA: async () => {
    set({ isLoading: true });
    try {
      await authService.update2FA(false);
      const user = await authService.getCurrentUser();
      set({ user, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.createAccount(email, password, name);
      const user = await authService.getCurrentUser();
      if (user) {
        const profile = await get().fetchOrCreateProfile(user);
        set({ user, profile, isAuthenticated: true, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Registration failed', isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginWithGoogle();
      if (session) {
        const user = await authService.getCurrentUser();
        if (user) {
          const profile = await get().fetchOrCreateProfile(user);
          set({ user, profile, isAuthenticated: true, isLoading: false });
          return;
        }
      }
      set({ isLoading: false, error: 'Google login was cancelled or failed' });
    } catch (error: any) {
      set({ error: error.message || 'Google login failed', isLoading: false });
      throw error;
    }
  },

  loginWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginWithApple();
      if (session) {
        const user = await authService.getCurrentUser();
        if (user) {
          const profile = await get().fetchOrCreateProfile(user);
          set({ user, profile, isAuthenticated: true, isLoading: false });
          return;
        }
      }
      set({ isLoading: false, error: 'Apple login was cancelled or failed' });
    } catch (error: any) {
      set({ error: error.message || 'Apple login failed', isLoading: false });
      throw error;
    }
  },

  loginWithFacebook: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginWithFacebook();
      if (session) {
        const user = await authService.getCurrentUser();
        if (user) {
          const profile = await get().fetchOrCreateProfile(user);
          set({ user, profile, isAuthenticated: true, isLoading: false });
          return;
        }
      }
      set({ isLoading: false, error: 'Facebook login was cancelled or failed' });
    } catch (error: any) {
      set({ error: error.message || 'Facebook login failed', isLoading: false });
      throw error;
    }
  },

  clearOtpTemp: () => set({ tempPhone: null, tempVerificationId: null }),

  sendPhoneOTP: async (phoneNumber: string) => {
    // Firebase Phone Auth — Google's SMS infrastructure (Uber/Ola pattern).
    // Trusted by users; handles silent push on iOS / SMS auto-retrieval on
    // Android automatically. firebaseAuth service is in services/firebaseAuth.ts.
    set({ error: null });
    try {
      // The login UI always prepends the selected dialling code, so a number
      // without '+' means the country was lost upstream. Guessing (this used to
      // default to '+91') silently routes a non-Indian user's OTP to a wrong
      // number, so refuse rather than mis-deliver.
      if (!phoneNumber.trim().startsWith('+')) {
        throw new Error('Please select your country code and re-enter your number.');
      }
      const formatted = `+${phoneNumber.replace(/\D/g, '')}`;

      // Reviewer bypass for store review (App Store Guideline 2.1(b)).
      // Inert unless BOTH env vars are explicitly set, and matched on the FULL
      // number. The previous check compared only the last 10 digits, so any
      // number ending in those digits -- in any supported country -- skipped
      // OTP entirely. The hardcoded '+919999999999' fallback also meant the
      // bypass stayed live even with no configuration at all.
      const isReviewer = isReviewerPhone(formatted);

      if (isReviewer) {
        if (__DEV__) console.log('[Auth] Reviewer bypass active for', formatted);
        set({ tempPhone: formatted, tempVerificationId: formatted });
        return formatted;
      }

      if (__DEV__) console.log('[Auth] Sending OTP via Firebase to', formatted);
      const result = await firebaseSendOTP(formatted);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }
      set({ tempPhone: formatted, tempVerificationId: formatted });
      return formatted;
    } catch (error: any) {
      if (__DEV__) console.log('[Auth] Send OTP error:', error.message);
      set({ error: error.message || 'Failed to send OTP' });
      throw error;
    }
  },

  verifyPhoneOTP: async (_userId: string, code: string) => {
    set({ error: null });
    try {
      const rawPhone = get().tempPhone || _userId;
      if (!rawPhone) {
        throw new Error('Verification session expired. Please request a new code.');
      }

      // rawPhone comes from tempPhone, which sendPhoneOTP already normalised to
      // E.164, so only ensure the '+' -- never inject a country code here.
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const phone = `+${cleanPhone}`;

      let firebaseUid: string;

      // Reviewer bypass — full-number match, and only when explicitly
      // configured. See sendPhoneOTP for why the previous last-10-digits
      // comparison was unsafe across ~200 dialling codes.
      const reviewerCode = process.env.EXPO_PUBLIC_REVIEWER_OTP?.trim();
      const isReviewer = isReviewerPhone(phone);

      if (isReviewer && !!reviewerCode && code === reviewerCode) {
        firebaseUid = 'reviewer_bypass_' + cleanPhone.slice(-10);
      } else {
        if (__DEV__) console.log('[Auth] Verifying OTP via Firebase for', phone);
        const verifyResult = await firebaseVerifyOTP(code);
        if (!verifyResult.success || !verifyResult.user) {
          throw new Error(verifyResult.error || 'Invalid OTP. Please try again.');
        }
        firebaseUid = verifyResult.user.uid;
      }

      // Mint Appwrite session via phone-session function. The function takes
      // firebaseUid + phone and returns a one-time secret we exchange for a
      // session token. Sync execution — guests can't poll executions.read.
      const sessionExec = await functions.createExecution(
        'phone-session',
        JSON.stringify({ firebaseUid, phone, displayName: '' }),
        false, '/', ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );

      const sessionResult = parseAppwriteResponse(sessionExec.responseBody);
      if (!sessionResult.success || !sessionResult.userId || !sessionResult.secret) {
        throw new Error(sessionResult.error || 'Failed to create session');
      }

      // Appwrite refuses createSession while a session is already active, which
      // is why this used to deleteSession('current') unconditionally first. But
      // on a fresh OTP login there IS no session, so that call could only ever
      // fail — a guaranteed-404/401 round-trip paid on EVERY login, with its
      // result thrown away. Create first; only clear and retry in the genuine
      // re-login case, so the common path costs one round-trip instead of two.
      //
      // Goes through authService.createTokenSession, not account.createSession:
      // the SDK exposes only the parsed body, so the x-fallback-cookies header
      // that carries the session is unreachable and the session is lost on
      // Android the moment it is created. Email and OAuth already took this
      // route; phone was the last path still on the SDK.
      try {
        await authService.createTokenSession(sessionResult.userId, sessionResult.secret);
      } catch {
        try { await account.deleteSession('current'); } catch {}
        await authService.createTokenSession(sessionResult.userId, sessionResult.secret);
      }

      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Session created but could not fetch user');

      // Authenticate as soon as the session is real.
      //
      // fetchOrCreateProfile is one more Appwrite round-trip (two for a new user:
      // listDocuments then createDocument) sitting behind a 30s timeout, and it
      // already returns a defaultProfile when it fails. So it was never a gate on
      // login — only a delay in front of the home screen, and on a slow network a
      // very long one. Land the user now and fill the profile in behind them.
      set({ user, isAuthenticated: true, tempPhone: null, tempVerificationId: null });

      get()
        .fetchOrCreateProfile(user)
        .then((profile) => set({ profile }))
        .catch(() => { /* defaultProfile already applied inside; never block login */ });
      return;
    } catch (error: any) {
      if (__DEV__) console.log('[Auth] Verify OTP error:', error.message);
      set({ error: error.message || 'Invalid OTP' });
      throw error;
    }
  },

  authenticateWithBiometric: async () => {
    try {
      const bioEnabled = await biometricService.isBiometricEnabled();
      if (!bioEnabled) return false;

      const success = await biometricService.authenticate('Login with biometrics');
      if (success) {
        set({ isLoading: true });
        const user = await authService.getCurrentUser();
        if (user) {
          const profile = await get().fetchOrCreateProfile(user);
          set({ user, profile, isAuthenticated: true, isLoading: false, biometricPending: false });
          return true;
        }
        set({ isLoading: false });
      }
      return false;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      // Sign out of Firebase too — phone-auth users have a Firebase session
      // alongside the Appwrite one. Failing to sign out leaves the Firebase
      // user logged in and triggers stale-state behavior on next login.
      try { await signOutFirebase(); } catch {}
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        biometricPending: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // Load local subscription override
      try {
        const override = await SecureStore.getItemAsync('local_subscription_override');
        if (override) {
          set({ localSubscriptionOverride: override as any });
        }
      } catch (e: any) {
        console.warn('[AuthStore] Load local subscription override failed:', e);
      }

      // Check if biometric is enabled
      const bioEnabled = await biometricService.isBiometricEnabled();
      if (bioEnabled) {
        set({ biometricPending: true });
      }

      // Add timeout to prevent hanging on unreachable API
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 30000)
      );
      const user = await Promise.race([
        authService.getCurrentUser(),
        timeoutPromise
      ]) as any;
      if (user) {
        const profile = await get().fetchOrCreateProfile(user);
        set({ user, profile, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error: any) {
      // On error or timeout, proceed as not authenticated
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resetPassword(email);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Password reset failed', isLoading: false });
      throw error;
    }
  },

  updateProfile: async (data: Partial<UserProfile>) => {
    const { profile } = get();
    if (!profile) return;

    set({ isLoading: true });
    try {
      const updated = await dbService.updateDocument<UserProfile & Models.Document>(
        COLLECTIONS.USERS,
        profile.$id,
        data
      );
      set({ profile: updated as UserProfile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Unlock the entitlement the instant a StoreKit/Play purchase is confirmed.
  // Sets local state FIRST (optimistic, never blocked by the network) so Pro
  // tools unlock immediately, then best-effort persists to the profile document
  // so the unlock survives refreshProfile()/app restart. A failed DB write must
  // NOT re-lock the user — the finished transaction already proves the purchase.
  grantEntitlement: async (tier, generationsLimit) => {
    set({ localSubscriptionOverride: tier });
    try {
      await SecureStore.setItemAsync('local_subscription_override', tier);
    } catch (e: any) {
      console.warn('[AuthStore] Save local subscription override failed:', e);
    }
    const { profile } = get();
    if (!profile) return;
    set({ profile: { ...profile, subscription: tier, generationsLimit } });
    try {
      const updated = await dbService.updateDocument<UserProfile & Models.Document>(
        COLLECTIONS.USERS,
        profile.$id,
        { subscription: tier, generationsLimit }
      );
      set({ profile: updated as UserProfile });
    } catch (error: any) {
      console.warn('[AuthStore] grantEntitlement persist failed (local unlock kept):', error);
    }
  },

  // Token packs are "added instantly to your account" (pricing page). Credit
  // locally from the finished transaction first — same philosophy as
  // grantEntitlement: a failed server write must not eat a paid purchase.
  grantCredits: async (amount: number) => {
    const { profile } = get();
    if (!profile) return;
    const credits = (profile.credits ?? 0) + amount;
    set({ profile: { ...profile, credits } });
    try {
      const updated = await dbService.updateDocument<UserProfile & Models.Document>(
        COLLECTIONS.USERS,
        profile.$id,
        { credits }
      );
      set({ profile: updated as UserProfile });
    } catch (error: any) {
      console.warn('[AuthStore] grantCredits persist failed (local credit kept):', error);
    }
  },

  // Count a successful generation against the user's plan quota. Optimistic
  // local increment first (the counter must move immediately so the "X
  // remaining" display updates and the quota gate works), then best-effort
  // persist to the same field so refreshProfile() reads back a consistent
  // value. A failed write must not lose the count or block the user.
  incrementGenerationsUsed: async (by = 1) => {
    const { profile } = get();
    if (!profile) return;
    const generationsUsed = (profile.generationsUsed ?? 0) + by;
    set({ profile: { ...profile, generationsUsed } });
    try {
      const updated = await dbService.updateDocument<UserProfile & Models.Document>(
        COLLECTIONS.USERS,
        profile.$id,
        { generationsUsed }
      );
      set({ profile: updated as UserProfile });
    } catch (error: any) {
      console.warn('[AuthStore] incrementGenerationsUsed persist failed (local count kept):', error);
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const profile = await get().fetchOrCreateProfile(user);
      set({ profile });
    } catch (error: any) {
      console.error('[AuthStore] Refresh profile failed:', error);
    }
  },

  // Immediately apply a purchase entitlement to the local profile so the UI
  // unlocks Pro features without waiting for a server round-trip. This is the
  // client-side half of the Guideline 2.1(b) fix; the server sync happens
  // asynchronously via iap-verify and refreshProfile.
  applyLocalEntitlement: (entitlement: LocalEntitlement) => {
    const { profile } = get();
    if (!profile) return;
    const tierRank: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };
    const currentRank = tierRank[profile.subscription] ?? 0;
    const newRank     = tierRank[entitlement.tier] ?? 0;
    if (newRank >= currentRank) {
      set({
        profile: {
          ...profile,
          subscription:     entitlement.tier,
          generationsLimit: entitlement.generationsLimit,
        },
      });
    }
  },

  clearError: () => set({ error: null }),

  fetchOrCreateProfile: async (user: Models.User<Models.Preferences>): Promise<UserProfile> => {
    const defaultProfile: UserProfile = {
      $id: user.$id,
      userId: user.$id,
      name: user.name || '',
      email: user.email,
      subscription: 'free',
      generationsUsed: 0,
      generationsLimit: 3,
      createdAt: new Date().toISOString(),
    };

    try {
      const profileTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 30000)
      );

      // Try to fetch existing profile
      const profiles = await Promise.race([
        dbService.listDocuments<UserProfile & Models.Document>(
          COLLECTIONS.USERS,
          [Query.equal('userId', user.$id)]
        ),
        profileTimeout,
      ]);

      if (profiles.documents.length > 0) {
        return profiles.documents[0] as UserProfile;
      }

      // Create new profile
      const newProfile = await Promise.race([
        dbService.createDocument<UserProfile & Models.Document>(
          COLLECTIONS.USERS,
          {
            userId: user.$id,
            name: user.name || '',
            email: user.email,
            subscription: 'free',
            generationsUsed: 0,
            generationsLimit: 3,
            createdAt: new Date().toISOString(),
          }
        ),
        profileTimeout,
      ]);

      return newProfile as UserProfile;
    } catch (error: any) {
      // Surface network/timeout errors in state so the UI can show a warning.
      // We still return a temporary defaultProfile so auth isn't blocked.
      if (error?.message && !error.message.includes('Document with the requested ID')) {
        console.warn('[AuthStore] fetchOrCreateProfile failed:', error.message);
        set({ error: 'Profile load failed — some features may be limited.' });
      }
      return defaultProfile;
    }
  },
}));

export default useAuthStore;
