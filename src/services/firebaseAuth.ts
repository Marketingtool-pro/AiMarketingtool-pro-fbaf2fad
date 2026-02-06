// Firebase Phone Auth Service (uses MSG91 via Firebase Extension)
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Store verification ID for OTP verification
let verificationId: string | null = null;

// Firebase Phone Auth Configuration
const FIREBASE_CONFIG = {
  // Firebase project: marketingtool-e4930
  // Phone auth enabled with MSG91 extension
  testPhoneNumber: '+919999999999',
  testCode: '123456',
};

/**
 * Send OTP to phone number via Firebase (MSG91)
 */
export async function sendPhoneOTP(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize phone number to E.164 format
    const normalizedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber.replace(/\D/g, '')}`;

    console.log('[FirebaseAuth] Sending OTP to:', normalizedPhone);

    // Request OTP via Firebase Phone Auth
    const confirmation = await auth().signInWithPhoneNumber(normalizedPhone);

    // Store verification ID for later
    verificationId = confirmation.verificationId;

    console.log('[FirebaseAuth] OTP sent successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[FirebaseAuth] Send OTP error:', error);

    // Handle specific Firebase errors
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

/**
 * Verify OTP code and sign in
 */
export async function verifyPhoneOTP(code: string): Promise<{
  success: boolean;
  user?: FirebaseAuthTypes.User;
  error?: string
}> {
  try {
    if (!verificationId) {
      return { success: false, error: 'No pending verification. Please request OTP first.' };
    }

    console.log('[FirebaseAuth] Verifying OTP...');

    // Create credential with verification ID and code
    const credential = auth.PhoneAuthProvider.credential(verificationId, code);

    // Sign in with credential
    const userCredential = await auth().signInWithCredential(credential);

    console.log('[FirebaseAuth] OTP verified successfully');

    // Clear verification ID
    verificationId = null;

    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('[FirebaseAuth] Verify OTP error:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid OTP code. Please try again.' };
    }
    if (error.code === 'auth/session-expired') {
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }

    return { success: false, error: error.message || 'Invalid OTP' };
  }
}

/**
 * Get current Firebase user
 */
export function getCurrentFirebaseUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}

/**
 * Sign out from Firebase
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await auth().signOut();
    verificationId = null;
  } catch (error) {
    console.error('[FirebaseAuth] Sign out error:', error);
  }
}

/**
 * Listen to Firebase auth state changes
 */
export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void
): () => void {
  return auth().onAuthStateChanged(callback);
}

export default {
  sendPhoneOTP,
  verifyPhoneOTP,
  getCurrentFirebaseUser,
  signOutFirebase,
  onAuthStateChanged,
};
