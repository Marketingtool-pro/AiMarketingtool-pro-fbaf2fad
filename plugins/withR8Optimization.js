/**
 * withR8Optimization.js
 *
 * Answers Play Console's "Improve your app's memory and performance with R8
 * optimization" recommendation, which lists three separate findings:
 *
 *   1. "Optimization isn't enabled"
 *        The cause is the DEFAULT PROGUARD FILE, not any gradle flag. The Expo
 *        SDK 57 prebuild template (expo-template-bare-minimum@57.0.18,
 *        android/app/build.gradle) ships:
 *
 *          proguardFiles getDefaultProguardFile("proguard-android.txt"), …
 *
 *        That is the NON-optimized variant, and it carries `-dontoptimize`,
 *        which switches R8's optimization passes off wholesale — regardless of
 *        full mode. Google's R8 configuration guidance is explicit: the app
 *        module "MUST use the optimized default file
 *        (proguard-android-optimize.txt)". This plugin rewrites that line.
 *
 *        Note what is NOT the cause: `minifyEnabled` and `shrinkResources`
 *        were both already on (added 2026-08-11, nine days before 1.5.12 was
 *        cut), and R8 full mode has been the DEFAULT since AGP 8.0 with
 *        nothing in this repo or the template disabling it. An earlier version
 *        of this plugin blamed full mode; that was wrong, and setting
 *        `android.enableR8.fullMode=true` is a no-op here. The property is
 *        still written because Google's guidance is to ensure `=false` is not
 *        present, and stating `true` guards against a future template or
 *        library setting it — but it is not what fixes this finding.
 *
 *   2. "Optimized resource shrinking isn't enabled"
 *        `shrinkResources` (already on) uses the legacy resource shrinker,
 *        which only blanks unused resources' contents and leaves their table
 *        entries. `android.r8.optimizedResourceShrinking=true` (needed for AGP
 *        above 8.6 and below 9.0, where it is not yet the default)
 *        removes the entries outright and shrinks the resource table itself.
 *
 *   3. "Upgrade your Android Gradle plugin to version 9.0 or higher"
 *        NOT actionable here. AGP is chosen by the Expo SDK 57 prebuild
 *        template (AGP 8.x); pinning AGP 9 would desync it from the Gradle
 *        distribution, the React Native Gradle Plugin and every autolinked
 *        Expo module. This lands when Expo ships an SDK on AGP 9.
 *
 * Why a plugin and not app.json: expo-build-properties exposes no passthrough
 * for arbitrary gradle.properties keys (see its pluginConfig schema — only
 * compileSdkVersion / targetSdkVersion / minSdkVersion / kotlinVersion are
 * typed under `android`), so these two flags have to be written directly.
 *
 * Full mode is strictly more aggressive than compat mode about reflection.
 * The app's -keep set (app.json → extraProguardRules) already covers the
 * reflective consumers: React Native, Hermes, JNI, Expo modules, Firebase,
 * Play services/Billing and Appwrite. withR8FullModeKeeps below adds the
 * rules that only matter once full mode is on.
 */

const { withGradleProperties, withDangerousMod, withAppBuildGradle } =
  require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROPERTIES = [
  {
    key: 'android.enableR8.fullMode',
    value: 'true',
    comment:
      'Default since AGP 8.0; written explicitly so a future template or library ' +
      'cannot silently set it to false. NOT the fix for "Optimization isn\'t ' +
      'enabled" -- that is the proguard-android-optimize.txt swap below.',
  },
  {
    key: 'android.r8.optimizedResourceShrinking',
    value: 'true',
    comment:
      'Play Console "Optimized resource shrinking isn\'t enabled": removes unused ' +
      'entries from the resource table instead of only blanking their contents. ' +
      'Required explicitly for AGP above 8.6 and below 9.0.',
  },
];

