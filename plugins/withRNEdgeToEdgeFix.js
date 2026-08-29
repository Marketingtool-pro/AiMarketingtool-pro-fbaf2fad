/**
 * withRNEdgeToEdgeFix.js
 *
 * Expo config plugin that wires the generated Android project to use a patched
 * react-android AAR in which the deprecated Android 15 edge-to-edge APIs
 * flagged by Play Console vitals -- Window.setStatusBarColor,
 * Window.getStatusBarColor and Window.setNavigationBarColor -- are reached
 * through reflection rather than a direct call.
 *
 * Reflection rather than deletion is the point: Play scans for the STATIC
 * bytecode reference, so a runtime `SDK_INT < 35` guard does not clear the
 * warning, while deleting the calls outright would change behaviour on API
 * < 35 where those setters are still the only way to get transparent system
 * bars. See android-patches/src/main/kotlin/... for the forked sources.
 *
 * Strategy:
 *  - Downloads the patched AAR + POM from this repo's GitHub Releases
 *    (tag react-android-<PATCHED_VERSION>) into android/local-aar/.
 *  - Normalizes the downloaded POM: packaging must be "aar" (the released POM
 *    says "pom", which makes Gradle treat the module as metadata-only — no
 *    classes — so subprojects like datetimepicker/lottie fail to compile
 *    against com.facebook.react), and <optional>true</optional> must be
 *    stripped so transitives (fbjni, soloader, fresco, okhttp…) flow to
 *    consumers. The release has no Gradle module metadata, so the POM is the
 *    single source of truth for resolution.
 *  - Adds local-aar as a plain Maven repo.
 *  - Uses resolutionStrategy.dependencySubstitution to redirect ALL
 *    react-android requests to PATCHED_VERSION, which lives exclusively in
 *    local-aar.
 *
 * Why dependencySubstitution instead of force/exclusiveContent:
 *  - RNGP (React Native Gradle Plugin) calls force("com.facebook.react:react-android:<npm version>")
 *    on every project configuration. In Gradle 7.4+, dependencySubstitution takes
 *    precedence over force(), so our substitution wins across ALL subprojects.
 *  - exclusiveContent in allprojects{} has known issues in Gradle 8.x (silent failures).
 *  - The -e2e.* versions are never in Maven Central → no Gradle cache collision risk.
 *
 * No EAS secrets required — the GitHub Release is publicly downloadable.
 */

const { withDangerousMod, withProjectBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const PATCHED_VERSION = '0.86.2-e2e.1';
const PATCHED_AAR_URL =
  'https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/releases/download/' +
  `react-android-${PATCHED_VERSION}/react-android-${PATCHED_VERSION}.aar`;
const PATCHED_POM_URL =
  'https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/releases/download/' +
  `react-android-${PATCHED_VERSION}/react-android-${PATCHED_VERSION}.pom`;
const GRADLE_SENTINEL = '// withRNEdgeToEdgeFix:allprojects-block';

// SHA-256 digests of the assets attached to release tag
// react-android-0.86.2-e2e.1, computed from the published files.
// Regenerate by re-running .github/workflows/patch-react-android.yml --
// its "Publish asset checksums" step prints these three lines verbatim.
//
// MUST track package.json's react-native version. Substituting a react-android
// whose version differs from the JS runtime pairs mismatched native/JS halves.
// This drifted once: the 0.86.2-e2e.1 AAR was published 2026-08-25 but this
// file still pinned 0.85.3-e2e.2, so every build after the RN 0.86.2 upgrade
// (2026-08-20) shipped 0.85.3 native under 0.86.2 JS.
const PATCHED_AAR_SHA256 = 'a924d541d73da1d18a987a82e37cafe0d10deb5ffe944aefc166fe992c106c47';
const PATCHED_POM_SHA256 = '4b6d3d38ff91440b43a7c4041202a57a8f5b209f68cca825adcd0ee20ff28dc5';

const LOCAL_AAR_SUBDIR = path.join(
  'local-aar', 'com', 'facebook', 'react', 'react-android', PATCHED_VERSION
);

// Rewrites the released POM so Gradle resolves the AAR correctly:
//  - packaging "pom" → "aar" (pom-only modules ship no artifact at all)
//  - drop <optional>true</optional> so compile-scope deps stay transitive
// Idempotent: a no-op once the POM is already normalized (or fixed upstream).
function normalizePom(pomFile) {
  let pom = fs.readFileSync(pomFile, 'utf8');
  const before = pom;
  pom = pom.replace('<packaging>pom</packaging>', '<packaging>aar</packaging>');
  pom = pom.replace(/^\s*<optional>true<\/optional>\r?\n/gm, '');
  if (pom !== before) {
    fs.writeFileSync(pomFile, pom);
    console.log('[withRNEdgeToEdgeFix] Normalized POM (packaging=aar, transitive deps enabled).');
  }
}

// dependencySubstitution takes precedence over force() in Gradle 7.4+.
// This also applies to newer Gradle versions (for example, 8.13).
// This overrides RNGP's force("com.facebook.react:react-android:<npm version>") and
// redirects all react-android requests to our patched version in local-aar.
const ALL_PROJECTS_BLOCK = `
allprojects {
    // ── Patched react-android: Android 15 edge-to-edge deprecated API fix ──
    repositories {
        maven { url = new File(rootDir, "local-aar").toURI() }
    }
    configurations.all {
        resolutionStrategy.dependencySubstitution {
            // Gradle 7.4+: substitution takes precedence over force() rules.
            // Catches any-version react-android and pins it to our patched build.
            substitute module("com.facebook.react:react-android") using module("com.facebook.react:react-android:${PATCHED_VERSION}")
        }
    }
}`;

function downloadToFile(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        const redirectUrl = response.headers.location;
        response.resume();
        if (!redirectUrl.startsWith('https://')) {
          return reject(
            new Error(
              `Refusing insecure redirect for ${url}: ${redirectUrl}`
            )
          );
        }
        return resolve(downloadToFile(redirectUrl, destination));
      }

      if (response.statusCode !== 200) {
        response.resume();
        return reject(
          new Error(
            `Failed to download ${url}: HTTP ${response.statusCode}`
          )
        );
      }

      const fileStream = fs.createWriteStream(destination);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });

      fileStream.on('error', (err) => {
        fs.unlink(destination, () => reject(err));
      });
    });

    request.on('error', (err) => {
      fs.unlink(destination, () => reject(err));
    });
  });
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function isFileValid(filePath, expectedSha256) {
  if (!fs.existsSync(filePath)) return false;
  try {
    return sha256File(filePath) === expectedSha256;
  } catch {
    return false;
  }
}

