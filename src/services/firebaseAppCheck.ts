import { Platform } from 'react-native';
import appCheck from '@react-native-firebase/app-check';
import Constants from 'expo-constants';

/**
 * Initializes Firebase App Check.
 *
 * Provider selection:
 *  - __DEV__ / IS_TESTING (Firebase Test Lab, emulators): debug provider
 *    → Register tokens in Firebase Console → App Check → your app → Manage debug tokens.
 *    Set FIREBASE_APPCHECK_DEBUG_TOKEN_ANDROID / _IOS in your CI/test environment.
 *  - Production Android: Play Integrity
 *  - iOS: App Attest (with DeviceCheck fallback for pre-iOS-14 devices)
 *
 * NOTE: FCM token retrieval always fails on virtual Test Lab devices (no
 * signed-in Google account). This is expected noise — not fixable on
 * virtual devices. Use a real-device matrix for FCM coverage.
 */
export const initializeAppCheck = async () => {
  try {
    const firebaseConfig = Constants.expoConfig?.extra?.firebase;
    if (!firebaseConfig) {
      if (__DEV__) console.log('[AppCheck] No configuration found in app.json');
      return;
    }

    const isTestEnvironment = __DEV__ || process.env.IS_TESTING === 'true';
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

    if (__DEV__) console.log('[AppCheck] Initialized successfully');
  } catch (error: any) {
    if (__DEV__) console.error('[AppCheck] Initialization failed:', error.message);
  }
};

export default initializeAppCheck;
