// fatalGuard must be the FIRST import: it replaces RN's global JS exception
// handler before any other module can throw, so an unhandled error is recorded
// to Crashlytics instead of killing the app (the 550-554 logout/teardown crash).
import { markAppMounted } from './src/utils/fatalGuard';
import React, { useEffect, useState, useCallback } from 'react';
// expo-status-bar removed: it routes through deprecated APIs on Android 15
// (StatusBarModule -> Window.setStatusBarColor). react-native-edge-to-edge's
// <SystemBars /> replaces it cleanly on both platforms.
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SystemBars } from 'react-native-edge-to-edge';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { initNotificationHistory } from './src/services/notificationHistory';
import * as Linking from 'expo-linking';
import { useAuthStore } from './src/store/authStore';
import { completeOAuthFromUrl, restoreSession } from './src/services/appwrite';
import { Colors } from './src/constants/theme';
import { matomo } from './src/services/matomo';
import { initializeAppCheck } from './src/services/firebaseAppCheck';
// Firebase Performance removed: RNFBPerf with useFrameworks:static crashes iOS
// on cold start, and the Android deferred-init workaround doesn't cover iOS.
// Perf is non-essential monitoring — dropped to ship a stable IAP build.
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';
import messaging from '@react-native-firebase/messaging';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { initRemoteConfig } from './src/services/firebaseRemoteConfig';
import { initAds } from './src/services/adsService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { checkAuth } = useAuthStore();

  // Finish an OAuth login that arrived as a deep link.
  //
  // On Android the callback can COLD START the app -- the user sees the splash
  // screen and no session, because the browser-session promise died with the
  // previous process and nothing else ever read the userId/secret out of the
  // URL. Before this, the app registered no link handling of any kind.
  //
  // getInitialURL covers the cold start; the 'url' listener covers the case
  // where the process survived and the link is delivered to it. Both funnel into
  // completeOAuthFromUrl, which ignores anything that is not an OAuth callback.
  useEffect(() => {
    let active = true;

    const handleUrl = async (url: string | null) => {
      const signedIn = await completeOAuthFromUrl(url);
      if (signedIn && active) await checkAuth();
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [checkAuth]);

  useEffect(() => {
    // Persist received notifications so the Notifications screen has a real
    // history (Notification Center alone forgets dismissed items).
    initNotificationHistory();
    async function prepare() {
      try {
        // Run fonts and auth in parallel, each with its own timeout.
        // Cap prevents slow auth/network/permission from gating the splash.
        const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> => {
          const timeoutPromise: Promise<undefined> = new Promise(resolve =>
            setTimeout(() => resolve(undefined), ms)
          );
          return Promise.race([p, timeoutPromise]);
        };

        // Request ATT permission on iOS — TIMEOUT-GUARDED. This await was the
        // only one in the splash-critical path without a timeout; if it never
        // resolved, appIsReady stayed false and the app sat on the splash screen
        // forever (the "opens to splash and hangs" symptom on real iPhones).
        if (Platform.OS === 'ios') {
          await withTimeout(TrackingTransparency.requestTrackingPermissionsAsync(), 2500);
        }

        // App Check must be ready BEFORE the user reaches the login screen.
        // Firebase Phone Auth on iOS uses the App Check token to verify the
        // device — without it, Auth falls back to reCAPTCHA Enterprise SDK
        // which isn't linked. Capping at 2s so a slow attestation call
        // doesn't block the splash forever.
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
            // Meme caption faces. Previously MemeGeneratorScreen picked SYSTEM
            // fonts per platform (Impact/Arial/Comic Sans/Times on iOS vs
            // sans-serif-condensed/sans-serif/casual/serif on Android), so the
            // same meme rendered in different typefaces with different metrics
            // depending on the device. Bundling them means one rendering
            // everywhere. All SIL OFL 1.1.
            'Anton-Regular': require('./assets/fonts/Anton-Regular.ttf'),
            'Arimo-Bold': require('./assets/fonts/Arimo-Bold.ttf'),
            'ComicNeue-Bold': require('./assets/fonts/ComicNeue-Bold.ttf'),
            'Tinos-Bold': require('./assets/fonts/Tinos-Bold.ttf'),
          }), 3000),
          // Re-attach the stored session BEFORE checkAuth, or checkAuth runs as
          // an anonymous request. The Appwrite RN SDK persists nothing itself
          // (its only storage path is window.localStorage, which does not exist
          // here), so without this the session is lost on every cold start --
          // and on Android the OAuth callback cold-starts the app every time.
          withTimeout(restoreSession().then(() => checkAuth()), 2500),
          withTimeout(initializeAppCheck(), 2000),
        ]);
      } catch (e) {
        console.warn('Error loading app resources:', e);
      } finally {
        setAppIsReady(true);
        // Non-critical inits run AFTER UI is ready — prevents ANR on cold start
        // Set timeout ensures React completes the layout and SplashScreen.hideAsync() runs first
        setTimeout(() => deferredInit(), 500);
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

      // Firebase auto-init is OFF in AndroidManifest (see
      // withFirebaseDeferredInit.js). On low-end devices in markets with
      // bad networks (India: Infinix, realme, vivo) the FID registration
      // network call hangs and FCM's blockingGetToken loop ANRs the app
      // (Play Console trace: thread "TAG" parked in CountDownLatch.await
      // > Tasks.await > FirebaseMessaging). Re-enabling here happens AFTER
      // onLayoutRootView, so the user-visible startup completes BEFORE
      // Firebase reaches for the network.
      messaging().setAutoInitEnabled(true)
        .catch(e => console.warn('Messaging auto-init enable error:', e));

      crashlytics().setCrashlyticsCollectionEnabled(true)
        .then(() => crashlytics().log('App started'))
        .catch(e => console.warn('Crashlytics init error:', e));

      analytics().setAnalyticsCollectionEnabled(true)
        .then(() => analytics().logAppOpen())
        .catch(e => console.warn('Analytics init error:', e));

      messaging().requestPermission()
        .then(async (authStatus) => {
          if (!mounted) return;
          if (authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
              authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
            const token = await messaging().getToken();
            if (!mounted) return;
            if (__DEV__) console.log('[FCM] Token:', token?.substring(0, 20) + '...');
            unsubscribeFcm = messaging().onMessage(async (msg) => {
              if (__DEV__) console.log('[FCM] Foreground:', msg.notification?.title);
            });
          }
        })
        .catch(e => console.warn('FCM init error:', e));

      matomo.init().catch(e => console.warn('Matomo init error', e));

      // Remote Config — deferred so it doesn't block first paint. Falls back
      // to baked-in defaults if fetch fails (see firebaseRemoteConfig.ts).
      initRemoteConfig().catch(e => console.warn('RemoteConfig init error', e));

      // AdMob / Ad Manager — Android only (excluded from iOS). Deferred so the
      // SDK init network call never gates the splash / cold start.
      initAds().catch(e => console.warn('Ads init error', e));
    }

    prepare();

    return () => {
      mounted = false;
      unsubscribeFcm?.();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // The UI has laid out, so from here on a JS fatal costs a broken screen
      // rather than a dead app — fatalGuard switches to suppressing. Before
      // this point it forwards fatals through, so a startup failure is a
      // reported crash instead of a silent forever-splash.
      markAppMounted();
      // This tells the splash screen to hide immediately
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