// The patched AAR is built from one specific react-native release, and the
// dependencySubstitution below redirects EVERY com.facebook.react:react-android
// request to it. If the installed react-native is a different release, that
// silently pairs a mismatched native library with the JS runtime: the C++ of
// every other native module then compiles and links against the wrong JSI.
//
// That is not theoretical. PATCHED_VERSION stayed at 0.85.3-e2e.2 after
// react-native moved to 0.86.2, and every Android build failed:
//
//   expo-modules-core/.../NativeArrayBuffer.cpp:60:36: error: no member named
//     'tryGetMutableBuffer' in 'facebook::jsi::ArrayBuffer'
//   ld.lld: error: undefined symbol: facebook::jsi::JSError::JSError(...)
//     (~16 more undefined facebook::jsi::* symbols, from react-native-skia)
//
// So refuse to substitute unless the patch actually matches the installed
// react-native. Skipping only brings back the deprecated Android 15 edge-to-edge
// calls as Play Console vitals warnings; substituting anyway breaks the build
// outright. To re-enable, publish an AAR for the current react-native and bump
// PATCHED_VERSION (see .github/workflows/patch-react-android.yml, whose
// REACT_VERSION also needs bumping).
function installedReactNativeVersion() {
  try {
    return require('react-native/package.json').version;
  } catch {
    return null;
  }
}

function patchMatchesInstalledReactNative() {
  const installed = installedReactNativeVersion();
  if (!installed) return false;
  // PATCHED_VERSION looks like "0.85.3-e2e.2"; compare the react-native part.
  return PATCHED_VERSION.split('-')[0] === installed;
}

module.exports = function withRNEdgeToEdgeFix(config) {
  if (!patchMatchesInstalledReactNative()) {
    console.warn(
      `[withRNEdgeToEdgeFix] SKIPPED: patched AAR is for react-native ` +
        `${PATCHED_VERSION.split('-')[0]} but react-native ` +
        `${installedReactNativeVersion() ?? 'unknown'} is installed. ` +
        `Substituting would build against the wrong JSI and fail the Android ` +
        `link. Publish a matching AAR and bump PATCHED_VERSION to re-enable.`
    );
    return config;
  }

  // 1. Download patched AAR + POM into android/local-aar/ during prebuild.
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const androidDir = config.modRequest.platformProjectRoot;
      const localAarDir = path.join(androidDir, LOCAL_AAR_SUBDIR);
      const aarFile = path.join(localAarDir, `react-android-${PATCHED_VERSION}.aar`);
      const pomFile = path.join(localAarDir, `react-android-${PATCHED_VERSION}.pom`);

      fs.mkdirSync(localAarDir, { recursive: true });

      if (!isFileValid(aarFile, PATCHED_AAR_SHA256)) {
        console.log('[withRNEdgeToEdgeFix] Downloading patched react-android AAR (~140 MB)...');
        await downloadToFile(PATCHED_AAR_URL, aarFile);
        if (!isFileValid(aarFile, PATCHED_AAR_SHA256)) {
          throw new Error('[withRNEdgeToEdgeFix] Downloaded AAR checksum mismatch.');
        }
        console.log(`[withRNEdgeToEdgeFix] AAR saved to ${aarFile}`);
      } else {
        console.log('[withRNEdgeToEdgeFix] Patched AAR already present and valid, skipping download.');
      }

      if (!isFileValid(pomFile, PATCHED_POM_SHA256)) {
        console.log('[withRNEdgeToEdgeFix] Downloading patched react-android POM...');
        await downloadToFile(PATCHED_POM_URL, pomFile);
        if (!isFileValid(pomFile, PATCHED_POM_SHA256)) {
          throw new Error('[withRNEdgeToEdgeFix] Downloaded POM checksum mismatch.');
        }
        console.log('[withRNEdgeToEdgeFix] POM saved.');
      } else {
        console.log('[withRNEdgeToEdgeFix] Patched POM already present and valid, skipping download.');
      }

      normalizePom(pomFile);

      return config;
    },
  ]);

  // 2. Append dependencySubstitution allprojects{} block to root build.gradle.
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(GRADLE_SENTINEL)) return config;
    config.modResults.contents =
      `${contents.trimEnd()}\n${GRADLE_SENTINEL}\n${ALL_PROJECTS_BLOCK}\n`;
    return config;
  });

  return config;
};
