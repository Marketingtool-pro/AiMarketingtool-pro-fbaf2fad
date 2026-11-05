#!/usr/bin/env node
// Reads the build id from `eas build --json` output and prints it.
// Exits non-zero unless the output holds exactly one finished build for the
// expected platform with a valid UUID, so a release job never submits a build
// that this run did not produce.
//
// With --build-number it prints the build's appBuildVersion instead (the iOS
// buildNumber / Android versionCode that EAS set remotely), so a later step can
// find this same build in App Store Connect.
//
// Usage: node scripts/read-eas-build-id.js <eas-build.json> [ANDROID|IOS] [--build-number]

const fs = require('fs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Same format that scripts/lib/asc_safe_input.rb accepts for BUILD_NUMBER.
const BUILD_NUMBER = /^\d{1,10}(?:\.\d{1,10}){0,2}$/;

function readBuild(text, platform) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('eas build output is not valid JSON');
  }
  const builds = Array.isArray(parsed) ? parsed : [parsed];
  if (builds.length !== 1 || !builds[0] || typeof builds[0] !== 'object') {
    throw new Error(`expected exactly one build in eas output, found ${builds.length}`);
  }
  const b = builds[0];
  if (typeof b.id !== 'string' || !UUID.test(b.id)) {
    throw new Error(`build id is missing or not a UUID: ${JSON.stringify(b.id)}`);
  }
  if (b.platform !== platform) {
    throw new Error(`build ${b.id} is for ${b.platform}, expected ${platform}`);
  }
  if (b.status !== 'FINISHED') {
    throw new Error(`build ${b.id} status is ${b.status}, expected FINISHED`);
  }
  return b;
}

function readBuildId(text, platform = 'ANDROID') {
  return readBuild(text, platform).id;
}

function readBuildNumber(text, platform = 'ANDROID') {
  const b = readBuild(text, platform);
  if (typeof b.appBuildVersion !== 'string' || !BUILD_NUMBER.test(b.appBuildVersion)) {
    throw new Error(`build ${b.id} appBuildVersion is missing or invalid: ${JSON.stringify(b.appBuildVersion)}`);
  }
  return b.appBuildVersion;
}

module.exports = { readBuildId, readBuildNumber };

if (require.main === module) {
  const [file, platform, mode] = process.argv.slice(2);
  if (!file || (mode !== undefined && mode !== '--build-number')) {
    console.error('usage: read-eas-build-id.js <eas-build.json> [ANDROID|IOS] [--build-number]');
    process.exit(2);
  }
  const read = mode === '--build-number' ? readBuildNumber : readBuildId;
  try {
    console.log(read(fs.readFileSync(file, 'utf8'), platform));
  } catch (err) {
    console.error(`::error::${err.message}`);
    process.exit(1);
  }
}
