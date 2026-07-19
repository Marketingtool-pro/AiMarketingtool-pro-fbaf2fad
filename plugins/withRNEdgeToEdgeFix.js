/**
 * withRNEdgeToEdgeFix.js
 *
 * ⚠️ NOT CURRENTLY REGISTERED — this plugin is intentionally inactive.
 *
 * It appears in neither app.json's `plugins` array nor app.config.js, so none
 * of the AAR substitution below runs. That is deliberate: the registered
 * ./plugins/withAndroid15EdgeToEdge.js already solves the same Android 15
 * deprecation the cheap way (enableEdgeToEdge() in MainActivity + stripping the
 * deprecated attrs from styles.xml), without downloading a ~140 MB AAR on every
 * build. Keep this file as the fallback if the upstream fix ever regresses.
 *
 * If you DO re-register it, `PATCHED_VERSION` below must match a release that
 * actually exists — and android-patches/ must have been published for the
 * current react-native version first, or the build will fail resolving it.
 *
 * Expo config plugin that wires the generated Android project to use a patched
 * react-android AAR that removes deprecated Android 15 edge-to-edge API calls
 * (Window.setStatusBarColor, Window.setNavigationBarColor, etc.).
 *
 * Strategy:
 *  - Downloads the patched AAR + patched POM from GitHub Releases (PATCHED_VERSION)
 *    into android/local-aar/ under that version's directory.
 *  - Adds local-aar as a plain Maven repo (first in the list).
 *  - Uses resolutionStrategy.dependencySubstitution to redirect ALL react-android
 *    requests to PATCHED_VERSION, which lives exclusively in local-aar.
 *
 * Why dependencySubstitution instead of force/exclusiveContent:
 *  - RNGP (React Native Gradle Plugin) calls force("com.facebook.react:react-android:<ver>")
 *    on every project configuration. In Gradle 7.4+, dependencySubstitution takes
 *    precedence over force(), so our substitution wins and react-android resolves
 *    to PATCHED_VERSION from local-aar across ALL subprojects.
 *  - exclusiveContent in allprojects{} has known issues in Gradle 8.x (silent failures).
 *  - The -e2e.N version is never in Maven Central → no Gradle cache collision risk.
 *
 * No EAS secrets required — the GitHub Release is publicly downloadable.
 */

const { withDangerousMod, withProjectBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// MUST stay in lockstep with `patchedVersion` in android-patches/build.gradle
// and the GitHub release tag published by .github/workflows/patch-react-android.yml.
const PATCHED_VERSION = '0.86.0-e2e.1';
const PATCHED_AAR_URL =
  'https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/releases/download/' +
  `react-android-${PATCHED_VERSION}/react-android-${PATCHED_VERSION}.aar`;
const PATCHED_POM_URL =
  'https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/releases/download/' +
  `react-android-${PATCHED_VERSION}/react-android-${PATCHED_VERSION}.pom`;

const LOCAL_AAR_SUBDIR = path.join(
  'local-aar', 'com', 'facebook', 'react', 'react-android', PATCHED_VERSION
);

// dependencySubstitution takes precedence over force() in Gradle 7.4+ (Gradle 8.13).
// This overrides RNGP's force("com.facebook.react:react-android:0.83.6") and
// redirects all react-android requests to our patched version in local-aar.
const ALL_PROJECTS_BLOCK = `
allprojects {
    // ── Patched react-android: Android 15 edge-to-edge deprecated API fix ──
    repositories {
        maven { url = new File(rootDir, "local-aar").toURI() }
    }
    configurations.all {
        resolutionStrategy.dependencySubstitution {
            // Gradle 7.4+: substitution takes precedence over force() rules.
            // Catches any-version react-android and pins it to our patched e2e.1 build.
            substitute module("com.facebook.react:react-android") using module("com.facebook.react:react-android:${PATCHED_VERSION}")
        }
    }
}`;

module.exports = function withRNEdgeToEdgeFix(config) {
  // 1. Download patched AAR + POM into android/local-aar/ during prebuild.
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const androidDir = config.modRequest.platformProjectRoot;
      const localAarDir = path.join(androidDir, LOCAL_AAR_SUBDIR);
      const aarFile = path.join(localAarDir, `react-android-${PATCHED_VERSION}.aar`);
      const pomFile = path.join(localAarDir, `react-android-${PATCHED_VERSION}.pom`);

      fs.mkdirSync(localAarDir, { recursive: true });

      if (!fs.existsSync(aarFile)) {
        console.log('[withRNEdgeToEdgeFix] Downloading patched react-android AAR (~140 MB)...');
        execSync(`curl -L --fail -o "${aarFile}" "${PATCHED_AAR_URL}"`, { stdio: 'inherit' });
        console.log(`[withRNEdgeToEdgeFix] AAR saved to ${aarFile}`);
      } else {
        console.log('[withRNEdgeToEdgeFix] Patched AAR already present, skipping download.');
      }

      if (!fs.existsSync(pomFile)) {
        console.log('[withRNEdgeToEdgeFix] Downloading patched react-android POM...');
        execSync(`curl -L --fail -o "${pomFile}" "${PATCHED_POM_URL}"`, { stdio: 'inherit' });
        console.log('[withRNEdgeToEdgeFix] POM saved.');
      } else {
        console.log('[withRNEdgeToEdgeFix] Patched POM already present, skipping download.');
      }

      return config;
    },
  ]);

  // 2. Append dependencySubstitution allprojects{} block to root build.gradle.
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('react-android-e2e-patch')) return config;
    config.modResults.contents =
      `${contents.trimEnd()}\n// react-android-e2e-patch\n${ALL_PROJECTS_BLOCK}\n`;
    return config;
  });

  return config;
};
