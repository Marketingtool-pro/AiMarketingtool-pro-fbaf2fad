/**
 * Firebase Remote Config — single source of truth for tunable runtime params.
 *
 * Defaults mirror /assets/firebase/remote_config_defaults.xml so the app works
 * even on the very first launch before fetchAndActivate() succeeds. Update both
 * files together when adding a new key.
 *
 * Why JS-only (no Expo plugin entry): @react-native-firebase/remote-config 24
 * doesn't ship app.plugin.js, so adding it to app.json plugins[] would break
 * prebuild. setDefaults() from JS achieves the same effect.
 */
import { Platform } from 'react-native';

const DEFAULTS = {
  gemini_model: 'gemini-3.1-flash-lite-preview',
} as const;

type Key = keyof typeof DEFAULTS;

let initialized = false;
let initPromise: Promise<void> | null = null;

function getRC(): any | null {
  try {
    return require('@react-native-firebase/remote-config').default;
  } catch (e) {
    if (__DEV__) console.warn('[RemoteConfig] native module unavailable:', e);
    return null;
  }
}

async function doInit(): Promise<void> {
  const rc = getRC();
  if (!rc) return;
  try {
    const instance = rc();
    await instance.setDefaults(DEFAULTS);
    // Min interval 1h in prod, 0 in dev so config changes show up immediately.
    await instance.setConfigSettings({
      minimumFetchIntervalMillis: __DEV__ ? 0 : 3600_000,
      fetchTimeMillis: 60_000,
    });
    await instance.fetchAndActivate();
    initialized = true;
    if (__DEV__) console.log('[RemoteConfig] activated, platform=' + Platform.OS);
  } catch (e: any) {
    if (__DEV__) console.warn('[RemoteConfig] init failed:', e?.message || e);
  }
}

/** Call once during app startup (deferred init, after first paint). */
export function initRemoteConfig(): Promise<void> {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

/** Read a string value. Returns the local default if remote hasn't fetched. */
export function getString<K extends Key>(key: K): string {
  const rc = getRC();
  if (rc && initialized) {
    try {
      const v = rc().getValue(key).asString();
      if (v) return v;
    } catch {/* fall through */}
  }
  return DEFAULTS[key];
}
