// Firebase Phone Auth Service - Safe lazy loading
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

let auth: any = null;
let apnsRegistered = false;

function getAuth() {
  if (!auth) {
    try {
      auth = require('@react-native-firebase/auth').default;
    } catch (e) {
      console.warn('[FirebaseAuth] Native module not available:', e);
      return null;
    }
  }
  return auth;
}

// Register for push notifications so iOS gets an APNs token.
// Firebase Auth SDK auto-swizzles the AppDelegate to pick up the APNs token,
// then uses silent push for phone verification instead of reCAPTCHA web view.
async function ensureAPNsRegistered() {
  if (apnsRegistered || Platform.OS !== 'ios') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (__DEV__) console.log('[FirebaseAuth] Notification permission:', status);
    // Getting the device push token triggers APNs registration
    const token = await Notifications.getDevicePushTokenAsync();
    if (__DEV__) console.log('[FirebaseAuth] APNs token registered:', !!token);
    apnsRegistered = true;
  } catch (e) {
    if (__DEV__) console.warn('[FirebaseAuth] APNs registration failed:', e);
  }
}

// Send the real Firebase error to Crashlytics as a non-fatal.
//
// Why this exists: on 2026-08-30 an Android device running a build that already
// contained the auth/unknown branch below still reported "API key expired".
// The key was then checked directly and is NOT expired -- the key baked into
// the shipped 1028 bundle is byte-identical to the one in google-services.json,
// and that key answers identitytoolkit with HTTP 200, with no Android app
// restrictions (a request carrying a bogus package and cert is still accepted).
// So the message the user sees is not explained by the key, and no amount of
// reasoning from this side narrowed it further without the device's own error.
//
// Only the phone reports the truth. Codes and messages here are Firebase's, and
// contain no credential -- the phone number is deliberately NOT recorded.
function reportOTPFailure(stage: string, error: any) {
  try {
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    const c = crashlytics();
    c.setAttributes({
      otp_stage: stage,
      otp_error_code: String(error?.code || 'none'),
      otp_platform: Platform.OS,
    });
    c.recordError(
      new Error(`OTP ${stage} [${error?.code || 'no-code'}] ${String(error?.message || '')}`)
    );
  } catch {
    // Crashlytics unavailable (dev client, native module missing) -- never let
    // diagnostics break the sign-in path.
  }
}

let verificationId: string | null = null;

// Track OTP attempts per phone number to prevent hitting Firebase rate limits
const otpAttempts: Record<string, { count: number; firstAttempt: number }> = {};
const MAX_OTP_ATTEMPTS = 3;
const OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(phone: string): string | null {
  const now = Date.now();
  const record = otpAttempts[phone];
  if (record) {
    // Reset window if expired
    if (now - record.firstAttempt > OTP_WINDOW_MS) {
      otpAttempts[phone] = { count: 1, firstAttempt: now };
      return null;
    }
    if (record.count >= MAX_OTP_ATTEMPTS) {
      const remainingMin = Math.ceil((OTP_WINDOW_MS - (now - record.firstAttempt)) / 60000);
      return `Too many OTP requests. Please wait ${remainingMin} minutes before trying again.`;
    }
    record.count++;
  } else {
    otpAttempts[phone] = { count: 1, firstAttempt: now };
  }
  return null;
}

