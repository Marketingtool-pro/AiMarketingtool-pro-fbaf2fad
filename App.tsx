import React, { useEffect, useState, useCallback } from 'react';
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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize App Check
        await initializeAppCheck();

        // Initialize Crashlytics — auto-capture crashes to Firebase
        try {
          await crashlytics().setCrashlyticsCollectionEnabled(true);
          crashlytics().log('App started');
        } catch (e) {
          console.warn('Crashlytics init error:', e);
        }

        // Initialize Firebase Analytics — track events to Firebase dashboard
        try {
          await analytics().setAnalyticsCollectionEnabled(true);
          await analytics().logAppOpen();
        } catch (e) {
          console.warn('Analytics init error:', e);
        }

        // Initialize FCM — request push permission + get token
        try {
          const authStatus = await messaging().requestPermission();
          if (authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
              authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
            const token = await messaging().getToken();
            if (__DEV__) console.log('[FCM] Token:', token?.substring(0, 20) + '...');
            // Foreground message handler
            messaging().onMessage(async (msg) => {
              if (__DEV__) console.log('[FCM] Foreground:', msg.notification?.title);
            });
          }
        } catch (e) {
          console.warn('FCM init error:', e);
        }

        // Initialize Matomo early but don't block
        matomo.init().catch(e => console.warn('Matomo init error', e));

        // Pre-load fonts
        await Font.loadAsync({
          ...Feather.font,
        });

        // Check authentication state with hard timeout
        await Promise.race([
          checkAuth(),
          new Promise(resolve => setTimeout(resolve, 4000)),
        ]);
      } catch (e) {
        console.warn('Error loading app resources:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
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
      <SafeAreaProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="light" translucent={true} />
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
