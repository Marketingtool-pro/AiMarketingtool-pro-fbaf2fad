const { withProjectBuildGradle, withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  googlePlayServicesVersion: '18.0.0',
  crashlyticsVersion: '3.0.8',
  googleServicesVersion: '4.5.0'
};

/**
 * Android build.gradle fixes for Expo SDK 58 / RN 0.88.
 *
 * Up to SDK 57 this plugin also pinned AGP 8.12.0, Gradle 8.13, Kotlin 2.1.20
 * and KSP 2.1.20 on every module, and rewrote the Gradle wrapper. RN 0.88's
 * gradle plugin needs AGP 9.2.1, which refuses to run below Gradle 9.4.1
 * ("Minimum supported Gradle version is 9.4.1. Current version is 8.13"), and
 * Kotlin 2.2 turns the old kotlinOptions DSL into an error. The Expo 58
 * template already ships the right toolchain (Gradle 9.4.1, AGP from RN's
 * version catalog, Kotlin/KSP from expo-build-properties in app.json), so
 * those pins were removed on 2026-11-03. What stays: the Crashlytics and
 * google-services classpaths and plugins, and 16 KB page-size packaging.
 */
const withKotlinKspFix = (config, options) => {
  const opts = { ...DEFAULTS, ...(options || {}) };
  const { googlePlayServicesVersion, crashlyticsVersion, googleServicesVersion } = opts;

  // 1. Project-level build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    let buildGradle = config.modResults.contents;

    buildGradle = buildGradle.replace(/^supportLibVersion\s*=\s*["'].*["']\s*/m, '');

    // Fallback only: expo-build-properties in app.json writes the SDK levels.
    if (!/\bgooglePlayServicesVersion\s*=/.test(buildGradle)) {
      const line = `        googlePlayServicesVersion = "${googlePlayServicesVersion}"`;
      buildGradle = /ext\s*\{/.test(buildGradle)
        ? buildGradle.replace(/ext\s*\{/, `ext {\n${line}`)
        : buildGradle.replace(/buildscript\s*\{/, `ext {\n${line}\n}\n\nbuildscript {`);
    }

    if (!buildGradle.includes('com.google.firebase:firebase-crashlytics-gradle')) {
      buildGradle = buildGradle.replace(
        /dependencies\s*\{/,
        `dependencies {\n        classpath 'com.google.firebase:firebase-crashlytics-gradle:${crashlyticsVersion}'`
      );
    }
    if (!buildGradle.includes('com.google.gms:google-services')) {
      buildGradle = buildGradle.replace(
        /dependencies\s*\{/,
        `dependencies {\n        classpath 'com.google.gms:google-services:${googleServicesVersion}'`
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  // 1b. Gradle JVM memory. The template's -Xmx2048m -XX:MaxMetaspaceSize=512m
  // made R8 (AGP 9 / SDK 58) die with "R8: java.lang.OutOfMemoryError:
  // Metaspace" in :app:minifyReleaseWithR8 on 2026-11-04.
  config = withGradleProperties(config, (config) => {
    const key = 'org.gradle.jvmargs';
    const value = '-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';
    const items = config.modResults.filter((i) => !(i.type === 'property' && i.key === key));
    items.push({ type: 'property', key, value });
    // EAS 'medium' Android workers have 4 vCPU / 15.6 GB. With SDK 58 the
    // Gradle daemon (4 GB via EAS GRADLE_OPTS), a Kotlin daemon that inherits
    // the same heap, and 4 parallel workers outgrew that: build 1080 died with
    // "Gradle build daemon disappeared unexpectedly" mid Kotlin compile.
    // Cap the Kotlin daemon and the worker count so the total fits.
    for (const [k, v] of [['kotlin.daemon.jvmargs', '-Xmx2048m -XX:MaxMetaspaceSize=768m'], ['org.gradle.workers.max', '3']]) {
      const i = items.findIndex((x) => x.type === 'property' && x.key === k);
      if (i >= 0) items[i].value = v; else items.push({ type: 'property', key: k, value: v });
    }
    config.modResults = items;
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
    if (!contents.includes("useLegacyPackaging = true")) {
      contents = contents.replace(
        /android\s*\{/,
        `android {
    packagingOptions {
        jniLibs {
            useLegacyPackaging = true
        }
    }`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withKotlinKspFix;
