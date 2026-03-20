/**
 * Firebase App Check — disabled on iOS (native module incompatible with Xcode 26).
 * Android still uses Play Integrity via the Appwrite function.
 * This is a no-op stub so App.tsx doesn't crash.
 */
export const initializeAppCheck = async () => {
  if (__DEV__) console.log('[AppCheck] Skipped — not available in this build');
};

export default initializeAppCheck;
