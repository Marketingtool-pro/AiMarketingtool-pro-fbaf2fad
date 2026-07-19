const { withProjectBuildGradle, withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Only genuinely-additive settings get defaults. Toolchain VERSION PINS
// deliberately have none — see the note below.
const DEFAULTS = {
  crashlyticsVersion: '3.0.3',
  googleServicesVersion: '4.4.2'
};

/**
 * Android build.gradle + Gradle wrapper fixes.
 * Adds the Crashlytics/google-services classpaths, 16 KB page-size alignment,
 * and the Kotlin metadata-version escape hatch for AdMob.
 *
 * TOOLCHAIN VERSIONS ARE NOT PINNED HERE ANY MORE.
 *
 * This plugin is registered in app.json as a bare string, so it received no
 * options and silently applied its own defaults — which contradicted
 * expo-build-properties, the authoritative source in the same app.json:
 *
 *     this plugin's old defaults   expo-build-properties (app.json)
 *     kotlin        2.1.20         2.3.0   <- commit 15a7c34f9c bumped it
 *     AGP           8.7.2          needs >= 8.9 to accept compileSdk 36
 *     compileSdk    35 (injected)  36
 *     targetSdk     35 (injected)  36
 *     androidx.core 1.15.0 (pin)   compileSdk 36 needs >= 1.16
 *
 * Whichever ran last won, so the Kotlin bump never actually took effect and
 * AGP 8.7.2 was handed a compileSdk it cannot compile. Version pins are now
 * OPT-IN: pass them explicitly if you ever need them, otherwise
 * expo-build-properties governs the toolchain on its own.
 */
const withKotlinKspFix = (config, options) => {
  const opts = { ...DEFAULTS, ...(options || {}) };
  const { 
    kotlinVersion, kspVersion, agpVersion, 
    googlePlayServicesVersion, gradleVersion,
    crashlyticsVersion, googleServicesVersion
  } = opts;

  // 1. Project-level build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    let buildGradle = config.modResults.contents;

    // 🚨 CRITICAL FIX: Remove supportLibVersion from line 1
    buildGradle = buildGradle.replace(/^supportLibVersion\s*=\s*["'].*["']\s*/m, '');

    // Never inject compileSdk/targetSdk/buildTools here — expo-build-properties
    // already sets them from app.json, and hardcoding 35 downgraded the 36 build.
    const varsToEnsure = [
      kotlinVersion && { name: 'kotlinVersion', value: `'${kotlinVersion}'` },
      kspVersion && { name: 'kspVersion', value: `'${kspVersion}'` },
      googlePlayServicesVersion && { name: 'googlePlayServicesVersion', value: `"${googlePlayServicesVersion}"` },
    ].filter(Boolean);

    const missing = varsToEnsure.filter(v => !new RegExp(`\\b${v.name}\\s*=`).test(buildGradle));

    if (missing.length > 0) {
      const injectedLines = missing.map(v => `        ${v.name} = ${v.value}`).join('\n');
      if (/ext\s*\{/.test(buildGradle)) {
        buildGradle = buildGradle.replace(/ext\s*\{/, `ext {\n${injectedLines}`);
      } else {
        buildGradle = buildGradle.replace(/buildscript\s*\{/, `ext {\n${injectedLines}\n}\n\nbuildscript {`);
      }
    }

    // AGP override — opt-in only. Forcing 8.7.2 here made compileSdk 36 unbuildable.
    if (agpVersion && !buildGradle.includes(`com.android.tools.build:gradle:${agpVersion}`)) {
        buildGradle = buildGradle.replace(
            /classpath\s*(?:\(\s*)?['"]com\.android\.tools\.build:gradle(?::[^'"]*)?['"]\s*\)?/g,
            `classpath("com.android.tools.build:gradle:${agpVersion}")`
        );
    }

    // Rewrite Kotlin gradle-plugin classpath
    if (kotlinVersion && !buildGradle.includes(`org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}`)) {
      buildGradle = buildGradle.replace(
        /classpath\s*(?:\(\s*)?['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]*)?['"]\s*\)?/g,
        `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")`
      );
    }

    // 🚨 Crashlytics Classpath FIX
    if (!buildGradle.includes('com.google.firebase:firebase-crashlytics-gradle')) {
        buildGradle = buildGradle.replace(
          /dependencies\s*\{/,
          `dependencies {
        classpath 'com.google.firebase:firebase-crashlytics-gradle:${crashlyticsVersion}'`
        );
    }
    if (!buildGradle.includes('com.google.gms:google-services')) {
        buildGradle = buildGradle.replace(
          /dependencies\s*\{/,
          `dependencies {
        classpath 'com.google.gms:google-services:${googleServicesVersion}'`
        );
    }

    // androidx.core 1.15.0 / activity 1.10.1 / browser 1.8.0 were pinned for
    // compileSdk 35. They are NOT compatible with compileSdk 36, so the pins are
    // gone. Kotlin/KSP alignment only runs when versions are explicitly passed.
    const alignments = [];
    if (kotlinVersion) {
      alignments.push(`            if (requested.group == 'org.jetbrains.kotlin' && requested.name.startsWith('kotlin-')) {
                details.useVersion '${kotlinVersion}'
            }`);
    }
    if (kspVersion) {
      alignments.push(`            if (requested.group == 'com.google.devtools.ksp') {
                details.useVersion '${kspVersion}'
            }`);
    }
    const resolutionStrategyBlock = alignments.length ? `
allprojects {
    configurations.all {
        resolutionStrategy.eachDependency { DependencyResolveDetails details ->
            def requested = details.requested
${alignments.join('\n')}
        }
    }
}
` : '';

    if (resolutionStrategyBlock && !buildGradle.includes('resolutionStrategy.eachDependency')) {
      buildGradle += resolutionStrategyBlock;
    }

    // 🚨 AdMob fix: react-native-google-mobile-ads@16.4.0 pulls play-services-ads:25.4.0,
    // which Google compiled with Kotlin 2.3.0 metadata. Our pinned Kotlin 2.1.20 can't read
    // newer metadata -> ':react-native-google-mobile-ads:compileReleaseKotlin' FAILED.
    // Skip the metadata-version check globally so the 2.1.20 compiler consumes the newer
    // AAR (lower risk than bumping the whole toolchain to bleeding-edge Kotlin 2.3.0).
    if (!buildGradle.includes('skip-metadata-version-check')) {
      buildGradle += `
allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += ["-Xskip-metadata-version-check"]
        }
    }
}
`;
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  // 2. App-level build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    let contents = config.modResults.contents;

    // Apply plugins
    if (!contents.includes("apply plugin: 'com.google.gms.google-services'")) {
      contents += "\napply plugin: 'com.google.gms.google-services'";
    }
    if (!contents.includes("apply plugin: 'com.google.firebase.crashlytics'")) {
      contents += "\napply plugin: 'com.google.firebase.crashlytics'";
    }

    // 🚨 16 KB page size alignment fix
    if (!contents.includes("useLegacyPackaging = false")) {
      contents = contents.replace(
        /android\s*\{/,
        `android {
    packagingOptions {
        jniLibs {
            useLegacyPackaging = false
        }
    }`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  // 3. Gradle Wrapper
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const wrapperPath = path.join(projectRoot, 'gradle', 'wrapper', 'gradle-wrapper.properties');
      // Opt-in: pinning Gradle 8.13 conflicts with the wrapper Expo/RN ships.
      if (gradleVersion && fs.existsSync(wrapperPath)) {
        let content = fs.readFileSync(wrapperPath, 'utf8');
        const lines = content.split('\n');
        const updatedLines = lines.map(line => {
          if (line.startsWith('distributionUrl=')) {
            return `distributionUrl=https\\://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip`;
          }
          return line;
        });
        fs.writeFileSync(wrapperPath, updatedLines.join('\n'));
      }
      return config;
    },
  ]);

  return config;
};

module.exports = withKotlinKspFix;
