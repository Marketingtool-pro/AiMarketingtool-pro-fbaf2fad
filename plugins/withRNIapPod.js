const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withRNIapPod(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes("pod 'RNIap'")) {
        contents = contents.replace(
          /use_expo_modules!/,
          `use_expo_modules!
  pod 'RNIap', :path => File.join(__dir__, '..', 'node_modules', 'react-native-iap')`
        );
        fs.writeFileSync(podfilePath, contents);
        console.log('[withRNIapPod] Added RNIap pod to Podfile');
      }

      return config;
    },
  ]);
};
