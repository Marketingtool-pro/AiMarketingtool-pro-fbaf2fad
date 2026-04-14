import { create } from 'zustand';
import { Models } from 'react-native-appwrite';
import { authService, dbService, COLLECTIONS, Query } from '../services/appwrite';
import { sendPhoneOTP as firebaseSendOTP, verifyPhoneOTP as firebaseVerifyOTP } from '../services/firebaseAuth';
import { biometricService } from '../services/biometric';

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
    set({ isLoading: true, error: null });
    try {
      const result = await firebaseSendOTP(phoneNumber);
      if (!result.success) throw new Error(result.error);
      set({ isLoading: false, tempPhone: phoneNumber });
      return phoneNumber;
    } catch (error: any) {
      set({ error: error.message || 'Failed to send OTP', isLoading: false });
      throw error;
    }
  },

  verifyPhoneOTP: async (_userId: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await firebaseVerifyOTP(code);
      if (!result.success) throw new Error(result.error || 'Invalid OTP');

      const firebaseUser = result.user;
      const phone = firebaseUser.phoneNumber;

      // Create Appwrite session via server-side function (no hardcoded password)
      try {
        const { functions } = require('../services/appwrite');
        const { ExecutionMethod } = require('react-native-appwrite');
        const execution = await functions.createExecution(
          'phone-session',
          JSON.stringify({
            firebaseUid: firebaseUser.uid,
            phone: phone,
            displayName: firebaseUser.displayName || 'User',
          }),
          false, '/', ExecutionMethod.POST,
        );
        const sessionResult = JSON.parse(execution.responseBody);
        if (sessionResult.success && sessionResult.userId && sessionResult.secret) {
          const { account } = require('../services/appwrite');
          await account.createSession(sessionResult.userId, sessionResult.secret);
          if (__DEV__) console.log('[Auth] Appwrite session created for phone user');
        }
      } catch (sessionError: any) {
        if (__DEV__) console.log('[Auth] Server session failed:', sessionError.message);
      }

      // Get Appwrite user or use Firebase data as fallback
      let user = await authService.getCurrentUser();
      if (!user) {
        user = {
          $id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: `${phone?.replace(/\D/g, '')}@phone.marketingtool.pro`,
          phone: phone,
        } as any;
      }

      const profile = await get().fetchOrCreateProfile(user);
      set({ user, profile, isAuthenticated: true, isLoading: false, tempPhone: null });
    } catch (error: any) {
      set({ error: error.message || 'Invalid OTP', isLoading: false });
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
