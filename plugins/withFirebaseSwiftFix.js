const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Firebase Swift AppDelegate Fix for Expo SDK 55+
 *
 * The official @react-native-firebase/app plugin only supports Objective-C.
 * Expo SDK 55 uses Swift AppDelegate, causing the Firebase plugin to throw:
 *   "Cannot add Firebase code to AppDelegate of language swift"
 *
 * This plugin:
 * 1. Patches the Firebase plugin's modifyAppDelegateAsync to handle Swift (no-op)
 * 2. Manually injects FirebaseApp.configure() into AppDelegate.swift
 */

// Patch Firebase plugin BEFORE prebuild runs
try {
  const firebaseAppDelegate = require('@react-native-firebase/app/plugin/build/ios/appDelegate');
  const originalModify = firebaseAppDelegate.modifyAppDelegateAsync;

  firebaseAppDelegate.modifyAppDelegateAsync = async function(appDelegateFileInfo) {
    const { language } = appDelegateFileInfo;
    if (['objc', 'objcpp'].includes(language)) {
      return originalModify(appDelegateFileInfo);
    }
    // Swift: skip - our withDangerousMod below handles it
    console.log('[withFirebaseSwiftFix] Skipping Firebase ObjC plugin for Swift AppDelegate');
  };
} catch (e) {
  console.warn('[withFirebaseSwiftFix] Could not patch Firebase plugin:', e.message);
}

module.exports = function withFirebaseSwiftFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName,
        'AppDelegate.swift'
      );

      if (!fs.existsSync(appDelegatePath)) {
        console.warn('[withFirebaseSwiftFix] AppDelegate.swift not found, skipping');
        return config;
      }

      let content = fs.readFileSync(appDelegatePath, 'utf8');

      // 1. Add import if missing
      if (!content.includes('import Firebase')) {
        content = 'import Firebase\n' + content;
      }

      // 2. Add FirebaseApp.configure() to didFinishLaunchingWithOptions
      if (!content.includes('FirebaseApp.configure()')) {
        const searchPattern = /didFinishLaunchingWithOptions[\s\S]*?\{/;
        content = content.replace(searchPattern, (match) => {
          return `${match}\n    FirebaseApp.configure()`;
        });
      }

      fs.writeFileSync(appDelegatePath, content);
      console.log('[withFirebaseSwiftFix] Successfully injected Firebase into AppDelegate.swift');
      return config;
    },
  ]);
};
