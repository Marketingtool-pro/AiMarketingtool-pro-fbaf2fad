const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Nuclear option: Delete NitroIap.podspec so CocoaPods cannot find or install it.
 * This prevents react-native-iap from compiling on iOS entirely.
 * iOS payments use Stripe fallback (billingService.ts).
 * Android IAP works normally (podspec is iOS only).
 */
module.exports = function withIosExcludeIap(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      // 1. Delete the podspec so autolinking can't find it
      const projectRoot = config.modRequest.projectRoot;
      const podspecPath = path.join(projectRoot, 'node_modules', 'react-native-iap', 'NitroIap.podspec');
      if (fs.existsSync(podspecPath)) {
        fs.renameSync(podspecPath, podspecPath + '.disabled');
        console.log('[withIosExcludeIap] Disabled NitroIap.podspec for iOS build');
      }

      // 2. Also remove from Podfile if somehow still referenced
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf8');
        contents = contents.replace(/^\s*pod\s+['"]NitroIap['"].*$/gm, '  # NitroIap disabled for iOS');
        contents = contents.replace(/^\s*pod\s+['"]RNIap['"].*$/gm, '  # RNIap disabled for iOS');
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
