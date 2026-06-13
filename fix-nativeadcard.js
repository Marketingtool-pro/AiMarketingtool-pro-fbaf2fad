const fs = require('fs');
let code = fs.readFileSync('src/components/NativeAdCard.tsx', 'utf8');

code = code.replace(
  'export default function NativeAdCard() {\n  if (Platform.OS !== \'android\') return null;',
  `export default function NativeAdCard() {
  if (Platform.OS !== 'android') return null;
  return <AndroidNativeAdCard />;
}

function AndroidNativeAdCard() {`
);

code = code.replace(
  '  const {\n    NativeAd,\n    NativeAdView,\n    NativeAsset,\n    NativeAssetType,\n    NativeMediaView,\n  } = require(\'react-native-google-mobile-ads\');',
  `  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
  } = require('react-native-google-mobile-ads');`
);

fs.writeFileSync('src/components/NativeAdCard.tsx', code);
