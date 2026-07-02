import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

let appCheckInitPromise: Promise<void> | null = null;
let appCheckReady = false;
let appCheckModule: any = null;

function getAppCheckModule(): any | null {
  if (appCheckModule) return appCheckModule;
  try {
    appCheckModule = require('@react-native-firebase/app-check').default;
  } catch (error) {
    if (__DEV__) console.warn('[AppCheck] Native module unavailable:', error);
    return null;
  }
  return appCheckModule;
}

/**
 * Initializes Firebase App Check.
 *
 * Provider selection:
 *  - __DEV__ / Cloud Test (Firebase Test Lab): debug provider
 *  - Production Android: Play Integrity
 *  - iOS: App Attest (with DeviceCheck fallback)
 */
export const initializeAppCheck = async (force = false): Promise<void> => {
  if (!force && appCheckReady) return;
  if (!force && appCheckInitPromise) return appCheckInitPromise;

  appCheckInitPromise = (async () => {
    try {
      const firebaseConfig = Constants.expoConfig?.extra?.firebase;
      if (!firebaseConfig) {
        if (__DEV__) console.log('[AppCheck] No configuration found in app.json');
        appCheckReady = true;
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
      const iosDebugToken = process.env.FIREBASE_APPCHECK_DEBUG_TOKEN_IOS;

      const appCheckApi = getAppCheckModule();
      if (!appCheckApi) {
       appCheckReady = true;
       return;
      }

      const provider = appCheckApi().newReactNativeFirebaseAppCheckProvider();

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

      await appCheckApi().initializeAppCheck({
       provider,
       isTokenAutoRefreshEnabled: true,
      });

      appCheckReady = true;
      if (__DEV__) console.log('[AppCheck] Initialized successfully (Env:', isTestEnvironment ? 'Test/Debug' : 'Prod', ')');
    } catch (error: any) {
      appCheckReady = false;
      if (__DEV__) console.error('[AppCheck] Initialization failed:', error.message);
      throw error;
    }
  })();

  try {
    await appCheckInitPromise;
  } catch (error) {
    appCheckInitPromise = null;
    throw error;
  }
};

export const ensureAppCheckReady = async (timeoutMs = 8000): Promise<boolean> => {
  if (appCheckReady) return true;

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    try {
      await initializeAppCheck(attempt === 0);
      return true;
    } catch (error: any) {
      attempt += 1;
      if (Date.now() >= deadline) {
        if (__DEV__) console.warn('[AppCheck] Not ready before OTP send:', error?.message || error);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return false;
};

export default initializeAppCheck;
