const fs = require('fs');
const path = require('path');

const withIosFirebaseSwiftFix = (config) => {
  const { withDangerousMod } = require('@expo/config-plugins');
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;
      let contents = fs.readFileSync(podfilePath, 'utf8');
      const snippet = `
    # Force Objective-C for Firebase compatibility
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
          bc.build_settings['DEFINES_MODULE'] = 'YES'
          bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end`;
      if (contents.includes('post_install do |installer|')) {
        if (!contents.includes('CLANG_ENABLE_MODULES')) {
          contents = contents.replace('post_install do |installer|', 'post_install do |installer|\n' + snippet);
        }
      } else {
        contents += `\npost_install do |installer|\n${snippet}\nend\n`;
      }
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [withIosFirebaseSwiftFix],
    [
      "expo-build-properties",
      {
        "ios": {
          "useFrameworks": "dynamic",
          "deploymentTarget": "16.0"
        },
        "android": {
          "compileSdkVersion": 35,
          "targetSdkVersion": 35,
          "minSdkVersion": 24
        }
      }
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "expo-secure-store",
    "expo-font",
    "expo-sharing",
    "expo-web-browser",
    "expo-asset"
  ]
});
