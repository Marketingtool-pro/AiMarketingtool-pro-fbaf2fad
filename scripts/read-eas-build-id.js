#!/usr/bin/env node
// Reads the build id from `eas build --json` output and prints it.
// Exits non-zero unless the output holds exactly one finished build for the
// expected platform with a valid UUID, so a release job never submits a build
// that this run did not produce.
//
// Usage: node scripts/read-eas-build-id.js <eas-build.json> [ANDROID|IOS]

const fs = require('fs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readBuildId(text, platform = 'ANDROID') {
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
  return b.id;
}

module.exports = { readBuildId };

if (require.main === module) {
  const [file, platform] = process.argv.slice(2);
  if (!file) {
    console.error('usage: read-eas-build-id.js <eas-build.json> [ANDROID|IOS]');
    process.exit(2);
  }
  try {
    console.log(readBuildId(fs.readFileSync(file, 'utf8'), platform));
  } catch (err) {
    console.error(`::error::${err.message}`);
    process.exit(1);
  }
}
