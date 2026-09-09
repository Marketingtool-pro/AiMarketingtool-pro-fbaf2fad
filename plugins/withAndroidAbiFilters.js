const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * withAndroidAbiFilters.js
 *
 * Stop packaging an x86_64 split that cannot work.
 *
 * The shipped 1.5.16 (1028) bundle contained three ABI splits, and the x86_64
 * one was missing every library this project builds from source:
 *
 *   in base/lib/arm64-v8a but NOT in base/lib/x86_64:
 *     libNitroIap.so  libNitroModules.so  libexpo-modules-core.so
 *     libexpo-updates.so  libreanimated.so  librnskia.so
 *     librnscreens.so  libgesturehandler.so  libworklets.so
 *
 * Play serves that split to x86_64 devices and the app dies on the first
 * source-built library it loads -- 68 crashes across 19 users on 1.5.14-1.5.16:
 *
 *   java.lang.UnsatisfiedLinkError: dlopen failed:
 *     library "libNitroIap.so" not found
 *     at com.margelo.nitro.iap.NitroIapOnLoad$Companion.initializeNative
 *     at pro.marketingtool.app.MainApplication.getReactHost
 *
 * expo-build-properties' `buildArchs` already listed only the two ARM ABIs, so
 * CMake built only those -- but the x86_64 split appeared anyway, because
 * buildArchs drives the SOURCE build and does not set abiFilters, so prebuilt
 * .so files arriving inside third-party AARs were still packaged. This writes a
 * real abiFilters block, which is what AGP consults when deciding which native
 * libraries to package, so no x86_64 split is produced at all.
 *
 * Why this rather than building x86_64: adding "x86_64" to buildArchs was tried
 * first, in 1.5.17 (1029). It compiles Skia, Reanimated, Nitro, Expo core,
 * Screens, Gesture Handler and Worklets a third time, and that build stalled --
 * created 17:21 UTC, last progress 17:35, still unfinished 1h47m later, against
 * 12-19 minutes for every other Android build on this project. It also blew
 * past the workflow's timeout, so a finished AAB never got submitted. An ABI
 * nobody ships to is not worth an unshippable pipeline.
 *
 * x86_64 devices (Chrome OS, Intel tablets, emulators) are served the arm64-v8a
 * split and run it under ARM translation, which is what the great majority of
 * React Native apps already rely on.
 */
const ABIS = ['armeabi-v7a', 'arm64-v8a'];

const ABI_FILTERS_BLOCK = `
        ndk {
            // Managed by plugins/withAndroidAbiFilters.js -- see that file for why.
            abiFilters ${ABIS.map((a) => `"${a}"`).join(', ')}
        }
`;

const withAndroidAbiFilters = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'withAndroidAbiFilters: app/build.gradle is not groovy, cannot patch abiFilters'
      );
    }

    let contents = cfg.modResults.contents;

    // Idempotent: a second prebuild over the same tree must not stack blocks.
    if (contents.includes('withAndroidAbiFilters')) {
      return cfg;
    }

    // Anchor on the versionName line inside defaultConfig, which the Expo bare
    // template always emits, and insert immediately after it.
    const anchor = /(defaultConfig\s*\{[\s\S]*?versionName\s+["'][^"']*["'])/;
    if (!anchor.test(contents)) {
      throw new Error(
        'withAndroidAbiFilters: could not find defaultConfig/versionName in app/build.gradle'
      );
    }

    contents = contents.replace(anchor, `$1\n${ABI_FILTERS_BLOCK}`);
    cfg.modResults.contents = contents;
    return cfg;
  });

module.exports = withAndroidAbiFilters;
