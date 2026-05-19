/**
 * withRNEdgeToEdgeFix.js
 *
 * Expo config plugin that wires the generated Android project to use
 * our patched react-android AAR (0.83.6-e2e.1).
 *
 * The AAR is stored as a GitHub Release asset (bypasses 100 MB git limit).
 * During `expo prebuild` (i.e. every EAS build), this plugin downloads the
 * AAR into android/local-aar/ and tells Gradle to use it via a local maven
 * repo + resolutionStrategy.force.
 *
 * No EAS secrets required — the GitHub Release is publicly downloadable.
 *
 * The patched AAR fixes Android 15 deprecated edge-to-edge APIs in:
 *   - com.facebook.react.modules.statusbar.StatusBarModule
 *   - com.facebook.react.views.view.WindowUtil
 */

const { withDangerousMod, withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PATCHED_VERSION = '0.83.6-e2e.1';
const AAR_RELEASE_URL =
  `https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/releases/download/react-android-${PATCHED_VERSION}/react-android-${PATCHED_VERSION}.aar`;
const POM_RELEASE_URL =
  `https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/releases/download/react-android-${PATCHED_VERSION}/react-android-${PATCHED_VERSION}.pom`;

const LOCAL_AAR_SUBDIR = path.join('local-aar', 'com', 'facebook', 'react', 'react-android', PATCHED_VERSION);

const MINIMAL_POM = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.facebook.react</groupId>
  <artifactId>react-android</artifactId>
  <version>${PATCHED_VERSION}</version>
  <packaging>aar</packaging>
</project>`;

// Injected into root build.gradle — adds resolutionStrategy.force so ALL subprojects
// request our patched version. Repositories are handled via settings.gradle injection.
const ALL_PROJECTS_BLOCK = `
allprojects {
    // ── Patched react-android: Android 15 edge-to-edge deprecated API fix ──
    repositories {
        maven { url new File(rootDir, "local-aar").toURI() }
    }
    configurations.all {
        resolutionStrategy {
            force "com.facebook.react:react-android:${PATCHED_VERSION}"
        }
    }
}`;

// Injected into dependencyResolutionManagement.repositories in settings.gradle(.kts)
// so all subprojects resolve our patched AAR from local-aar/.
// Kotlin DSL syntax (url = ...) is used for .kts files; Groovy (url ...) for .gradle files.
function buildSettingsMavenBlock(isKts) {
  const mavenUrl = isKts
    ? `maven { url = File(rootProject.projectDir, "local-aar").toURI() }`
    : `maven { url new File(rootProject.projectDir, "local-aar").toURI() }`;
  return `        // ── Patched react-android: Android 15 edge-to-edge deprecated API fix ──\n        ${mavenUrl}`;
}

module.exports = function withRNEdgeToEdgeFix(config) {
  // 1. Download the AAR from GitHub Release into android/local-aar/ during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const androidDir = config.modRequest.platformProjectRoot;
      const localAarDir = path.join(androidDir, LOCAL_AAR_SUBDIR);
      const aarFile = path.join(localAarDir, `react-android-${PATCHED_VERSION}.aar`);
      const pomFile = path.join(localAarDir, `react-android-${PATCHED_VERSION}.pom`);

      if (!fs.existsSync(aarFile)) {
        console.log(`[withRNEdgeToEdgeFix] Downloading patched react-android AAR...`);
        fs.mkdirSync(localAarDir, { recursive: true });
        execSync(`curl -L --fail -o "${aarFile}" "${AAR_RELEASE_URL}"`, { stdio: 'inherit' });
        console.log(`[withRNEdgeToEdgeFix] AAR downloaded to ${aarFile}`);
      }

      if (!fs.existsSync(pomFile)) {
        // Download POM from release (has correct transitive deps from original react-android 0.83.6)
        execSync(`curl -L --fail -o "${pomFile}" "${POM_RELEASE_URL}"`, { stdio: 'inherit' });
      }

      return config;
    },
  ]);

  // 2. Add local-aar Maven repo to dependencyResolutionManagement.repositories in
  //    settings.gradle(.kts) — this is the authoritative repo list when
  //    repositoriesMode = PREFER_SETTINGS (the default in RN 0.73+ projects).
  //    We must inject AFTER the `dependencyResolutionManagement {` block opens,
  //    NOT into pluginManagement.repositories (which is for Gradle plugins only).
  config = withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('Patched react-android')) return config;

    // Detect syntax: .gradle.kts → Kotlin DSL, .gradle → Groovy DSL
    const isKts = (config.modResults.path || '').endsWith('.kts');
    const mavenBlock = buildSettingsMavenBlock(isKts);

    // Find the `dependencyResolutionManagement` block so we inject into
    // the RIGHT repositories section (not pluginManagement.repositories).
    const depResIdx = contents.indexOf('dependencyResolutionManagement');
    const searchFrom = depResIdx >= 0 ? depResIdx : 0;

    // Insert our repo before the first google() or mavenCentral() that appears
    // inside the dependencyResolutionManagement block.
    const googleIdx = contents.indexOf('google()', searchFrom);
    const mavenCentralIdx = contents.indexOf('mavenCentral()', searchFrom);

    let insertAt = -1;
    if (googleIdx >= 0 && mavenCentralIdx >= 0) {
      insertAt = Math.min(googleIdx, mavenCentralIdx);
    } else if (googleIdx >= 0) {
      insertAt = googleIdx;
    } else if (mavenCentralIdx >= 0) {
      insertAt = mavenCentralIdx;
    }

    if (insertAt < 0) return config;

    config.modResults.contents =
      contents.slice(0, insertAt) +
      mavenBlock + '\n' +
      contents.slice(insertAt);
    return config;
  });

  // 3. Add allprojects{} block to root build.gradle so ALL subprojects see the
  //    local repo, even those that declare their own repositories block.
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('Patched react-android')) return config;
    config.modResults.contents = `${contents.trimEnd()}\n${ALL_PROJECTS_BLOCK}\n`;
    return config;
  });

  return config;
};
