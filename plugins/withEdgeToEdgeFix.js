const { withDangerousMod, withMainActivity, withAndroidStyles } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix deprecated edge-to-edge APIs for Android 15+ (API 35)
 *
 * Deprecated APIs:
 * - Window.setStatusBarColor / getStatusBarColor
 * - Window.setNavigationBarColor / getNavigationBarColor
 * - LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES / DEFAULT
 *
 * These come from: react-native StatusBarModule, react-native-screens,
 * expo-image-picker, Material components, AndroidX
 *
 * Fix: Set android:enforceEdgeToEdge in theme + configure window insets properly
 */

function withEdgeToEdgeFix(config) {
  // Step 1: Patch Android styles.xml to use edge-to-edge theme attributes
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    // Find or create the AppTheme style
    let appTheme = styles.resources.style?.find(
      (s) => s.$.name === 'AppTheme'
    );

    if (appTheme) {
      // Remove deprecated status/navigation bar color items
      if (appTheme.item) {
        appTheme.item = appTheme.item.filter((item) => {
          const name = item.$.name;
          return (
            name !== 'android:statusBarColor' &&
            name !== 'android:navigationBarColor' &&
            name !== 'android:windowLayoutInDisplayCutoutMode' &&
            name !== 'android:enforceStatusBarContrast' &&
            name !== 'android:enforceNavigationBarContrast'
          );
        });
      } else {
        appTheme.item = [];
      }

      // Add modern edge-to-edge attributes
      appTheme.item.push(
        { $: { name: 'android:windowOptOutEdgeToEdgeEnforcement' }, _: 'false' },
        { $: { name: 'android:statusBarColor' }, _: '@android:color/transparent' },
        { $: { name: 'android:navigationBarColor' }, _: '@android:color/transparent' }
      );
    }

    return config;
  });

  // Step 2: Patch MainActivity to use WindowCompat for edge-to-edge
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const mainActivityPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java'
      );

      // Find MainActivity file
      const findMainActivity = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            const result = findMainActivity(fullPath);
            if (result) return result;
          } else if (file.name === 'MainActivity.kt' || file.name === 'MainActivity.java') {
            return fullPath;
          }
        }
        return null;
      };

      const activityFile = findMainActivity(mainActivityPath);
      if (activityFile && activityFile.endsWith('.kt')) {
        let content = fs.readFileSync(activityFile, 'utf8');

        // Add WindowCompat import if not present
        if (!content.includes('WindowCompat')) {
          content = content.replace(
            'import android.os.Bundle',
            'import android.os.Bundle\nimport androidx.core.view.WindowCompat'
          );

          // If no Bundle import, add at end of imports
          if (!content.includes('WindowCompat')) {
            const importSection = content.match(/^import .+$/m);
            if (importSection) {
              content = content.replace(
                importSection[0],
                importSection[0] + '\nimport androidx.core.view.WindowCompat'
              );
            }
          }
        }

        // Add edge-to-edge setup in onCreate if not present
        if (!content.includes('WindowCompat.setDecorFitsSystemWindows')) {
          content = content.replace(
            'super.onCreate(null)',
            'super.onCreate(null)\n    WindowCompat.setDecorFitsSystemWindows(window, false)'
          );
        }

        fs.writeFileSync(activityFile, content);
      }

      // Step 3: Force Material library 1.14.0-alpha05 to fix BottomSheetDialog/EdgeToEdgeUtils
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app/build.gradle'
      );

      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

        // Add resolution strategy to force updated Material library
        const resolutionStrategy = `
    configurations.all {
        resolutionStrategy {
            force 'com.google.android.material:material:1.14.0-alpha05'
        }
    }`;

        if (!buildGradle.includes("com.google.android.material:material:1.14.0")) {
          // Insert after the first 'android {' block, inside the top-level scope
          if (buildGradle.includes('dependencies {')) {
            buildGradle = buildGradle.replace(
              'dependencies {',
              resolutionStrategy + '\n\ndependencies {'
            );
          } else {
            // Append before the last closing brace
            buildGradle += '\n' + resolutionStrategy + '\n';
          }
          fs.writeFileSync(buildGradlePath, buildGradle);
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withEdgeToEdgeFix;
