import React, { useEffect, useState, useCallback } from 'react';
import '@tamagui/native/setup-zeego';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { Colors } from './src/constants/theme';
import { matomo } from './src/services/matomo';
import { initializeAppCheck } from './src/services/firebaseAppCheck';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';
import messaging from '@react-native-firebase/messaging';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Request ATT permission on iOS
        if (Platform.OS === 'ios') {
          await TrackingTransparency.requestTrackingPermissionsAsync();
        }

        // Run fonts and auth in parallel, each with its own timeout.
...
        // Cap at 1.5s to prevent slow auth/network from gating the splash.
        const withTimeout = <T,>(p: Promise<T>, ms: number) =>
          Promise.race([p, new Promise(resolve => setTimeout(resolve, ms))]);

        await Promise.all([
          withTimeout(Font.loadAsync({ ...Feather.font }), 1500),
          withTimeout(checkAuth(), 1500),
        ]);
      } catch (e) {
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
      // App Check initialization (moved from prepare to prevent blocking UI thread)
      initializeAppCheck().catch(e => console.warn('AppCheck init error:', e));

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
      <StripeProvider
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'}
        merchantIdentifier="merchant.pro.marketingtool.app"
      >
        <SafeAreaProvider>
          <View style={styles.container} onLayout={onLayoutRootView}>
            <StatusBar style="light" />
            <AppNavigator />
          </View>
        </SafeAreaProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
