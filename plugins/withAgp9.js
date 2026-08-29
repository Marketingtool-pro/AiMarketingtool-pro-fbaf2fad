/**
 * withAgp9.js
 *
 * Raises the Android Gradle Plugin to 9.x and the Gradle wrapper to a matching
 * 9.x distribution.
 *
 * Why: Play Console -> Android Vitals recommends "Upgrade your Android Gradle
 * plugin to version 9.0 or higher" for better R8 optimization (lower memory,
 * better runtime performance).
 *
 * Expo SDK 57 does NOT expose an AGP knob -- expo-build-properties has no
 * option for it, and RN's gradle plugin declares agp 8.12.0 in its own
 * libs.versions.toml. But the generated android/build.gradle contains the
 * version as a plain literal:
 *
 *     classpath("com.android.tools.build:gradle:8.12.0")
 *
 * so it can be rewritten during prebuild, the same way withRNEdgeToEdgeFix
 * appends to the root build.gradle.
 *
 * AGP 9 requires Gradle 9, so the wrapper has to move too (SDK 57 generates
 * gradle-8.13). Both are changed together or the build fails immediately.
 *
 * EXPERIMENTAL: RN 0.86.2's react-native-gradle-plugin is compiled against
 * AGP 8 APIs. If it uses anything removed in AGP 9 the build breaks at
 * configuration time. This plugin is therefore proven by an actual build
 * before it goes anywhere near a release.
 */

const { withProjectBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Latest stable AGP 9 and a Gradle 9 that satisfies it.
const AGP_VERSION = '9.0.0';
const GRADLE_VERSION = '9.0.0';

const AGP_CLASSPATH_RE = /com\.android\.tools\.build:gradle:[0-9]+\.[0-9]+\.[0-9]+/g;
const DISTRIBUTION_RE = /gradle-[0-9]+(\.[0-9]+)*(-[a-z0-9]+)?-(bin|all)\.zip/;

module.exports = function withAgp9(config) {
  // 1. Rewrite the AGP classpath literal in the root build.gradle.
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!AGP_CLASSPATH_RE.test(contents)) {
      console.warn(
        '[withAgp9] No com.android.tools.build:gradle classpath found — ' +
          'leaving build.gradle untouched.'
      );
      return config;
    }
    // test() advanced lastIndex on the global regex; reset before replace.
    AGP_CLASSPATH_RE.lastIndex = 0;
    config.modResults.contents = contents.replace(
      AGP_CLASSPATH_RE,
      `com.android.tools.build:gradle:${AGP_VERSION}`
    );
    console.log(`[withAgp9] AGP -> ${AGP_VERSION}`);
    return config;
  });

  // 2. Move the Gradle wrapper to a 9.x distribution (AGP 9 requires it).
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const wrapper = path.join(
        config.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );
      if (!fs.existsSync(wrapper)) {
        console.warn(`[withAgp9] ${wrapper} not found — wrapper left as generated.`);
        return config;
      }
      const before = fs.readFileSync(wrapper, 'utf8');
      const after = before.replace(
        DISTRIBUTION_RE,
        `gradle-${GRADLE_VERSION}-bin.zip`
      );
      if (after !== before) {
        fs.writeFileSync(wrapper, after);
        console.log(`[withAgp9] Gradle wrapper -> ${GRADLE_VERSION}`);
      }
      return config;
    },
  ]);

  return config;
};
