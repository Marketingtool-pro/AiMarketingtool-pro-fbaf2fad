// Firebase Phone Auth Service - Safe lazy loading
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { isE164 } from '../utils/phone';

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
export function reportOTPFailure(stage: string, error: any) {
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

/**
 * Wait until the app is genuinely foregrounded, so Android has a live Activity.
 *
 * THIS IS THE ANDROID EQUIVALENT OF ensureAPNsRegistered() ABOVE.
 *
 * iOS phone auth works because the app guarantees its own verification channel:
 * it fetches an APNs token, so Firebase verifies by silent push and needs
 * neither a browser nor an Activity. Android had no such guarantee, and its
 * send goes through a native path that requires one:
 *
 *   @react-native-firebase/auth 24.1.1 -- the version the EAS build log for
 *   1047 confirms is installed -- ReactNativeFirebaseAuthModule.java:1624
 *
 *     if (activity != null) {
 *       PhoneAuthProvider.getInstance(firebaseAuth)
 *           .verifyPhoneNumber(phoneNumber, timeout, SECONDS, activity, callbacks);
 *     }
 *
 * No else. React Native's getCurrentActivity() returns null whenever the host
 * Activity is paused or being recreated, and when it does this method returns
 * having done nothing: no SMS, no callback, no error, no telemetry.
 *
 * That window is not hypothetical here. The Crashlytics breadcrumbs from
 * 2026-09-03 show RecaptchaActivity taking the foreground and MainActivity
 * coming back three times in about thirty seconds. A send or a resend landing
 * inside one of those transitions hits line 1624 and dies silently -- which is
 * why those exports carry oauthGoogle, oauthFacebook, oauthApple and emailLogin
 * non-fatals from the same sessions and not a single OTP entry.
 *
 * Resolves true once AppState is 'active'. Gives up after `timeoutMs` rather
 * than blocking sign-in forever; the caller still attempts the send, because a
 * missed guarantee must not become a second silent stop in front of Firebase.
 */
async function waitForForeground(timeoutMs = 4000): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (AppState.currentState === 'active') return true;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub.remove();
      resolve(value);
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') finish(true);
    });
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
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

    // Callers must pass E.164 (see src/utils/phone.ts normalizePhone). This
    // layer deliberately does NOT re-derive the number: it used to default
    // anything without a '+' to +91, which mislabelled every other country and
    // mangled Indian numbers written with a trunk 0 (09876543210).
    const normalizedPhone = phoneNumber;
    if (!isE164(normalizedPhone)) {
      // Report, do NOT reject. Returning here is a silent stop that never
      // reaches Firebase, so no real error is ever recorded and OTP just dies.
      // Let Firebase judge the number: auth/invalid-phone-number is a real,
      // reported, actionable error, whereas this guard was only ever a guess.
      if (__DEV__) console.warn('[FirebaseAuth] Number is not E.164:', normalizedPhone);
      reportOTPFailure('notE164', {
        code: 'local/not-e164',
        message: `len=${normalizedPhone?.length ?? 0}`,
      });
    }

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

    // Android only: make sure a live Activity exists before calling the native
    // module. See waitForForeground() for why this is the counterpart to the
    // APNs registration iOS does above, and for the exact native line involved.
    const foreground = await waitForForeground();
    if (!foreground) {
      // Report, never block. A hard stop here would be exactly the silent
      // pre-Firebase return this whole change exists to remove; the send is
      // still attempted and Firebase gets to judge it.
      reportOTPFailure('notForeground', {
        code: 'local/not-foreground',
        message: `appState=${AppState.currentState}`,
      });
    }

    // signInWithPhoneNumber can hang FOREVER on Android. This is not defensive
    // programming, it is a specific defect in the version this app ships.
    //
    // @react-native-firebase/auth 24.1.1 (confirmed as the installed version in
    // the EAS build log for 1047), ReactNativeFirebaseAuthModule.java:1624:
    //
    //     if (activity != null) {
    //       PhoneAuthProvider.getInstance(firebaseAuth)
    //           .verifyPhoneNumber(phoneNumber, timeout, SECONDS, activity, callbacks);
    //     }
    //
    // There is no `else`. When getCurrentActivity() returns null the native
    // module returns having done nothing at all: Firebase is never called, no
    // callback fires, the promise never settles, and the catch below -- which is
    // the ONLY thing that calls reportOTPFailure -- never runs. The failure is
    // therefore invisible in Crashlytics, which matches the exports from
    // 2026-09-03: they contain oauthGoogle, oauthFacebook, oauthApple and
    // emailLogin non-fatals from the same sessions, and not one OTP entry.
    //
    // getCurrentActivity() returns null while the host Activity is paused or
    // being recreated. The same Crashlytics breadcrumbs show RecaptchaActivity
    // taking the foreground and MainActivity returning three times in ~30s, so
    // that window is real on this device and a resend landing inside it hits
    // line 1624 and dies silently.
    //
    // 45s is deliberately longer than the SDK's own 30s auto-retrieval timeout,
    // so a slow-but-working send is never cut short; only a send that never
    // started can reach it.
    const OTP_SEND_TIMEOUT_MS = 45_000;
    const confirmation: any = await Promise.race([
      firebaseAuth().signInWithPhoneNumber(normalizedPhone),
      new Promise((_resolve, reject) =>
        setTimeout(
          () =>
            reject(
              Object.assign(new Error('OTP request did not start on this device.'), {
                code: 'local/send-timeout',
              })
            ),
          OTP_SEND_TIMEOUT_MS
        )
      ),
    ]);
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

    // The native module returned without starting the request (see the
    // OTP_SEND_TIMEOUT_MS comment above). Nothing was sent, so a retry is the
    // correct advice -- the next attempt usually lands with a live Activity.
    // reportOTPFailure has already run by this point, so unlike before this
    // failure is now visible in Crashlytics as [local/send-timeout].
    if (error.code === 'local/send-timeout') {
      return {
        success: false,
        error:
          'The OTP request did not start. Tap Resend, and if it keeps failing use ' +
          'Sign in with Email.',
      };
    }
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
