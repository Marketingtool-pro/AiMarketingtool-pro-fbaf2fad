import React, { useEffect, useState, useCallback } from 'react';
// expo-status-bar removed: it routes through deprecated APIs on Android 15
// (StatusBarModule -> Window.setStatusBarColor). react-native-edge-to-edge's
// <SystemBars /> replaces it cleanly on both platforms.
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SystemBars } from 'react-native-edge-to-edge';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { initNotificationHistory } from './src/services/notificationHistory';
import { useAuthStore } from './src/store/authStore';
import { Colors } from './src/constants/theme';
import { matomo } from './src/services/matomo';
import { initializeAppCheck } from './src/services/firebaseAppCheck';
// Firebase Performance removed: RNFBPerf with useFrameworks:static crashes iOS
// on cold start, and the Android deferred-init workaround doesn't cover iOS.
// Perf is non-essential monitoring — dropped to ship a stable IAP build.
import * as TrackingTransparency from 'expo-tracking-transparency';
import { initRemoteConfig } from './src/services/firebaseRemoteConfig';
import { initAds } from './src/services/adsService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Persist received notifications so the Notifications screen has a real
    // history (Notification Center alone forgets dismissed items).
    initNotificationHistory();
    async function prepare() {
      try {
        // Request ATT permission on iOS
        if (Platform.OS === 'ios') {
          await TrackingTransparency.requestTrackingPermissionsAsync();
        }

        // Run fonts and auth in parallel, each with its own timeout.
        // Cap at 1.5s to prevent slow auth/network from gating the splash.
        const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> => {
          const timeoutPromise: Promise<undefined> = new Promise(resolve =>
            setTimeout(() => resolve(undefined), ms)
          );
          return Promise.race([p, timeoutPromise]);
        };

        // Start App Check in the background so the splash screen isn't blocked by
        // Play Integrity / App Attest startup. The OTP flow now waits for a short
        // readiness window before sending SMS, which makes Android sign-in more reliable.
        void initializeAppCheck().catch((e: unknown) => console.warn('App Check init warning:', e));

        await Promise.all([
          // Load the bundled Poppins family the theme references (theme.ts FontFamily).
          // Previously only Feather icons were loaded, so every `fontFamily: 'Poppins-*'`
          // silently fell back to the platform system font — San Francisco on iOS,
          // Roboto on Android — which is why Android didn't match the iOS design on
          // every screen. Loading these makes typography identical on both platforms.
          withTimeout(Font.loadAsync({
            ...Feather.font,
            'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
            'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
            'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
            'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
          }), 3000),
          withTimeout(checkAuth(), 1500),
        ]);
      } catch (e: unknown) {
        console.warn('Error loading app resources:', e);
      } finally {
        setAppIsReady(true);
        // Non-critical inits run AFTER UI is ready — prevents ANR on cold start
        deferredInit();
      }
    }

    // Guard against listener registration after unmount. `deferredInit` is
    // fire-and-forget, so `messaging().requestPermission()` can still be
    // pending when the cleanup runs; without this flag we'd register an
    // onMessage listener with no way to unsubscribe it — classic leak on
    // fast remount (login → logout → login).
    let mounted = true;
    let unsubscribeFcm: (() => void) | undefined;

    async function deferredInit() {
      // Note: App Check init moved to prepare() above so the token is ready
      // when the user reaches the login screen. Don't call it again here.

      let firebaseModules: any = null;
      try {
        firebaseModules = {
          crashlytics: require('@react-native-firebase/crashlytics').default,
          analytics: require('@react-native-firebase/analytics').default,
          messaging: require('@react-native-firebase/messaging').default,
        };
      } catch (e: unknown) {
        console.warn('Firebase deferred init modules unavailable:', e);
      }

      if (!firebaseModules) {
        matomo.init().catch((e: unknown) => console.warn('Matomo init error', e));
        initRemoteConfig().catch((e: unknown) => console.warn('RemoteConfig init error', e));
        initAds().catch((e: unknown) => console.warn('Ads init error', e));
        return;
      }

      const { crashlytics, analytics, messaging } = firebaseModules;

      // Firebase auto-init is OFF in AndroidManifest (see
      // withFirebaseDeferredInit.js). On low-end devices in markets with
      // bad networks (India: Infinix, realme, vivo) the FID registration
      // network call hangs and FCM's blockingGetToken loop ANRs the app
      // (Play Console trace: thread "TAG" parked in CountDownLatch.await
      // > Tasks.await > FirebaseMessaging). Re-enabling here happens AFTER
      // onLayoutRootView, so the user-visible startup completes BEFORE
      // Firebase reaches for the network.
      messaging().setAutoInitEnabled(true)
        .catch((e: unknown) => console.warn('Messaging auto-init enable error:', e));

      crashlytics().setCrashlyticsCollectionEnabled(true)
        .then(() => crashlytics().log('App started'))
        .catch((e: unknown) => console.warn('Crashlytics init error:', e));

      analytics().setAnalyticsCollectionEnabled(true)
        .then(() => analytics().logAppOpen())
        .catch((e: unknown) => console.warn('Analytics init error:', e));

      messaging().requestPermission()
        .then(async (authStatus: number) => {
          if (!mounted) return;
          if (authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
              authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
            const token = await messaging().getToken();
            if (!mounted) return;
            if (__DEV__) console.log('[FCM] Token:', token?.substring(0, 20) + '...');
            unsubscribeFcm = messaging().onMessage(async (msg: any) => {
              if (__DEV__) console.log('[FCM] Foreground:', msg.notification?.title);
            });
          }
        })
        .catch((e: unknown) => console.warn('FCM init error:', e));

      matomo.init().catch((e: unknown) => console.warn('Matomo init error', e));

      // Remote Config — deferred so it doesn't block first paint. Falls back
      // to baked-in defaults if fetch fails (see firebaseRemoteConfig.ts).
      initRemoteConfig().catch((e: unknown) => console.warn('RemoteConfig init error', e));

      // AdMob / Ad Manager — Android only (excluded from iOS). Deferred so the
      // SDK init network call never gates the splash / cold start.
      initAds().catch((e: unknown) => console.warn('Ads init error', e));
    }

    prepare();

    return () => {
      mounted = false;
      unsubscribeFcm?.();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <KeyboardProvider>
      <SafeAreaProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          {/* SystemBars (from react-native-edge-to-edge) replaces both
              expo-status-bar and expo-navigation-bar. It uses the modern
              WindowInsetsControllerCompat path on Android 15 — no
              deprecated Window.setStatusBarColor / setNavigationBarColor
              calls. Same light icons on dark background on both platforms. */}
          <SystemBars style="light" />
          <AppNavigator />
        </View>
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
