/**
 * fatalGuard — keeps an unhandled JS exception from killing the app in release.
 *
 * Every TestFlight crash in the 550–554 series shows the same fatal chain:
 * unhandled JS exception → RCTExceptionsManager.reportFatal → RCTFatal, which
 * terminates the process (on Mac Catalyst via NSApplication _crashOnException,
 * on iPhone/Android via the RN fatal path). The .ips files never contain the
 * originating JS message, so the root error has been invisible.
 *
 * In release builds this handler (1) records the REAL error to Crashlytics so
 * it is finally visible with message + JS stack, and (2) does NOT forward to
 * RN's default handler, so the session survives (worst case: a broken screen
 * instead of a dead app). Dev builds keep the default RedBox behavior.
 */
import crashlytics from '@react-native-firebase/crashlytics';

type GlobalWithErrorUtils = typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
    setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  };
};

const errorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;

if (!__DEV__ && errorUtils?.setGlobalHandler) {
  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const err = error instanceof Error ? error : new Error(String(error));
    try {
      crashlytics().log(`[fatalGuard] isFatal=${String(isFatal)} ${err.message}`);
      crashlytics().recordError(err, 'UnhandledJSException');
    } catch {}
    console.warn('[fatalGuard] Unhandled JS exception (recorded, suppressed):', err.message);
  });
}

export {};
