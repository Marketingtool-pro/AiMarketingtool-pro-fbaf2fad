const fs = require('fs');
const path = require('path');

const wrapperPath = path.join(process.cwd(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');

// This script runs on eas-build-pre-install AND eas-build-post-install, i.e.
// AFTER config plugins have written android/. It therefore has the last word on
// the wrapper version, and it used to hardcode 8.13 -- which silently undid
// withAgp9's wrapper bump and made the build fail with:
//
//     Minimum supported Gradle version is 9.5.0. Current version is 8.13.
//
// AGP and Gradle have to move together, so the version lives in one place and
// withAgp9.js reads the same constant.
//
// 2026-11-04: Expo SDK 58 / RN 0.88 use AGP 9.2.1, which needs Gradle >= 9.4.1.
// The 8.13 default here made EAS Android build 1071 (1.5.23) fail with
// "Minimum supported Gradle version is 9.4.1. Current version is 8.13" even
// though local builds (no EAS hooks) passed. 9.4.1 is the Expo 58 template's.
const GRADLE_VERSION = process.env.GRADLE_WRAPPER_VERSION || '9.4.1';

try {
  // Read file directly. If it does not exist, it will throw an error to the catch block
  let content = fs.readFileSync(wrapperPath, 'utf8');
  console.log(`Patching Gradle wrapper to ${GRADLE_VERSION}...`);
  content = content.replace(/gradle-.*-bin\.zip/g, `gradle-${GRADLE_VERSION}-bin.zip`);
  fs.writeFileSync(wrapperPath, content);
  console.log('Successfully patched gradle-wrapper.properties');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('gradle-wrapper.properties not found, skipping patch.');
  } else {
    console.error('An unexpected error occurred:', error.message);
  }
}
