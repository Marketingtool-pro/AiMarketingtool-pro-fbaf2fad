module.exports = {
  dependencies: {
    // react-native-iap v15 (Nitro) is now autolinked normally on BOTH platforms.
    // The previous `ios: null` exclusion (SDK 55 era) is REMOVED — it was what
    // kept the NitroIap pod out of the iOS build entirely, causing
    // "Nitro runtime not installed yet" on every build for weeks.
    // Static-framework compatibility is handled by expo-build-properties
    // forceStaticLinking: ["NitroIap"] + the NitroIap build-settings patch in
    // plugins/withEasPodfileFix.js.
  },
};
