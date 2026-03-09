const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * INLINED BUILD PLUGINS
 */

const withIosFirebaseSwiftFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const appDelegatePath = path.join(config.modRequest.platformProjectRoot, config.modRequest.projectName, 'AppDelegate.swift');
      if (!fs.existsSync(appDelegatePath)) return config;
      let content = fs.readFileSync(appDelegatePath, 'utf8');
      if (!content.includes('import Firebase')) content = 'import Firebase\n' + content;
      if (content.includes('func application(_ application: UIApplication, didFinishLaunchingWithOptions')) {
        if (!content.includes('FirebaseApp.configure()')) {
          content = content.replace(/func application\(_ application: UIApplication, didFinishLaunchingWithOptions[\s\S]*?\{/, (match) => `${match}\n    FirebaseApp.configure()`);
        }
      }
      fs.writeFileSync(appDelegatePath, content);
      return config;
    },
  ]);
};

const withEasPodfileFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;
      let contents = fs.readFileSync(podfilePath, 'utf8');
      const snippet = `
    # Force modular header compatibility for RNFB
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'YES'
        end
      end
    end`;
      if (contents.includes('post_install do |installer|')) {
        if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
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
    [withEasPodfileFix],
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
          "minSdkVersion": 24,
          "packagingOptions": {
            "pickFirsts": [
              "**/LICENSE",
              "**/picasa.ini"
            ]
          }
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
