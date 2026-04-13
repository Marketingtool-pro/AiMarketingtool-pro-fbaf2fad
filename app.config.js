const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');

/**
 * INLINED BUILD PLUGINS for Xcode 16.1+ compatibility
 * Handles: Firebase Swift fix, Podfile concurrency/module fix, Xcode project settings
 */

// 1. Firebase Swift AppDelegate Fix
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

// 2. Podfile fix — modular headers + concurrency suppression
const withEasPodfileFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;
      let contents = fs.readFileSync(podfilePath, 'utf8');

      // Force modular headers for Firebase pods
      if (!contents.includes("pod 'FirebaseCore', :modular_headers => true")) {
        contents = contents.replace(
          /use_expo_modules!/,
          `use_expo_modules!
  pod 'Firebase', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseAuth', :modular_headers => true
  pod 'FirebaseAppCheck', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true`
        );
      }

      const snippet = `
    # Suppress Swift concurrency + C warnings for ALL pod targets
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        bc.build_settings['DEFINES_MODULE'] = 'YES'
        bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        bc.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        # expo-modules-core requires Swift 6.0 (uses @MainActor protocol conformance syntax)
        bc.build_settings['SWIFT_VERSION'] = '6.0'
        bc.build_settings['OTHER_SWIFT_FLAGS'] = '$(inherited) -Xfrontend -strict-concurrency=minimal'
        bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int -Wno-implicit-int -Wno-implicit-function-declaration -Wno-non-modular-include-in-framework-module -Wno-everything -ferror-limit=0'
        bc.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
      end
    end

    # Apply to pods project-level build configs too
    installer.pods_project.build_configurations.each do |bc|
      bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      bc.build_settings['SWIFT_VERSION'] = '6.0'
      bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-everything -ferror-limit=0'
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

// 3. Xcode PROJECT settings — apply concurrency fix to MAIN app target too
const withXcodeProjectFix = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    for (const key in buildConfigs) {
      const bc = buildConfigs[key];
      if (bc && bc.buildSettings) {
        bc.buildSettings.SWIFT_STRICT_CONCURRENCY = 'minimal';
        bc.buildSettings.GCC_TREAT_WARNINGS_AS_ERRORS = 'NO';
        bc.buildSettings.SWIFT_TREAT_WARNINGS_AS_ERRORS = 'NO';
      }
    }
    return config;
  });
};

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [withIosFirebaseSwiftFix],
    [withEasPodfileFix],
    [withXcodeProjectFix],
    [
      "expo-build-properties",
      {
        "ios": {
          "useFrameworks": "dynamic",
          "deploymentTarget": "16.0"
        },
        "android": {
          "compileSdkVersion": 36,
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
