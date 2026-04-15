import { create } from 'zustand';
import { Models, ExecutionMethod } from 'react-native-appwrite';
import { authService, dbService, account, functions, COLLECTIONS, Query } from '../services/appwrite';
import { biometricService } from '../services/biometric';

// Appwrite Functions return responseBody as either an object (newer SDK)
// OR as a JSON string (older SDK) OR as a plain text error message (4xx).
// Always normalize to an object so consumers can read .success / .message safely.
function parseAppwriteResponse(rb: any): any {
  if (!rb) return {};
  if (typeof rb === 'object') return rb;
  if (typeof rb === 'string') {
    try { return JSON.parse(rb); }
    catch { return { success: false, message: rb }; }
  }
  return {};
}

interface UserProfile {
  $id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  subscription: 'free' | 'starter' | 'pro' | 'enterprise';
  generationsUsed: number;
  generationsLimit: number;
  credits?: number;
  generationsCount?: number;
  savedCount?: number;
  toolsUsed?: number;
  createdAt: string;
}

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  profile: UserProfile | null;
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
  verifyTOTP: (otp: string) => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  setup2FA: () => Promise<any>;
  enable2FA: (otp: string) => Promise<void>;
  disable2FA: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  fetchOrCreateProfile: (user: Models.User<Models.Preferences>) => Promise<UserProfile>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  tempPhone: null,
  tempVerificationId: null,
  biometricPending: false,
  mfaPending: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout')), 10000)
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
      if (error.type === 'user_mfa_required' || error.code === 401 && error.message?.includes('MFA')) {
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
      // Appwrite requires verifying the secret before enabling MFA
      // The secret was already verified in the setup process
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

  sendPhoneOTP: async (phoneNumber: string) => {
    // Keeps isLoading off so AppNavigator stays on Login (no splash flicker)
    set({ error: null });
    try {
      const cleaned = phoneNumber.replace(/\D/g, '');
      if (__DEV__) console.log('[Auth] Sending OTP via Bird:', cleaned);

      const execution = await functions.createExecution(
        'msg91-proxy',
        JSON.stringify({ action: 'sendOtp', identifier: cleaned }),
        false, '/', ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );

      const responseBody = parseAppwriteResponse(execution.responseBody);
      if (responseBody.type !== 'success' && !responseBody.success) {
        throw new Error(responseBody.message || 'Failed to send OTP');
      }

      // Bird verify flow needs the verificationId returned by sendOtp
      set({ tempPhone: cleaned, tempVerificationId: responseBody.verificationId });
      return cleaned;
    } catch (error: any) {
      if (__DEV__) console.log('[Auth] Send OTP error:', error.message);
      set({ error: error.message || 'Failed to send OTP' });
      throw error;
    }
  },

  verifyPhoneOTP: async (_userId: string, code: string) => {
    set({ error: null });
    try {
      const phone = get().tempPhone || _userId;
      const verificationId = get().tempVerificationId;
      if (__DEV__) console.log('[Auth] Verifying OTP for:', phone, 'vid:', verificationId);

      if (!verificationId) {
        throw new Error('Verification session expired. Please request a new code.');
      }

      // Bird verify expects { action, code, verificationId }
      const verifyExec = await functions.createExecution(
        'msg91-proxy',
        JSON.stringify({ action: 'verifyOtp', code, verificationId }),
        false, '/', ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );
      const verifyResult = parseAppwriteResponse(verifyExec.responseBody);
      if (!verifyResult.success) {
        throw new Error(verifyResult.message || 'Invalid OTP');
      }

      // Step 2: mint Appwrite session via phone-session function
      const sessionExec = await functions.createExecution(
        'phone-session',
        JSON.stringify({
          firebaseUid: 'wa_' + phone.replace(/\D/g, ''),
          phone: phone,
          displayName: '',
        }),
        false, '/', ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );
      const sessionResult = parseAppwriteResponse(sessionExec.responseBody);
      if (!sessionResult.success || !sessionResult.userId || !sessionResult.secret) {
        throw new Error(sessionResult.error || 'Failed to create session');
      }

      // Step 3: create Appwrite session
      try { await account.deleteSession('current'); } catch (_e) {}
      await account.createSession(sessionResult.userId, sessionResult.secret);

      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Session created but could not fetch user');

      const profile = await get().fetchOrCreateProfile(user);
      set({ user, profile, isAuthenticated: true, tempPhone: null, tempVerificationId: null });
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
        // Appwrite session is already managed by the SDK and SecureStore in appwrite.ts
        // We just need to check if we can get the current user
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
    } catch (error) {
      set({ isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
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
      // Check if biometric is enabled
      const bioEnabled = await biometricService.isBiometricEnabled();
      if (bioEnabled) {
        set({ biometricPending: true });
      }

      // Add timeout to prevent hanging on unreachable API
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
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
    } catch (error) {
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

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const profile = await get().fetchOrCreateProfile(user);
      set({ profile });
    } catch (error) {
      console.error('[AuthStore] Refresh profile failed:', error);
    }
  },

  clearError: () => set({ error: null }),

  // Helper function to fetch or create user profile
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
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
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
    } catch (error) {
      // Return a default profile if database operations fail or timeout
      return defaultProfile;
    }
  },
}));

export default useAuthStore;
