/**
 * withRNEdgeToEdgeFix.js
 *
 * Expo config plugin that wires the generated Android project to use a patched
 * react-android AAR that removes deprecated Android 15 edge-to-edge API calls
 * (Window.setStatusBarColor, Window.setNavigationBarColor, etc.).
 *
 * Strategy:
 *  - Downloads the patched AAR (published to GitHub Releases as 0.83.6-e2e.1)
 *    and saves it under the ORIGINAL version number (0.83.6) in local-aar/.
 *  - Downloads the original unmodified POM from Maven Central (no patching
 *    needed — version stays 0.83.6, transitive deps stay correct).
 *  - Uses exclusiveContent so Gradle ONLY looks in local-aar for react-android,
 *    preventing Maven Central from ever serving the unpatched version.
 *  - NO resolutionStrategy.force needed — RNGP's own force("0.83.6") now
 *    resolves to our patched copy sitting in local-aar at 0.83.6.
 *
 * No EAS secrets required — the GitHub Release is publicly downloadable.
 */

const { withDangerousMod, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// The AAR is published as 0.83.6-e2e.1 in Releases but stored locally at 0.83.6.
const ORIG_VERSION = '0.83.6';
const PATCHED_AAR_URL =
  'https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/releases/download/' +
  'react-android-0.83.6-e2e.1/react-android-0.83.6-e2e.1.aar';
// Original POM from Maven Central — version unchanged, transitive deps intact.
const ORIG_POM_URL =
  `https://repo.maven.apache.org/maven2/com/facebook/react/react-android/${ORIG_VERSION}/react-android-${ORIG_VERSION}.pom`;

const LOCAL_AAR_SUBDIR = path.join(
  'local-aar', 'com', 'facebook', 'react', 'react-android', ORIG_VERSION
);

// exclusiveContent tells Gradle: for react-android, ONLY look in local-aar.
// Other repos added by RNGP (mavenCentral) are excluded from providing this artifact.
// RNGP's own force("com.facebook.react:react-android:0.83.6") still applies and now
// resolves cleanly to our patched 0.83.6 in local-aar.
const ALL_PROJECTS_BLOCK = `
allprojects {
    // ── Patched react-android: Android 15 edge-to-edge deprecated API fix ──
    repositories {
        exclusiveContent {
            forRepository {
                maven { name = 'ReactAndroidPatch'; url = new File(rootDir, "local-aar").toURI() }
            }
            filter {
                includeModule("com.facebook.react", "react-android")
            }
        }
    }
}`;

module.exports = function withRNEdgeToEdgeFix(config) {
  // 1. Download patched AAR + original POM into android/local-aar/ during prebuild.
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const androidDir = config.modRequest.platformProjectRoot;
      const localAarDir = path.join(androidDir, LOCAL_AAR_SUBDIR);
      const aarFile = path.join(localAarDir, `react-android-${ORIG_VERSION}.aar`);
      const pomFile = path.join(localAarDir, `react-android-${ORIG_VERSION}.pom`);

      fs.mkdirSync(localAarDir, { recursive: true });

      if (!fs.existsSync(aarFile)) {
        console.log('[withRNEdgeToEdgeFix] Downloading patched react-android AAR (~140 MB)...');
        execSync(`curl -L --fail -o "${aarFile}" "${PATCHED_AAR_URL}"`, { stdio: 'inherit' });
        console.log(`[withRNEdgeToEdgeFix] AAR saved to ${aarFile}`);
      } else {
        console.log('[withRNEdgeToEdgeFix] Patched AAR already present, skipping download.');
      }

      if (!fs.existsSync(pomFile)) {
        console.log('[withRNEdgeToEdgeFix] Downloading original react-android POM...');
        execSync(`curl -L --fail -o "${pomFile}" "${ORIG_POM_URL}"`, { stdio: 'inherit' });
      }

      return config;
    },
  ]);

  // 2. Append exclusiveContent allprojects{} block to root build.gradle.
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('ReactAndroidPatch')) return config;
    config.modResults.contents = `${contents.trimEnd()}\n${ALL_PROJECTS_BLOCK}\n`;
    return config;
  });

  return config;
};
