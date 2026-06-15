// Web mock for AdsService to prevent Metro from parsing react-native-google-mobile-ads

export const adUnit = {
  banner: '',
  interstitial: '',
  rewarded: '',
  native: '',
};

export const adRequestOptions = () => ({ requestNonPersonalizedAdsOnly: true });

export async function initAds(): Promise<void> {
  // No-op on web
}

export async function showInterstitial(): Promise<boolean> {
  return false;
}

export async function showRewarded(): Promise<{ amount: number; type: string } | null> {
  return null;
}
