// Firebase Phone Auth Service - Safe lazy loading
let auth: any = null;

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

let verificationId: string | null = null;

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

    if (__DEV__) console.log('[FirebaseAuth] Sending OTP to:', normalizedPhone);

    const confirmation = await firebaseAuth().signInWithPhoneNumber(normalizedPhone);
    verificationId = confirmation.verificationId;

    if (__DEV__) console.log('[FirebaseAuth] OTP sent successfully');
    return { success: true };
  } catch (error: any) {
    if (__DEV__) console.error('[FirebaseAuth] Send OTP error:', error);

    if (error.code === 'auth/invalid-phone-number') {
      return { success: false, error: 'Invalid phone number format' };
    }
    if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many attempts. Please try again later.' };
    }
    if (error.code === 'auth/quota-exceeded') {
      return { success: false, error: 'SMS quota exceeded. Please try again later.' };
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
    if (!firebaseAuth || !verificationId) {
      return { success: false, error: 'No pending verification. Please request OTP first.' };
    }

    if (__DEV__) console.log('[FirebaseAuth] Verifying OTP...');

    const credential = firebaseAuth.PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await firebaseAuth().signInWithCredential(credential);

    if (__DEV__) console.log('[FirebaseAuth] OTP verified successfully');
    verificationId = null;

    return { success: true, user: userCredential.user };
  } catch (error: any) {
    if (__DEV__) console.error('[FirebaseAuth] Verify OTP error:', error);

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
};
