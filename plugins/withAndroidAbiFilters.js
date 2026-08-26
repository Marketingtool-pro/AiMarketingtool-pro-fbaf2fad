const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Inject ndk.abiFilters into android/app/build.gradle defaultConfig so
 * arm64-v8a + armeabi-v7a + x86_64 native libs all ship.
 *
 * Without this, Play Store v1.5.0(340) shipped an x86_64-only APK and
 * 115 arm64-v8a users crashed at startup with:
 *   SoLoaderDSONotFoundError: couldn't find DSO to load: libc++_shared.so
 *
 * x86_64 is included so Chromebooks and x86 emulators can install; the
 * explicit list is what keeps the arm ABIs from being dropped again.
 *
 * Reference: Crashlytics issue b86794a0099a41aa8c20a23ab3eea5ea
 */
const ABI_FILTERS = "'armeabi-v7a', 'arm64-v8a', 'x86_64'";

const withAndroidAbiFilters = (config) => {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;

    if (contents.includes('abiFilters')) {
      // Rewrite an existing list rather than bailing out, so a tree that was
      // prebuilt before x86_64 was added still converges on the right set.
      contents = contents.replace(
        /abiFilters\s+[^\n]*/,
        `abiFilters ${ABI_FILTERS}`,
      );
    } else {
      contents = contents.replace(
        /(versionCode\s+\d+\s*\n\s*versionName\s+"[^"]*"\s*\n)/,
        `$1\n        ndk {\n            abiFilters ${ABI_FILTERS}\n        }\n`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};

module.exports = withAndroidAbiFilters;
