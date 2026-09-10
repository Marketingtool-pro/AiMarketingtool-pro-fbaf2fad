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

    // initializeAppCheck() resolving proves only that the provider was CONFIGURED.
    // It does not prove the provider can actually mint a token, and on Android
    // those are different outcomes with the same silent surface:
    //
    //   preview  builds set IS_TESTING=true (eas.json) -> provider 'debug'
    //   production builds do NOT set it            -> provider 'playIntegrity'
    //
    // That one env var is the ONLY difference between the sideloaded APK where
    // OTP works (1034, preview) and every build shipped to Play where it does
    // not. Until now nothing recorded which branch ran or whether it produced a
    // token, so a production failure looked identical to a production success
    // and 26 OTP builds were shipped without that answer.
    //
    // getToken(true) forces a fresh attestation instead of returning a cached
    // token, so this reports the CURRENT device verdict. Best-effort by design:
    // App Check is UNENFORCED on identitytoolkit for this project (verified
    // 2026-09-10), so a failure here must never block sign-in -- it is recorded
    // and swallowed.
    const providerName =
      Platform.OS === 'android'
        ? (isTestEnvironment ? 'debug' : 'playIntegrity')
        : (isTestEnvironment ? 'debug' : 'appAttestWithDeviceCheckFallback');
    try {
      const result = await appCheck().getToken(true);
      const ok = !!result?.token;
      if (__DEV__) console.log(`[AppCheck] token probe via ${providerName}:`, ok ? 'OK' : 'EMPTY');
      try {
        const crashlytics = require('@react-native-firebase/crashlytics').default;
        crashlytics().setAttributes({
          appcheck_provider: providerName,
          appcheck_token: ok ? 'ok' : 'empty',
        });
        if (!ok) {
          crashlytics().recordError(
            new Error(`[AppCheck] ${providerName} returned no token on ${Platform.OS}`)
          );
        }
      } catch {
        /* Crashlytics unavailable — non-fatal */
      }
    } catch (probeError: any) {
      // This is the line that names the real cause on a Play-installed build:
      // a Play Integrity failure arrives here with its own code/message.
      if (__DEV__) console.warn('[AppCheck] token probe failed:', probeError?.message);
      try {
        const crashlytics = require('@react-native-firebase/crashlytics').default;
        crashlytics().setAttributes({
          appcheck_provider: providerName,
          appcheck_token: 'error',
          appcheck_error_code: String(probeError?.code ?? 'none'),
        });
        crashlytics().recordError(
          new Error(
            `[AppCheck] ${providerName} token failed [${probeError?.code ?? 'no-code'}] ` +
            `${String(probeError?.message ?? '')}`
          )
        );
      } catch {
        /* Crashlytics unavailable — non-fatal */
      }
    }
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
