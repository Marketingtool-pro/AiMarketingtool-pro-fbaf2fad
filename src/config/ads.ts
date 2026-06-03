import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Ad configuration — single source of truth for every ad identifier.
 *
 * This app uses BOTH of Google's ad products, which are distinct services that
 * happen to share one SDK (`react-native-google-mobile-ads`):
 *
 *   • AdMob  — self-serve monetization. Unit IDs look like
 *              `ca-app-pub-2789940907288323/XXXXXXXXXX`.
 *   • Ad Manager (GAM) — Google's publisher ad server. Unit IDs look like
 *              `/NETWORK_CODE/your-ad-unit`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  GOING LIVE
 * ───────────────────────────────────────────────────────────────────────────
 *  1. App ID lives in app.json → plugins → "react-native-google-mobile-ads"
 *     → androidAppId. It currently holds Google's TEST App ID so the app
 *     builds and runs immediately. Replace it with your real AdMob App ID
 *     `ca-app-pub-2789940907288323~XXXXXXXXXX`, then run a native build.
 *  2. Fill in PROD_ADMOB and PROD_GAM unit IDs below.
 *
 *  In __DEV__ we ALWAYS serve Google's official test ads — tapping a real ad in
 *  development can get the account flagged for invalid traffic.
 */

export type AdProvider = 'admob' | 'gam';

/** AdMob production unit IDs (publisher pub-2789940907288323). */
const PROD_ADMOB = {
  // TODO: replace with real AdMob unit IDs
  banner: 'ca-app-pub-2789940907288323/0000000000',
  interstitial: 'ca-app-pub-2789940907288323/0000000001',
} as const;

/** Google Ad Manager production unit IDs (format: /NETWORK_CODE/unit-name). */
const PROD_GAM = {
  // TODO: replace with real Ad Manager unit IDs
  banner: '/0000000/marketingtool-banner',
  interstitial: '/0000000/marketingtool-interstitial',
} as const;

/** Resolved unit IDs per provider. Test IDs in dev, real IDs in production. */
export const AdUnits = {
  admob: {
    banner: __DEV__ ? TestIds.ADAPTIVE_BANNER : PROD_ADMOB.banner,
    interstitial: __DEV__ ? TestIds.INTERSTITIAL : PROD_ADMOB.interstitial,
  },
  gam: {
    banner: __DEV__ ? TestIds.GAM_BANNER : PROD_GAM.banner,
    interstitial: __DEV__ ? TestIds.GAM_INTERSTITIAL : PROD_GAM.interstitial,
  },
} as const;
