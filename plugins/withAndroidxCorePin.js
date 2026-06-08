const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Force androidx.core to 1.17.0 across ALL Gradle subprojects.
 *
 * Why: expo-dev-launcher 56.0.19 calls `WindowCompat.enableEdgeToEdge()` — an API
 * added in androidx.core 1.16.0 — and declares `androidx.core:core-ktx:1.17.0`.
 * But React Native 0.85's Gradle plugin pins androidx.core DOWN to 1.15.0, which
 * lacks `enableEdgeToEdge`, so `:expo-dev-launcher:compileDebugKotlin` fails with
 * "Unresolved reference 'enableEdgeToEdge'". androidx.core is backward-compatible,
 * so 1.17.0 keeps RN 0.85 + every module building AND gives the app the latest
 * WindowCompat edge-to-edge handling.
 *
 * Uses allprojects (root build.gradle) so the force reaches every module, not just
 * :app (a :app-only resolutionStrategy would NOT fix the dev-launcher subproject).
 */
const MARKER = '// androidx-core-pin-1.17.0';
const BLOCK = `
${MARKER}
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.17.0'
            force 'androidx.core:core-ktx:1.17.0'
        }
    }
}
`;

module.exports = function withAndroidxCorePin(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    if (config.modResults.contents.includes(MARKER)) return config;
    config.modResults.contents = config.modResults.contents.trimEnd() + '\n' + BLOCK + '\n';
    return config;
  });
};
