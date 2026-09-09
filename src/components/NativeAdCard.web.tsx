/**
 * Web stub for <NativeAdCard />.
 *
 * NativeAdCard.tsx pulls in react-native-google-mobile-ads. Even though that
 * require() is lazy and guarded by Platform.OS !== 'android', Metro still
 * follows it statically when bundling, and the package imports
 * react-native/Libraries/Utilities/codegenNativeComponent - a React Native
 * internal that cannot be bundled for web. That is what broke
 * `expo export --platform web`, and with it every Firebase App Hosting
 * rollout (the backend still says "Waiting on your first release").
 *
 * Metro resolves `.web.tsx` ahead of `.tsx` for the web platform, so this file
 * keeps the AdMob native module out of the web graph entirely. Same convention
 * already used by src/services/adsService.web.ts.
 *
 * AdMob has no web SDK, so rendering nothing is the correct behaviour here.
 */
export default function NativeAdCard() {
  return null;
}
