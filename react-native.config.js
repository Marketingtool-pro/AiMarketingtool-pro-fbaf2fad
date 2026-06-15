module.exports = {
  dependencies: {
    // react-native-iap v15 (Nitro) is now autolinked normally on BOTH platforms.
    // The previous `ios: null` exclusion (SDK 55 era) is REMOVED — it was what
    // kept the NitroIap pod out of the iOS build entirely, causing
    // "Nitro runtime not installed yet" on every build for weeks.
    // Static-framework compatibility is handled by expo-build-properties
    // forceStaticLinking: ["NitroIap"] + the NitroIap build-settings patch in
    // plugins/withEasPodfileFix.js.

    // AdMob / Ad Manager is ANDROID-ONLY by request. Excluding it from iOS
    // autolinking keeps the Google-Mobile-Ads SDK out of the iOS binary entirely
    // (the iOS app is in App Review and must not change). All JS usage is
    // Platform-guarded + lazy-required (see src/services/adsService.ts) so iOS
    // never touches the native bindings. To enable iOS later: remove this line,
    // add `iosAppId` to the app.json plugin, and rebuild iOS.
    'react-native-google-mobile-ads': { platforms: { ios: null } },
  },
};
