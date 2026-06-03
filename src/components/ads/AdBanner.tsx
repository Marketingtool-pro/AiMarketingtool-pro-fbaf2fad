import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  BannerAd,
  GAMBannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { AdUnits, AdProvider } from '../../config/ads';

interface AdBannerProps {
  /** Which Google product serves this banner. Defaults to AdMob. */
  provider?: AdProvider;
  /** Banner size (AdMob path). Defaults to an adaptive anchored banner. */
  size?: BannerAdSize;
}

/**
 * Drop-in banner ad. Renders an AdMob <BannerAd> or an Ad Manager
 * <GAMBannerAd> depending on `provider`. Collapses to nothing if the ad fails
 * to load, so it never leaves an empty gap in the layout.
 *
 *   <AdBanner provider="admob" />
 *   <AdBanner provider="gam" />
 */
export default function AdBanner({
  provider = 'admob',
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
}: AdBannerProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const unitId = AdUnits[provider].banner;

  return (
    <View style={styles.container}>
      {provider === 'gam' ? (
        <GAMBannerAd
          unitId={unitId}
          sizes={[BannerAdSize.ANCHORED_ADAPTIVE_BANNER]}
          onAdFailedToLoad={() => setFailed(true)}
        />
      ) : (
        <BannerAd
          unitId={unitId}
          size={size}
          onAdFailedToLoad={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
