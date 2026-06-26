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
    catch (error: any) { return { success: false, message: rb }; }
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
      const cleaned = phoneNumber.replace(/\D/g, '');
      const formatted = phoneNumber.startsWith('+') ? `+${cleaned}` : `+91${cleaned}`;

      // Reviewer bypass — App Store/Play review team uses a fixed test number.
      // Prefer EXPO_PUBLIC_REVIEWER_PHONE from .env / EAS secrets, but this code
      // also falls back to a hardcoded default review number if the env var is unset.
      const reviewerPhone = process.env.EXPO_PUBLIC_REVIEWER_PHONE || '+919999999999';
      const cleanFormatted = formatted.replace(/\D/g, '');
      const cleanReviewer = reviewerPhone.replace(/\D/g, '');
      
      // Match if the last 10 digits are the same (handles +1 vs +91 vs no prefix)
      const isReviewer = cleanFormatted.endsWith(cleanReviewer.slice(-10)) || formatted === reviewerPhone;

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

      const cleaned = rawPhone.replace(/\D/g, '');
      const phone = rawPhone.startsWith('+') ? `+${cleaned}` : `+91${cleaned}`;

      let firebaseUid: string;

      // Reviewer bypass — accept fixed OTP for the configured reviewer phone.
      const reviewerPhone = process.env.EXPO_PUBLIC_REVIEWER_PHONE || '+919999999999';
      const reviewerCode = process.env.EXPO_PUBLIC_REVIEWER_OTP ?? '123456';
      
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanReviewer = reviewerPhone.replace(/\D/g, '');
      const isReviewer = cleanPhone.endsWith(cleanReviewer.slice(-10)) || phone === reviewerPhone;

      if (isReviewer && code === reviewerCode) {
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

      try { await account.deleteSession('current'); } catch {}
      await account.createSession(sessionResult.userId, sessionResult.secret);

      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Session created but could not fetch user');

      const profile = await get().fetchOrCreateProfile(user);
      set({ user, profile, isAuthenticated: true, tempPhone: null, tempVerificationId: null });
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
<<<<<<< HEAD
    const generationsLimit = (profile.generationsLimit ?? 0) + amount;
    set({ profile: { ...profile, generationsLimit } });
=======
    const credits = (profile.credits ?? 0) + amount;
    set({ profile: { ...profile, credits } });
>>>>>>> 5173b9a096 (new eas build auto sumbit both platform)
    try {
      const updated = await dbService.updateDocument<UserProfile & Models.Document>(
        COLLECTIONS.USERS,
        profile.$id,
<<<<<<< HEAD
        { generationsLimit }
=======
        { credits }
>>>>>>> 5173b9a096 (new eas build auto sumbit both platform)
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
      generationsLimit: 10,
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
            generationsLimit: 10,
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
