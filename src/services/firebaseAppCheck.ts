import { Platform } from 'react-native';
import appCheck from '@react-native-firebase/app-check';
import Constants from 'expo-constants';

/**
 * Initializes Firebase App Check with reCAPTCHA Enterprise.
 * This proves the app's identity to Google/Firebase and helps avoid "Spam" labels on OTPs.
 */
export const initializeAppCheck = async () => {
  try {
    const firebaseConfig = Constants.expoConfig?.extra?.firebase;
    if (!firebaseConfig) {
      if (__DEV__) console.log('[AppCheck] No configuration found in app.json');
      return;
    }

    const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
    
    // Configure the provider with your Site Keys from the terminal output
    provider.configure({
      android: {
        provider: 'playIntegrity',
      },
      apple: {
        provider: 'deviceCheck',
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
