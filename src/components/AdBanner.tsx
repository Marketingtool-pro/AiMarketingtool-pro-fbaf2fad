import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { adUnit, adRequestOptions } from '../services/adsService';

/**
 * AdMob anchored adaptive banner — Android only (returns null on iOS/web, where
 * the native ads module is intentionally not linked). Drop <AdBanner /> anywhere
 * you want a banner; it sizes itself to the screen width.
 */
export default function AdBanner() {
  if (Platform.OS !== 'android') return null;

  // Lazy require so iOS/web never touch the native module.
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={adUnit.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={adRequestOptions()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: '100%' },
});
