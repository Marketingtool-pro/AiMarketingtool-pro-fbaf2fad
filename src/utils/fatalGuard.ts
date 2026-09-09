/**
 * fatalGuard — keeps an unhandled JS exception from killing a RUNNING session,
 * without hiding one that happens before the app ever starts.
 *
 * Original problem (550–554 series): an unhandled JS exception went
 * RCTExceptionsManager.reportFatal → RCTFatal and terminated the process, and
 * the .ips files never contained the JS message, so the root error was
 * invisible. Suppressing the default handler fixed that.
 *
 * But blanket suppression created a worse failure. versionCode 1003 shipped
 * with react 19.2.7 against react-native-renderer 19.2.3. React threw
 * "Incompatible React versions" on the very first render, this handler
 * swallowed it, and the app sat on the native splash screen forever — alive,
 * silent, and reported to Play Vitals as nothing at all, because a suppressed
 * error is not a crash. A one-line version mismatch looked like a hang with no
 * evidence anywhere.
 *
 * So the rule now depends on WHEN the error lands:
 *
 *   before the UI mounts  -> record, then forward to RN's default handler.
 *     The app cannot function anyway; a visible crash that reaches Crashlytics
 *     AND Play Vitals is strictly better than an infinite splash screen.
 *
 *   after the UI mounts   -> record and suppress, as before. A late error
 *     costs you a broken screen, not a dead app, and that trade still holds.
 *
 * App.tsx calls markAppMounted() once the root view has laid out.
 * Dev builds keep the default RedBox behavior throughout.
 */
import crashlytics from '@react-native-firebase/crashlytics';

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

type GlobalWithErrorUtils = typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler?: () => GlobalErrorHandler;
    setGlobalHandler: (handler: GlobalErrorHandler) => void;
  };
};

const errorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;

let appMounted = false;

/**
 * Called by App.tsx from onLayoutRootView. Until this fires, a fatal is treated
 * as a startup failure and allowed through to RN's handler so it is actually
 * reported instead of silently stranding the user on the splash screen.
 */
export function markAppMounted(): void {
  appMounted = true;
}

if (!__DEV__ && errorUtils?.setGlobalHandler) {
  const defaultHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const phase = appMounted ? 'runtime' : 'startup';

    try {
      crashlytics().log(`[fatalGuard] phase=${phase} isFatal=${String(isFatal)} ${err.message}`);
      crashlytics().recordError(err, 'UnhandledJSException');
    } catch {}

    if (!appMounted && defaultHandler) {
      // Startup failure: let it through. Better a reported crash than a
      // permanent splash screen that nothing anywhere records.
      console.error('[fatalGuard] Fatal before app mounted — forwarding:', err.message);
      defaultHandler(error, isFatal);
      return;
    }

    console.warn('[fatalGuard] Unhandled JS exception (recorded, suppressed):', err.message);
  });
}
