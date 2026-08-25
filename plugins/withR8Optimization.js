/**
 * withR8Optimization.js
 *
 * Answers Play Console's "Improve your app's memory and performance with R8
 * optimization" recommendation, which lists three separate findings:
 *
 *   1. "Optimization isn't enabled"
 *        `minifyEnabled` (already on via expo-build-properties'
 *        enableProguardInReleaseBuilds) only turns on R8's *shrinking* +
 *        obfuscation in COMPATIBILITY mode, where R8 deliberately emulates
 *        ProGuard and skips its own optimizations. Play reads the R8 marker
 *        embedded in the DEX and reports compat mode as "not optimized".
 *        R8 full mode — `android.enableR8.fullMode=true` — is what actually
 *        enables inlining, class merging, and devirtualization.
 *
 *   2. "Optimized resource shrinking isn't enabled"
 *        `shrinkResources` (already on) uses the legacy resource shrinker,
 *        which only blanks unused resources' contents and leaves their table
 *        entries. `android.r8.optimizedResourceShrinking=true` (AGP 8.7+)
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

const { withGradleProperties, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROPERTIES = [
  {
    key: 'android.enableR8.fullMode',
    value: 'true',
    comment:
      'Play Console "Optimization isn\'t enabled": minifyEnabled alone runs R8 in ' +
      'ProGuard-compatibility mode, which skips R8\'s own optimization passes.',
  },
  {
    key: 'android.r8.optimizedResourceShrinking',
    value: 'true',
    comment:
      'Play Console "Optimized resource shrinking isn\'t enabled": removes unused ' +
      'entries from the resource table instead of only blanking their contents.',
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

# Full mode's class merging can break AndroidX' reflective Fragment/Activity
# instantiation when a class is only ever referenced from a manifest string.
-keep class * extends android.app.Activity
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver
-keep class * extends android.content.ContentProvider
`;

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
    async (config) => {
      const proguardFile = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      if (!fs.existsSync(proguardFile)) {
        console.warn(
          '[withR8Optimization] app/proguard-rules.pro not found; skipping full-mode keeps.'
        );
        return config;
      }
      const contents = fs.readFileSync(proguardFile, 'utf8');
      if (contents.includes('withR8Optimization.js')) return config;
      fs.writeFileSync(proguardFile, `${contents.trimEnd()}\n${FULL_MODE_KEEPS}`);
      console.log('[withR8Optimization] Appended R8 full-mode keep rules.');
      return config;
    },
  ]);
}

module.exports = function withR8Optimization(config) {
  config = withR8GradleProperties(config);
  config = withR8FullModeKeeps(config);
  return config;
};
