import { Platform } from 'react-native';

/**
 * AdMob + Google Ad Manager integration — ANDROID ONLY.
 *
 * The native module (react-native-google-mobile-ads) is excluded from the iOS
 * build in react-native.config.js, because the iOS app is in App Review and must
 * not change. So every access here is lazy-required and Platform-guarded — iOS
 * never loads the native bindings.
 *
 * TODO(admob): swap Google's official TEST ids for the real ones from
 * https://apps.admob.com before a production release:
 *   • App ID   → `androidAppId` in app.json  (ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX)
 *   • Ad units → the getters below           (ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX)
 * Until then the app serves Google's sanctioned TEST ads (no policy risk; no revenue).
 */
const ANDROID = Platform.OS === 'android';

let _mod: any = null;
const lib = (): any => {
  if (!ANDROID) return null;
  if (!_mod) _mod = require('react-native-google-mobile-ads');
  return _mod;
};

// Real unit ids go here. While they are the Google TEST ids the SDK serves test
// ads; replace the right-hand strings with your apps.admob.com ad unit ids.
const REAL = {
  banner: '',        // e.g. 'ca-app-pub-XXXX/XXXX'
  interstitial: '',
  rewarded: '',
};

export const adUnit = {
  get banner() { const m = lib(); if (!m) return ''; return (!__DEV__ && REAL.banner) || m.TestIds.BANNER; },
  get interstitial() { const m = lib(); if (!m) return ''; return (!__DEV__ && REAL.interstitial) || m.TestIds.INTERSTITIAL; },
  get rewarded() { const m = lib(); if (!m) return ''; return (!__DEV__ && REAL.rewarded) || m.TestIds.REWARDED; },
};

let initialized = false;

/** Initialize the Mobile Ads SDK. Safe to call repeatedly; no-op on iOS. */
export async function initAds(): Promise<void> {
  const m = lib();
  if (!m || initialized) return;
  try {
    await m.default().setRequestConfiguration({
      maxAdContentRating: m.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await m.default().initialize();
    initialized = true;
  } catch (e) {
    console.warn('[Ads] init error', e);
  }
}

/** Load + show an interstitial. Resolves true when shown & closed. No-op on iOS. */
export async function showInterstitial(): Promise<boolean> {
  const m = lib();
  if (!m) return false;
  try {
    const ad = m.InterstitialAd.createForAdRequest(adUnit.interstitial, { requestNonPersonalizedAdsOnly: true });
    return await new Promise<boolean>((resolve) => {
      const offLoad = ad.addAdEventListener(m.AdEventType.LOADED, () => ad.show());
      const offClose = ad.addAdEventListener(m.AdEventType.CLOSED, () => { offLoad(); offClose(); offErr(); resolve(true); });
      const offErr = ad.addAdEventListener(m.AdEventType.ERROR, () => { offLoad(); offClose(); offErr(); resolve(false); });
      ad.load();
    });
  } catch (e) {
    console.warn('[Ads] interstitial error', e);
    return false;
  }
}

/** Load + show a rewarded ad. Resolves the reward (or null). No-op on iOS. */
export async function showRewarded(): Promise<{ amount: number; type: string } | null> {
  const m = lib();
  if (!m) return null;
  try {
    const ad = m.RewardedAd.createForAdRequest(adUnit.rewarded, { requestNonPersonalizedAdsOnly: true });
    return await new Promise((resolve) => {
      let reward: { amount: number; type: string } | null = null;
      const offLoad = ad.addAdEventListener(m.RewardedAdEventType.LOADED, () => ad.show());
      const offReward = ad.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, (r: any) => { reward = r; });
      const offClose = ad.addAdEventListener(m.AdEventType.CLOSED, () => { offLoad(); offReward(); offClose(); offErr(); resolve(reward); });
      const offErr = ad.addAdEventListener(m.AdEventType.ERROR, () => { offLoad(); offReward(); offClose(); offErr(); resolve(null); });
      ad.load();
    });
  } catch (e) {
    console.warn('[Ads] rewarded error', e);
    return null;
  }
}
