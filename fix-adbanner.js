const fs = require('fs');
let code = fs.readFileSync('src/components/AdBanner.tsx', 'utf8');

code = code.replace(
  '  const { BannerAd, BannerAdSize } = require(\'react-native-google-mobile-ads\');',
  `  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');`
);

fs.writeFileSync('src/components/AdBanner.tsx', code);
