import { Platform } from 'react-native';
import appCheck from '@react-native-firebase/app-check';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/**
 * Initializes Firebase App Check.
 *
 * Provider selection:
 *  - __DEV__ / Cloud Test (Firebase Test Lab): debug provider
 *  - Production Android: Play Integrity
 *  - iOS: App Attest (with DeviceCheck fallback)
 */
export const initializeAppCheck = async () => {
  try {
    const firebaseConfig = Constants.expoConfig?.extra?.firebase;
    if (!firebaseConfig) {
      if (__DEV__) console.log('[AppCheck] No configuration found in app.json');
      return;
    }

    // Detect if running in Firebase Test Lab or similar cloud/emulator environments
    const modelName = Device.modelName?.toLowerCase() ?? '';
    const isLikelyCloudOrEmulatorAndroid =
      Platform.OS === 'android' &&
      (modelName.includes('generic') ||
        modelName.includes('gce') ||
        modelName.includes('emulator') ||
        modelName.includes('sdk'));
    const isFirebaseTestLab = process.env.FIREBASE_TEST_LAB === 'true';
    const isCloudTest = !Device.isDevice || isFirebaseTestLab || isLikelyCloudOrEmulatorAndroid;
    const isTestEnvironment = __DEV__ || process.env.IS_TESTING === 'true' || isCloudTest;
    
    const androidDebugToken = process.env.FIREBASE_APPCHECK_DEBUG_TOKEN_ANDROID;
    const iosDebugToken     = process.env.FIREBASE_APPCHECK_DEBUG_TOKEN_IOS;

    const provider = appCheck().newReactNativeFirebaseAppCheckProvider();

    provider.configure({
      android: {
        provider: isTestEnvironment ? 'debug' : 'playIntegrity',
        ...(isTestEnvironment && androidDebugToken ? { debugToken: androidDebugToken } : {}),
      },
      apple: {
        provider: isTestEnvironment ? 'debug' : 'appAttestWithDeviceCheckFallback',
        ...(isTestEnvironment && iosDebugToken ? { debugToken: iosDebugToken } : {}),
      },
    });

    await appCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    if (__DEV__) console.log('[AppCheck] Initialized successfully (Env:', isTestEnvironment ? 'Test/Debug' : 'Prod', ')');
  } catch (error: any) {
    if (__DEV__) console.error('[AppCheck] Initialization failed:', error.message);
    // Record to Crashlytics so real-device App Check / Play Integrity failures are
    // observable in production. These correlate with Android phone-auth being blocked
    // (auth/app-not-authorized, auth/missing-client-identifier). Best-effort: App Check
    // must never block auth, so swallow if Crashlytics isn't available.
    try {
      const crashlytics = require('@react-native-firebase/crashlytics').default;
      crashlytics().log(`[AppCheck] init failed on ${Platform.OS}: ${error?.code ?? ''} ${error?.message ?? ''}`);
      if (error instanceof Error) crashlytics().recordError(error);
    } catch {
      /* Crashlytics unavailable — non-fatal */
    }
  }
};

export default initializeAppCheck;
