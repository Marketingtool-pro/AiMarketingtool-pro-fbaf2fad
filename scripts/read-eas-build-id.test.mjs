// Run: node --test scripts/read-eas-build-id.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'read-eas-build-id.js');
const { readBuildId } = createRequire(import.meta.url)(script);

const ID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const build = (over = {}) => ({ id: ID, platform: 'ANDROID', status: 'FINISHED', ...over });

test('returns the id of one finished android build', () => {
  assert.equal(readBuildId(JSON.stringify([build()])), ID);
  assert.equal(readBuildId(JSON.stringify(build())), ID);
});

test('rejects output that is not JSON, such as an error log', () => {
  assert.throws(() => readBuildId('Build failed\nsome-id ' + ID), /not valid JSON/);
  assert.throws(() => readBuildId(''), /not valid JSON/);
});

test('rejects a missing or invalid id', () => {
  assert.throws(() => readBuildId(JSON.stringify([build({ id: undefined })])), /missing or not a UUID/);
  assert.throws(() => readBuildId(JSON.stringify([build({ id: 'abc' })])), /missing or not a UUID/);
});

test('rejects zero or several builds', () => {
  assert.throws(() => readBuildId('[]'), /exactly one build/);
  assert.throws(() => readBuildId(JSON.stringify([build(), build()])), /exactly one build/);
});

test('rejects a failed build or a build for another platform', () => {
  assert.throws(() => readBuildId(JSON.stringify([build({ status: 'ERRORED' })])), /status is ERRORED/);
  assert.throws(() => readBuildId(JSON.stringify([build({ platform: 'IOS' })])), /is for IOS/);
});

test('CLI prints the id on success and exits 1 on a bad build', () => {
  const dir = mkdtempSync(join(tmpdir(), 'eas-id-'));
  const ok = join(dir, 'ok.json');
  const bad = join(dir, 'bad.json');
  writeFileSync(ok, JSON.stringify([build()]));
  writeFileSync(bad, JSON.stringify([build({ status: 'ERRORED' })]));
  assert.equal(execFileSync(process.execPath, [script, ok], { encoding: 'utf8' }).trim(), ID);
  const r = spawnSync(process.execPath, [script, bad], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
});
