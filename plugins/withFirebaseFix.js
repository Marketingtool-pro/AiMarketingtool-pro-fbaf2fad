const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * STATIC FRAMEWORK FIREBASE FIX (v16)
 * Specifically for Expo 55 + RN 0.83.2.
 * Resolves the "must be imported from module" error by forcing modular headers.
 */
module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Force the modular headers for Firebase
      const snippet = `
    # Force modular headers for React Native Firebase compatibility
    pod 'RNFBApp', :path => '../node_modules/@react-native-firebase/app', :modular_headers => true
    pod 'RNFBAuth', :path => '../node_modules/@react-native-firebase/auth', :modular_headers => true
    pod 'RNFBAppCheck', :path => '../node_modules/@react-native-firebase/app-check', :modular_headers => true

    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          bc.build_settings['DEFINES_MODULE'] = 'YES'
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
        end
      end
    end`;

      if (contents.includes('post_install do |installer|')) {
        if (!contents.includes('modular_headers')) {
          contents = contents.replace(
            'post_install do |installer|',
            'post_install do |installer|\n' + snippet
          );
        }
      } else {
        contents += `\npost_install do |installer|\n${snippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