export async function sendPhoneOTP(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      return { success: false, error: 'Firebase Auth not available on this platform' };
    }

    const cleaned = phoneNumber.replace(/\D/g, '');
    const normalizedPhone = phoneNumber.startsWith('+')
      ? `+${cleaned}`
      : `+91${cleaned}`;

    // Check app-side rate limit before hitting Firebase
    const rateLimitError = checkRateLimit(normalizedPhone);
    if (rateLimitError) {
      return { success: false, error: rateLimitError };
    }

    if (__DEV__) console.log('[FirebaseAuth] Sending OTP to:', normalizedPhone);

    // Ensure APNs token is registered so Firebase uses silent push (no reCAPTCHA).
    // BUT don't let it block the OTP send: the permission prompt + push-token
    // round-trip can take seconds, which made OTP feel slow. Bound it to ~2.5s,
    // then send anyway (Firebase falls back to reCAPTCHA if the token isn't ready).
    await Promise.race([
      ensureAPNsRegistered(),
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ]);

    const confirmation = await firebaseAuth().signInWithPhoneNumber(normalizedPhone);
    verificationId = confirmation.verificationId;
    // Persist verificationId so it survives app restart from reCAPTCHA
    if (verificationId) {
      await SecureStore.setItemAsync('firebaseVerificationId', verificationId);
    }

    if (__DEV__) console.log('[FirebaseAuth] OTP sent successfully');
    return { success: true };
  } catch (error: any) {
    if (__DEV__) console.error('[FirebaseAuth] Send OTP error:', error);
    reportOTPFailure('sendPhoneOTP', error);

    if (error.code === 'auth/invalid-phone-number') {
      return { success: false, error: 'Invalid phone number format' };
    }
    if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many attempts. Number temporarily blocked by Firebase (1-4 hours). Try a different number or wait.' };
    }
    if (error.code === 'auth/quota-exceeded') {
      return { success: false, error: 'SMS quota exceeded. Please try again later.' };
    }
    // Android App Check / Play Integrity failures (the classic Android-only OTP block):
    // app verification couldn't complete, so Firebase refuses to send the SMS.
    if (error.code === 'auth/missing-client-identifier') {
      return { success: false, error: 'This device could not be verified. Update Google Play services and try again.' };
    }
    if (error.code === 'auth/app-not-authorized') {
      return { success: false, error: 'This app is not authorized for phone sign-in on Android. Please update the app or contact support.' };
    }
    if (error.code === 'auth/internal-error') {
      return { success: false, error: 'Verification service temporarily blocked this request. Please try again shortly.' };
    }

    // auth/unknown wrapping "API key expired" / "API key not valid".
    //
    // The Android Firebase API key was recreated on 2026-07-14 (commit
    // feecaf5aa6) and google-services.json was updated in the same change, so
    // versionCode >= 1000 ships the current key. Any build produced BEFORE that
    // still carries the previous key, and Google reports a superseded key as
    // expired -- surfaced here as auth/unknown, which had no branch and so fell
    // through to the raw SDK text:
    //
    //   [auth/unknown] An internal error has occurred.
    //   [ API key expired. Please renew the API key. ]
    //
    // CORRECTION (2026-08-30): the paragraph above is only half true, and the
    // half that is false was shown to a real user. A device running a build that
    // ALREADY contained this branch still hit it, so "your build carries the old
    // key" cannot be the whole story:
    //
    //   shipped 1028 google_api_key  ==  repo google-services.json key (identical)
    //   that key -> identitytoolkit /v1/recaptchaParams  HTTP 200
    //   same key with a bogus X-Android-Package + X-Android-Cert  HTTP 200
    //     (so the key carries no Android application restriction either)
    //
    // A pre-2026-07-14 install genuinely does carry a superseded key and for
    // those the advice below is correct, so the branch stays. But it must not
    // promise that updating is guaranteed to fix it, because for at least one
    // current build it did not. reportOTPFailure() above now sends the real
    // code and message to Crashlytics so the next occurrence is diagnosable
    // instead of guessed at.
    const raw = String(error.message || '');
    if (error.code === 'auth/unknown' && /API key (expired|not valid)/i.test(raw)) {
      return {
        success: false,
        error:
          'Phone sign-in could not be completed on this device. Please update ' +
          'MarketingTool from the Play Store and try again — if it still fails, ' +
          'contact support so we can look at your device specifically.',
      };
    }

    return { success: false, error: error.message || 'Failed to send OTP' };
  }
}

export async function verifyPhoneOTP(code: string): Promise<{
  success: boolean;
  user?: any;
  error?: string
}> {
  try {
    const firebaseAuth = getAuth();
    // Restore verificationId from SecureStore if lost (app restart from reCAPTCHA)
    if (!verificationId) {
      verificationId = await SecureStore.getItemAsync('firebaseVerificationId');
    }
    if (!firebaseAuth || !verificationId) {
      return { success: false, error: 'No pending verification. Please request OTP first.' };
    }

    if (__DEV__) console.log('[FirebaseAuth] Verifying OTP...');

    const credential = firebaseAuth.PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await firebaseAuth().signInWithCredential(credential);

    if (__DEV__) console.log('[FirebaseAuth] OTP verified successfully');
    verificationId = null;
    await SecureStore.deleteItemAsync('firebaseVerificationId');

    return { success: true, user: userCredential.user };
  } catch (error: any) {
    if (__DEV__) console.error('[FirebaseAuth] Verify OTP error:', error);
    reportOTPFailure('verifyOTP', error);

    if (error.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid OTP code. Please try again.' };
    }
    if (error.code === 'auth/session-expired') {
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }

    return { success: false, error: error.message || 'Invalid OTP' };
  }
}

export function getCurrentFirebaseUser(): any | null {
  const firebaseAuth = getAuth();
  return firebaseAuth ? firebaseAuth().currentUser : null;
}

export async function signOutFirebase(): Promise<void> {
  try {
    const firebaseAuth = getAuth();
    if (firebaseAuth) await firebaseAuth().signOut();
    verificationId = null;
  } catch (error) {
    if (__DEV__) console.error('[FirebaseAuth] Sign out error:', error);
  }
}

// Drops in-memory + persisted verificationId so the next sendPhoneOTP
// always starts fresh. Call when user changes phone, country, or aborts.
export async function clearVerification(): Promise<void> {
  verificationId = null;
  try { await SecureStore.deleteItemAsync('firebaseVerificationId'); } catch {}
}

export function onAuthStateChanged(
  callback: (user: any | null) => void
): () => void {
  const firebaseAuth = getAuth();
  if (!firebaseAuth) return () => {};
  return firebaseAuth().onAuthStateChanged(callback);
}

export default {
  sendPhoneOTP,
  verifyPhoneOTP,
  getCurrentFirebaseUser,
  signOutFirebase,
  onAuthStateChanged,
  clearVerification,
};
