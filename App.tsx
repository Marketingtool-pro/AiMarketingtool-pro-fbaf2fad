import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import appCheck from '@react-native-firebase/app-check';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { Colors } from './src/constants/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize App Check for security (needed for enforced Phone OTP)
const initializeAppCheck = async () => {
  try {
    const rnAppCheck = appCheck();
    
    // Create the provider
    const provider = rnAppCheck.newReactNativeFirebaseAppCheckProvider();
    
    // Configure the provider with platform-specific options
    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
      },
    });

    await rnAppCheck.initializeAppCheck({
      provider: provider,
      isTokenAutoRefreshEnabled: true,
    });
    
    if (__DEV__) console.log('[AppCheck] Activated successfully');
  } catch (error) {
    if (__DEV__) console.error('[AppCheck] Activation error:', error);
  }
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize App Check before other auth checks
        await initializeAppCheck();

        // Pre-load fonts
        await Font.loadAsync({
          ...Feather.font,
        });

        // Check authentication state
        await checkAuth();

        // Artificial delay for splash screen (optional)
        await new Promise(resolve => setTimeout(resolve, 1000));
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
