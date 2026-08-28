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

    // Never guess a dialling code. The picker ships 222 countries and always
    // prepends the selected code, so a number arriving without '+' means the
    // country was lost upstream. The old `+91` fallback silently routed every
    // such number to India, so a non-Indian user's OTP went to a wrong number
    // and they simply never received a code. authStore guards this too; this is
    // the second line of defence for any other caller.
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (!phoneNumber.trim().startsWith('+')) {
      return {
        success: false,
        error: 'Please select your country code and re-enter your number.',
      };
    }
    const normalizedPhone = `+${cleaned}`;

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

    // App Check on identitytoolkit.googleapis.com is UNENFORCED. Read live from
    // the App Check services API on 2026-08-28:
    //
    //   name:            projects/911925145433/services/identitytoolkit.googleapis.com
    //   enforcementMode: UNENFORCED
    //   updateTime:      2026-08-25T03:40:56.296719Z
    //
    // This block previously asserted the opposite ("App Check is ENFORCED") and
    // told every user hitting auth/unknown to reinstall from Google Play. Since
    // 2026-08-25 that advice has been wrong: App Check is not rejecting anything,
    // so reinstalling changes nothing and sends people down a dead end.
    //
    // The "API key expired. Please renew the API key." text the SDK wraps is
    // still not about the key — that key has no expireTime, no deleteTime,
    // allows identitytoolkit, and carries no Android package restriction. With
    // App Check off, an auth/unknown here is Android app verification failing
    // (Play Integrity attestation, or the reCAPTCHA fallback), not App Check and
    // not the key. Say that, and do not send the user to reinstall.
    const raw = `${error.code ?? ''} ${error.message ?? ''}`;
    if (
      error.code === 'auth/unknown' ||
      /app check/i.test(raw) ||
      /api key expired/i.test(raw)
    ) {
      return {
        success: false,
        error:
          'This device could not be verified for phone sign-in. Make sure Google Play services is up to date and you have a working connection, then try again.',
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

    if (error.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid OTP code. Please try again.' };
    }
    if (error.code === 'auth/session-expired') {
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }

    // Same masquerade as in sendPhoneOTP — see the note there. App Check on
    // identitytoolkit is UNENFORCED (read live 2026-08-28, unchanged since
    // 2026-08-25T03:40:56Z), so this arrives from device verification failing
    // during the credential exchange, not from App Check and not from the key.
    const rawVerify = `${error.code ?? ''} ${error.message ?? ''}`;
    if (
      error.code === 'auth/unknown' ||
      /app check/i.test(rawVerify) ||
      /api key expired/i.test(rawVerify)
    ) {
      return {
        success: false,
        error:
          'This device could not be verified for phone sign-in. Make sure Google Play services is up to date and you have a working connection, then try again.',
      };
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
