import React, { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
// expo-image (Glide-backed on Android) downsamples and caches remote images.
// Play Console flags plain RN <Image> network loads under "bitmap image
// optimization" — excessive memory from manual download + full-size decode.
import { Image } from 'expo-image';
import { adUnit, adRequestOptions } from '../services/adsService';

/**
 * AdMob "Native Advanced" ad — Android only (returns null on iOS/web, where the
 * ads module isn't linked). Renders inside a <NativeAdView> with the AdMob-required
 * "Ad" attribution badge. Drop <NativeAdCard /> anywhere; it returns null until an
 * ad loads, so it never leaves an empty box.
 *
 * Policy notes (https://developers.google.com/admob/android/native):
 *  - The "Ad" badge is mandatory and always visible.
 *  - Headline + at least one other asset are registered via <NativeAsset>.
 */
export default function NativeAdCard() {
  if (Platform.OS !== 'android') return null;
  return <AndroidNativeAdCard />;
}

function AndroidNativeAdCard() {

  // Lazy require so iOS/web never touch the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
  } = require('react-native-google-mobile-ads');

  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    let current: any;
    let cancelled = false;
    NativeAd.createForAdRequest(adUnit.native, adRequestOptions())
      .then((loaded: any) => {
        if (cancelled) { loaded?.destroy?.(); return; }
        current = loaded;
        setAd(loaded);
      })
      .catch((e: any) => console.warn('[Ads] native load failed', e?.message));
    return () => {
      cancelled = true;
      current?.destroy?.();
    };
  }, []);

  if (!ad) return null;

  return (
    <NativeAdView nativeAd={ad} style={styles.card}>
      <View style={styles.headerRow}>
        {ad.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: ad.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : null}
        <View style={styles.headlineCol}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>{ad.headline}</Text>
          </NativeAsset>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>Ad</Text>
          </View>
        </View>
      </View>

      {ad.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={styles.body} numberOfLines={2}>{ad.body}</Text>
        </NativeAsset>
      ) : null}

      <NativeMediaView style={styles.media} resizeMode="cover" />

      {ad.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{ad.callToAction}</Text>
          </View>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161824',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 8 },
  headlineCol: { flex: 1 },
  headline: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  adBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 3,
  },
  adBadgeText: { color: '#000', fontSize: 9, fontWeight: '900' },
  body: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 10 },
  media: { width: '100%', height: 160, borderRadius: 12, marginTop: 12, backgroundColor: '#0D0F1C' },
  cta: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
