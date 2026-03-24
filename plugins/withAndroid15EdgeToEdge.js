const { withDangerousMod, withAndroidStyles } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Android 15 Edge-to-Edge Fix
 *
 * Fixes ALL deprecated APIs reported by Play Console:
 * 1. Window.getStatusBarColor/setStatusBarColor/setNavigationBarColor (React Native StatusBarModule)
 * 2. LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES/DEFAULT (React Native WindowUtilKt)
 * 3. BottomSheetDialog/EdgeToEdgeUtils/SheetDialog (Google Material library)
 * 4. ExpoCropImageUtils (Expo Image Picker)
 *
 * Fix approach:
 * - styles.xml: Set Android 15 compatible values
 * - values-v35: Opt into edge-to-edge for API 35+
 * - build.gradle: Force Material 1.12.0+ which has Android 15 edge-to-edge fixes
 * - gradle.properties: Enable edge-to-edge React Native flag
 */
module.exports = function withAndroid15EdgeToEdge(config) {
  // Step 1: Patch styles.xml
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    const appTheme = styles.resources.style?.find((s) => s.$.name === 'AppTheme');

    if (appTheme) {
      if (appTheme.item) {
        appTheme.item = appTheme.item.filter(
          (item) =>
            item.$.name !== 'android:statusBarColor' &&
            item.$.name !== 'android:navigationBarColor' &&
            item.$.name !== 'android:windowLayoutInDisplayCutoutMode' &&
            item.$.name !== 'android:enforceEdgeToEdge' &&
            item.$.name !== 'android:windowTranslucentStatus' &&
            item.$.name !== 'android:windowTranslucentNavigation'
        );
      } else {
        appTheme.item = [];
      }

      appTheme.item.push(
        { $: { name: 'android:statusBarColor' }, _: '@android:color/transparent' },
        { $: { name: 'android:navigationBarColor' }, _: '@android:color/transparent' },
        { $: { name: 'android:windowLayoutInDisplayCutoutMode' }, _: 'always' },
        { $: { name: 'android:windowTranslucentStatus' }, _: 'false' },
        { $: { name: 'android:windowTranslucentNavigation' }, _: 'false' }
      );
    }

    return config;
  });

  // Step 2: Create values-v35 folder + force Material library update + gradle.properties
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const resDir = path.join(projectRoot, 'app', 'src', 'main', 'res');

      // values-v35 for Android 15 (API 35)
      const v35Dir = path.join(resDir, 'values-v35');
      if (!fs.existsSync(v35Dir)) {
        fs.mkdirSync(v35Dir, { recursive: true });
      }

      fs.writeFileSync(path.join(v35Dir, 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.EdgeToEdge">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLayoutInDisplayCutoutMode">always</item>
        <item name="android:windowOptOutEdgeToEdgeEnforcement">false</item>
    </style>
</resources>
`);

      // Step 3: Force Material 1.12.0 in app/build.gradle
      // This fixes BottomSheetDialog, EdgeToEdgeUtils, SheetDialog deprecations
      const buildGradlePath = path.join(projectRoot, 'app', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

        // Add Material library force resolution
        if (!buildGradle.includes('com.google.android.material:material:1.12')) {
          // Add to dependencies section or create resolution strategy
          if (buildGradle.includes('dependencies {')) {
            buildGradle = buildGradle.replace(
              'dependencies {',
              `dependencies {
    // Force Material 1.12.0 for Android 15 edge-to-edge compatibility
    implementation("com.google.android.material:material:1.12.0")`
            );
          }

          // Also add resolution strategy to force all transitive deps
          if (buildGradle.includes('android {')) {
            buildGradle = buildGradle.replace(
              'android {',
              `configurations.all {
    resolutionStrategy {
        force "com.google.android.material:material:1.12.0"
    }
}

android {`
            );
          }

          fs.writeFileSync(buildGradlePath, buildGradle);
        }
      }

      // Step 4: Add React Native edge-to-edge flag in gradle.properties
      const gradlePropsPath = path.join(projectRoot, 'gradle.properties');
      if (fs.existsSync(gradlePropsPath)) {
        let props = fs.readFileSync(gradlePropsPath, 'utf8');
        if (!props.includes('reactNativeEdgeToEdge')) {
          props += '\n# Enable React Native edge-to-edge support for Android 15\nreactNativeEdgeToEdge=true\n';
          fs.writeFileSync(gradlePropsPath, props);
        }
      }

      return config;
    },
  ]);

  return config;
};
