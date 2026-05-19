/**
 * withRNEdgeToEdgeFix.js
 *
 * Expo config plugin that wires the generated Android project to use
 * our patched react-android AAR (0.83.6-e2e.1) from GitHub Packages
 * instead of the stock 0.83.6 from Maven Central.
 *
 * The patched AAR fixes Android 15 deprecated edge-to-edge APIs in:
 *   - com.facebook.react.modules.statusbar.StatusBarModule
 *   - com.facebook.react.views.view.WindowUtil
 *
 * Build the patched AAR first by running the GitHub Actions workflow
 * at .github/workflows/patch-react-android.yml (or workflow_dispatch).
 *
 * EAS secret required: GITHUB_TOKEN (read:packages scope)
 */

const { withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

const GITHUB_MAVEN_URL =
  'https://maven.pkg.github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad';
const PATCHED_VERSION = '0.83.6-e2e.1';

// GITHUB_ACTOR must be the GitHub username of the PAT owner (not the org name).
// Set it as an EAS secret: eas env:create --name GITHUB_ACTOR --value "<your-gh-username>"
// GITHUB_TOKEN must be a classic PAT with read:packages scope from the same account.
const MAVEN_BLOCK = `
        // ── Patched react-android: Android 15 edge-to-edge deprecated API fix ──
        maven {
            url "${GITHUB_MAVEN_URL}"
            credentials {
                username = System.getenv("GITHUB_ACTOR") ?: System.getenv("GITHUB_USERNAME") ?: ""
                password = System.getenv("GITHUB_TOKEN") ?: ""
            }
        }`;

// Injected into allprojects{} in root build.gradle so it applies to ALL subprojects,
// even those that declare their own repositories (which override settings.gradle repos).
const ALL_PROJECTS_BLOCK = `
allprojects {
    // ── Patched react-android: Android 15 edge-to-edge deprecated API fix ──
    repositories {
        maven {
            url "${GITHUB_MAVEN_URL}"
            credentials {
                username = System.getenv("GITHUB_ACTOR") ?: System.getenv("GITHUB_USERNAME") ?: ""
                password = System.getenv("GITHUB_TOKEN") ?: ""
            }
        }
    }
    configurations.all {
        resolutionStrategy {
            force "com.facebook.react:react-android:${PATCHED_VERSION}"
        }
    }
}`;

function insertGithubRepoBeforeDependencyMavenCentral(contents) {
  const dependencyIndex = contents.indexOf('dependencyResolutionManagement');
  const searchStart = dependencyIndex >= 0 ? dependencyIndex : 0;
  const mavenCentralIndex = contents.indexOf('mavenCentral()', searchStart);

  if (mavenCentralIndex < 0) {
    return contents;
  }

  return `${contents.slice(0, mavenCentralIndex)}${MAVEN_BLOCK}\n${contents.slice(mavenCentralIndex)}`;
}

module.exports = function withRNEdgeToEdgeFix(config) {
  // 1. Add GitHub Packages Maven repo to settings.gradle (covers projects that
  //    use dependencyResolutionManagement / don't declare their own repos)
  config = withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('Patched react-android')) return config;
    config.modResults.contents = insertGithubRepoBeforeDependencyMavenCentral(contents);
    return config;
  });

  // 2. Add allprojects{repositories+force} to root build.gradle — this is what
  //    actually works for subprojects that declare their own repositories, because
  //    those subprojects ignore dependencyResolutionManagement in settings.gradle.
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('Patched react-android')) return config;
    config.modResults.contents = `${contents.trimEnd()}\n${ALL_PROJECTS_BLOCK}\n`;
    return config;
  });

  return config;
};
