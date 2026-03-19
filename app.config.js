const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * INLINED BUILD PLUGINS
 * These supplement the plugins in app.json — they do NOT replace them.
 * app.json plugins handle: expo-build-properties, Firebase, IAP, Stripe, etc.
 * This file only adds: Firebase Swift fix + Podfile concurrency fix.
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

// Export config WITHOUT overriding plugins — let app.json plugins be used
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [withIosFirebaseSwiftFix],
    ...(config.plugins || []),
  ]
});
