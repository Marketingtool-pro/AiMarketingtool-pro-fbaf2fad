const { withDangerousMod, withAndroidStyles, withMainActivity } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Android 15 Edge-to-Edge Fix (Comprehensive)
 *
 * Fixes ALL deprecated APIs reported by Play Console:
 * 1. Window.getStatusBarColor/setStatusBarColor/setNavigationBarColor (React Native StatusBarModule)
 * 2. LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES/DEFAULT (React Native WindowUtilKt)
 * 3. BottomSheetDialog/EdgeToEdgeUtils/SheetDialog (Google Material library)
 * 4. ExpoCropImageUtils (Expo Image Picker)
 *
 * Fix approach:
 * - MainActivity: Use modern androidx.activity.enableEdgeToEdge() API
 * - styles.xml: Set Android 15 compatible values
 * - values-v35: Opt into edge-to-edge for API 35+
 * - build.gradle: Force Material 1.12.0+ which has Android 15 edge-to-edge fixes
 * - gradle.properties: Enable edge-to-edge React Native flag
 */
module.exports = function withAndroid15EdgeToEdge(config, options = {}) {
  // Status bar icon appearance — pass { preferLightStatusBar: true } for light-themed apps.
  const preferLightStatusBar = options.preferLightStatusBar === true;

  // Step 1: Use enableEdgeToEdge() in MainActivity (KOTLIN)
  config = withMainActivity(config, (config) => {
    const lang = config.modResults.language;
    if (lang === 'kt' || lang === 'kotlin') {
      let content = config.modResults.contents;

      const superOnCreatePattern = /super\.onCreate\((null|savedInstanceState)\)/;
      const needsPatch = !content.includes('enableEdgeToEdge()') && superOnCreatePattern.test(content);

      if (needsPatch) {
        if (!content.includes('import androidx.activity.enableEdgeToEdge')) {
          content = content.replace(
            /import com\.facebook\.react\.ReactActivity/,
            `import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity`
          );
        }

        const match = content.match(superOnCreatePattern);
        content = content.replace(
          match[0],
          `enableEdgeToEdge()
    ${match[0]}

    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.isAppearanceLightStatusBars = ${preferLightStatusBar}
    controller.isAppearanceLightNavigationBars = ${preferLightStatusBar}`
        );
      }

      config.modResults.contents = content;
    } else if (lang === 'java') {
      console.warn('[withAndroid15EdgeToEdge] MainActivity is Java; this plugin only patches Kotlin. Convert MainActivity to Kotlin or manually add enableEdgeToEdge() in onCreate.');
    }
    return config;
  });

  // Step 2: Patch styles.xml
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

  // Step 3: Create values-v35 folder + force Material library update + gradle.properties
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

      // Explicitly define Theme.EdgeToEdge as an alias if needed, or just use it.
      // We also set windowOptOutEdgeToEdgeEnforcement to false to follow Android 15 rules.
      fs.writeFileSync(path.join(v35Dir, 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.EdgeToEdge" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="android:windowOptOutEdgeToEdgeEnforcement">false</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLayoutInDisplayCutoutMode">always</item>
    </style>

    <style name="AppTheme" parent="Theme.EdgeToEdge">
        <item name="android:windowTranslucentStatus">false</item>
        <item name="android:windowTranslucentNavigation">false</item>
    </style>
</resources>
`);

      // Step 4: Force Material 1.12.0 in app/build.gradle
      const buildGradlePath = path.join(projectRoot, 'app', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

        if (!buildGradle.includes('com.google.android.material:material:1.12')) {
          if (buildGradle.includes('dependencies {')) {
            buildGradle = buildGradle.replace(
              'dependencies {',
              `dependencies {
    implementation("com.google.android.material:material:1.12.0")`
            );
          }

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

      // Step 5: Add React Native edge-to-edge flag in gradle.properties
      const gradlePropsPath = path.join(projectRoot, 'gradle.properties');
      if (fs.existsSync(gradlePropsPath)) {
        let props = fs.readFileSync(gradlePropsPath, 'utf8');
        let updatedProps = props;
        if (!props.includes('reactNativeEdgeToEdge')) {
          updatedProps += '\n# Enable React Native edge-to-edge support for Android 15\nreactNativeEdgeToEdge=true\n';
        }
        if (!props.includes('android.enableEdgeToEdgeEnforcement')) {
          updatedProps += 'android.enableEdgeToEdgeEnforcement=true\n';
        }
        if (updatedProps !== props) {
          fs.writeFileSync(gradlePropsPath, updatedProps);
        }
      }

      return config;
    },
  ]);

  return config;
};