// Rules that only become load-bearing under full mode. In compatibility mode R8
// keeps these implicitly; in full mode it does not.
const FULL_MODE_KEEPS = `
# ── R8 full mode (added by plugins/withR8Optimization.js) ────────────────────
# Full mode drops generic signatures and default constructors that compat mode
# retained implicitly. Everything below is only needed once fullMode=true.

# Kotlin reflection metadata — Expo modules and Nitro resolve names through it.
-keep class kotlin.Metadata { *; }
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-dontwarn kotlin.**

# Full mode strips no-arg constructors of classes only instantiated reflectively.
-keepclassmembers class * implements com.facebook.react.bridge.NativeModule {
    <init>(...);
}
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    <init>(...);
}

# react-native-iap / Nitro modules are looked up by name at runtime.
-keep class com.margelo.nitro.** { *; }
-dontwarn com.margelo.nitro.**

# Fresco + Glide decoders are wired reflectively by their registries.
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }
-dontwarn com.facebook.imagepipeline.**
-keep public class * extends com.bumptech.glide.module.AppGlideModule
-keep class com.bumptech.glide.** { *; }
-dontwarn com.bumptech.glide.**

# NOTE: no  -keep class * extends android.app.Activity  (or Service /
# BroadcastReceiver / ContentProvider) here on purpose. AAPT2 and R8 already
# keep every component declared in AndroidManifest.xml or referenced from XML
# layouts, and Google's R8 guidance lists those manual rules as a mistake to
# delete: they match components in every dependency too, pinning classes R8
# would otherwise shrink or merge -- working against the very finding this
# plugin exists to fix.
`;

// Swap the non-optimized default ProGuard file for the optimized one.
//
// getDefaultProguardFile("proguard-android.txt") pulls in `-dontoptimize`,
// which disables R8's optimization passes entirely. The "-optimize" variant is
// the same file without that directive. This is the change that actually
// answers Play Console's "Optimization isn't enabled".
//
// The template line is regenerated by every prebuild, so this has to be a mod
// rather than a one-time edit.
const NON_OPTIMIZED = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZED = 'getDefaultProguardFile("proguard-android-optimize.txt")';

function withOptimizedProguardFile(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes(OPTIMIZED)) {
      return config;
    }
    if (!contents.includes(NON_OPTIMIZED)) {
      // Fail loudly rather than silently shipping an unoptimized build: if the
      // template changes this line, the swap needs revisiting, and a quiet
      // no-op here would look exactly like success.
      console.warn(
        '[withR8Optimization] Could not find ' +
          NON_OPTIMIZED +
          ' in app/build.gradle. R8 optimization may still be disabled by ' +
          '-dontoptimize; check the proguardFiles line in the prebuild template.'
      );
      return config;
    }

    config.modResults.contents = contents.replace(NON_OPTIMIZED, OPTIMIZED);
    console.log(
      '[withR8Optimization] proguard-android.txt -> proguard-android-optimize.txt'
    );
    return config;
  });
}

function withR8GradleProperties(config) {
  return withGradleProperties(config, (config) => {
    for (const { key, value, comment } of PROPERTIES) {
      const existing = config.modResults.find(
        (item) => item.type === 'property' && item.key === key
      );
      if (existing) {
        existing.value = value;
        continue;
      }
      config.modResults.push({ type: 'comment', value: comment });
      config.modResults.push({ type: 'property', key, value });
    }
    return config;
  });
}

// expo-build-properties writes extraProguardRules into
// android/app/proguard-rules.pro during its own mod. Append after it so the
// full-mode keeps land in the same file rather than a second, unreferenced one.
function withR8FullModeKeeps(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const proguardFile = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      // Read first and react to the error, rather than existsSync() then
      // readFileSync(). Those are two syscalls with a gap between them in which
      // the file can vanish or be swapped -- the file-system race CodeQL flags.
      // The read is authoritative because it IS the operation being guarded.
      let contents;
      try {
        contents = fs.readFileSync(proguardFile, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(
            '[withR8Optimization] app/proguard-rules.pro not found; skipping full-mode keeps.'
          );
          return config;
        }
        throw error;
      }

      // Idempotence: the mod can run again on a prebuild that kept the file.
      if (contents.includes('withR8Optimization.js')) return config;

      try {
        fs.writeFileSync(proguardFile, `${contents.trimEnd()}\n${FULL_MODE_KEEPS}`);
      } catch (error) {
        // Failing loudly beats shipping a release build whose reflective
        // consumers were silently left without keep rules under R8 full mode.
        throw new Error(
          `[withR8Optimization] could not write ${proguardFile}: ${error.message}`
        );
      }
      console.log('[withR8Optimization] Appended R8 full-mode keep rules.');
      return config;
    },
  ]);
}

module.exports = function withR8Optimization(config) {
  config = withOptimizedProguardFile(config);
  config = withR8GradleProperties(config);
  config = withR8FullModeKeeps(config);
  return config;
};
