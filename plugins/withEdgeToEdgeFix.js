const { withDangerousMod, withMainActivity, withAndroidStyles, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix deprecated edge-to-edge APIs for Android 15+ (API 35)
 * and Orientation restrictions for Android 16+
 * and Initialize Play Integrity App Check for Android
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
        { $: { name: 'android:navigationBarColor' }, _: '@android:color/transparent' },
        { $: { name: 'android:windowLayoutInDisplayCutoutMode' }, _: 'always' }
      );
    }

    return config;
  });

  // Step 2: Patch AndroidManifest.xml to remove orientation restrictions
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    const mainApplication = androidManifest.application[0];

    // Add tools namespace for tools:replace
    if (!androidManifest.$) {
      androidManifest.$ = {};
    }
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Fix for GmsBarcodeScanningDelegateActivity orientation restriction (Android 16 requirement)
    const barcodeActivity = {
      $: {
        'android:name': 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity',
        'android:screenOrientation': 'unspecified',
        'tools:replace': 'android:screenOrientation',
      },
    };

    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }
    
    const existingIndex = mainApplication.activity.findIndex(
      (a) => a.$['android:name'] === 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity'
    );
    
    if (existingIndex > -1) {
      mainApplication.activity[existingIndex] = barcodeActivity;
    } else {
      mainApplication.activity.push(barcodeActivity);
    }

    return config;
  });

  // Step 3: Patch MainActivity to use WindowCompat and Play Integrity
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const mainActivityPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java'
      );

      // Find MainActivity file
      const findMainActivity = (dir) => {
        if (!fs.existsSync(dir)) return null;
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

        // Add Imports
        const imports = [
          'import androidx.core.view.WindowCompat',
          'import androidx.core.view.WindowInsetsControllerCompat',
          'import com.google.firebase.Firebase',
          'import com.google.firebase.appcheck.appCheck',
          'import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory',
          'import com.google.firebase.initialize'
        ];

        imports.forEach(imp => {
          if (!content.includes(imp)) {
            content = content.replace('import android.os.Bundle', `import android.os.Bundle\n${imp}`);
          }
        });

        // Add edge-to-edge setup in onCreate if not present
        if (!content.includes('WindowCompat.setDecorFitsSystemWindows')) {
          content = content.replace(
            'super.onCreate(null)',
            'super.onCreate(null)\n    WindowCompat.setDecorFitsSystemWindows(window, false)'
          );
        }

        // Add Play Integrity Initialization
        if (!content.includes('PlayIntegrityAppCheckProviderFactory')) {
          content = content.replace(
            'WindowCompat.setDecorFitsSystemWindows(window, false)',
            'WindowCompat.setDecorFitsSystemWindows(window, false)\n    Firebase.initialize(context = this)\n    Firebase.appCheck.installAppCheckProviderFactory(\n        PlayIntegrityAppCheckProviderFactory.getInstance(),\n    )'
          );
        }

        fs.writeFileSync(activityFile, content);
      }

      // Step 4: Add dependencies to build.gradle
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app/build.gradle'
      );

      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

        // Add resolution strategy
        const resolutionStrategy = `
    configurations.all {
        resolutionStrategy {
            force 'com.google.android.material:material:1.13.0-alpha09'
            force 'androidx.activity:activity:1.10.0-alpha03'
            force 'androidx.activity:activity-ktx:1.10.0-alpha03'
            force 'androidx.activity:activity-compose:1.10.0-alpha03'
        }
    }`;

        if (!buildGradle.includes("configurations.all {")) {
          if (buildGradle.includes('dependencies {')) {
            buildGradle = buildGradle.replace(
              'dependencies {',
              resolutionStrategy + '\n\ndependencies {'
            );
          }
        }

        // Add Play Integrity dependencies
        const firebaseDeps = `
    implementation platform('com.google.firebase:firebase-bom:34.10.0')
    implementation 'com.google.firebase:firebase-appcheck-playintegrity'
`;
        if (!buildGradle.includes("firebase-appcheck-playintegrity")) {
          buildGradle = buildGradle.replace(
            'dependencies {',
            `dependencies {\n${firebaseDeps}`
          );
        }

        fs.writeFileSync(buildGradlePath, buildGradle);
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withEdgeToEdgeFix;
