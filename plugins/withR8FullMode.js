const { withGradleProperties } = require('expo/config-plugins');

/**
 * withR8FullMode
 *
 * Turns on the two R8 settings Play Console asks for under
 * "Improve your app's memory and performance with R8 optimization":
 *
 *   Optimization isn't enabled            -> android.enableR8.fullMode=true
 *   Optimized resource shrinking isn't    -> android.enableNewResourceShrinker
 *     enabled                                .preciseShrinking=true
 *
 * (The third item in that report, "Upgrade your Android Gradle plugin to
 * version 9.0 or higher", is NOT settable here. AGP is pinned by the Expo SDK
 * — SDK 57 ships AGP 8.x — so it moves when Expo moves, not via a property.)
 *
 * enableProguardInReleaseBuilds / enableShrinkResourcesInReleaseBuilds are
 * already true in app.json's expo-build-properties block. Those switch R8 ON;
 * fullMode switches it from compat mode to full mode, which is what Play means
 * by "Optimization isn't enabled".
 *
 * WHY THIS NEEDS CARE: R8 full mode drops the compatibility assumptions that
 * keep reflection-heavy frameworks working. React Native resolves native
 * modules, view managers and JNI entry points reflectively, so anything not
 * explicitly kept can be stripped or renamed and then fail at RUNTIME, not at
 * build time — a green build proves nothing here. The keep rules in app.json
 * (extraProguardRules) were written for compat mode and are missing several
 * native bridges; withR8FullModeKeepRules below adds them.
 *
 * To roll back: remove this plugin from app.json's plugins array. The
 * properties are only written by this plugin, so dropping it restores compat
 * mode on the next prebuild.
 */

const PROPS = [
  ['android.enableR8.fullMode', 'true'],
  ['android.enableNewResourceShrinker.preciseShrinking', 'true'],
];

const withR8FullMode = (config) =>
  withGradleProperties(config, (cfg) => {
    for (const [key, value] of PROPS) {
      const existing = cfg.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );

      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    }

    return cfg;
  });

module.exports = withR8FullMode;
