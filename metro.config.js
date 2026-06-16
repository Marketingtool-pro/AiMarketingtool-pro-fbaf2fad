// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-google-mobile-ads is a native-only module (AdMob). At runtime it's
// lazy-required and Platform-guarded to Android, but Metro still statically bundles
// every require() target — which breaks the WEB export with:
//   Importing native-only module "react-native/Libraries/Utilities/codegenNativeComponent"
//   from node_modules/react-native-google-mobile-ads/.../GoogleMobileAdsBannerViewNativeComponent.ts
// Resolve it to an empty module when bundling for web (native builds are unaffected).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-google-mobile-ads') {
    return { type: 'empty' };
  }
  const resolver = defaultResolveRequest || context.resolveRequest;
  return resolver(context, moduleName, platform);
};

module.exports = config;
