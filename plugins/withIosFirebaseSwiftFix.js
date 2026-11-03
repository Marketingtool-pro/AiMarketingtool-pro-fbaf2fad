const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Firebase Swift Fix for Expo SDK 55-58
 * Handles AppDelegate.swift initialization which the official plugins fail at.
 */
module.exports = function withIosFirebaseSwiftFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName,
        'AppDelegate.swift'
      );

      if (!fs.existsSync(appDelegatePath)) {
        console.log('AppDelegate.swift not found, skipping Swift fix.');
        return config;
      }

      let content = fs.readFileSync(appDelegatePath, 'utf8');

      // 1. Add Firebase Import
      if (!content.includes('import Firebase')) {
        content = 'import Firebase\n' + content;
      }

      // 2. Add FirebaseApp.configure() in didFinishLaunchingWithOptions
      // SDK 58's template splits the signature over several lines
      // ("func application(\n    _ application: UIApplication,\n    didFinishLaunchingWithOptions ...").
      // The old single-line includes() check never matched it, so
      // FirebaseApp.configure() was silently skipped and the app crashed on
      // launch with "No Firebase App '[DEFAULT]' has been created" (2026-11-04).
      const didFinish = /func application\(\s*_ application: UIApplication,\s*didFinishLaunchingWithOptions[\s\S]*?\)\s*->\s*Bool\s*\{/;
      if (didFinish.test(content)) {
        if (!content.includes('FirebaseApp.configure()')) {
          content = content.replace(
            didFinish,
            (match) => `${match}\n    FirebaseApp.configure()`
          );
        }
      }

      fs.writeFileSync(appDelegatePath, content);
      return config;
    },
  ]);
};
