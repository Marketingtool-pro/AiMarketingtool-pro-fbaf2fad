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
import ErrorBoundary from './src/components/ErrorBoundary';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from './tamagui.config';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts with extreme safety
        try {
          await Font.loadAsync({
            ...Feather.font,
            'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
            'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
            'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
            'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
          });
        } catch (fontError) {
          console.log('[App] Font loading failed, using system fallbacks...', fontError);
        }

        // Check authentication state - with a safety timeout
        try {
          await Promise.race([
            checkAuth(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 3000))
          ]);
        } catch (authError) {
          console.log('[App] Auth check timed out or failed, proceeding to app...');
        }

        // Final safety delay
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn('Error loading app resources:', e);
      } finally {
        setAppIsReady(true);
        // Force hide splash screen as a backup if onLayout doesn't fire immediately
        setTimeout(async () => {
          try {
            await SplashScreen.hideAsync();
          } catch (e) {}
        }, 100);
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
    <ErrorBoundary>
      <TamaguiProvider config={tamaguiConfig}>
        <GestureHandlerRootView style={styles.container}>
          <SafeAreaProvider>
            <View style={styles.container} onLayout={onLayoutRootView}>
              <StatusBar style="light" translucent={true} />
              <AppNavigator />
            </View>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </TamaguiProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
