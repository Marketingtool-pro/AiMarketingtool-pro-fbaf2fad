#!/usr/bin/env node
/**
 * Fail CI when an installed native module's peerDependencies are not satisfied
 * by the rest of the tree.
 *
 * Why this exists: on 2026-08-22 a Dependabot minor bump moved
 * react-native-worklets 0.11.4 -> 0.12.1, which is outside the
 * `react-native-worklets` peer range declared by react-native-reanimated.
 * Nothing in CI compiles native code, so `Build and Test` stayed green while
 * every EAS build failed in Xcode with:
 *
 *   no member named 'executeSync' in 'worklets::WorkletRuntime'
 *
 * Peer ranges are exactly how these packages declare "our C++ must match", so
 * checking them catches that class of break in seconds instead of 20 minutes
 * into a native build.
 *
 * Scoped to the react-native / expo native packages on purpose: the JS
 * dependency tree has plenty of benign peer drift that would drown the signal.
 */
import { readFileSync } from 'node:fs';
import semver from 'semver';

const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url)));
const pkgs = lock.packages ?? {};

const isNative = (name) =>
  name.startsWith('react-native') ||
  name.startsWith('expo') ||
  name.startsWith('@react-native') ||
  name.startsWith('@expo/');

const versionOf = (name) => pkgs[`node_modules/${name}`]?.version;

const problems = [];

for (const [path, meta] of Object.entries(pkgs)) {
  if (!path.startsWith('node_modules/')) continue;
  const name = path.slice('node_modules/'.length);
  if (name.includes('/node_modules/')) continue; // nested copy, not the hoisted one
  if (!isNative(name)) continue;

  for (const [peer, range] of Object.entries(meta.peerDependencies ?? {})) {
    if (!isNative(peer)) continue;
    if (meta.peerDependenciesMeta?.[peer]?.optional) continue;

    const installed = versionOf(peer);
    if (!installed) continue; // peer not in the tree at all — not this check's job

    if (!semver.satisfies(installed, range, { includePrerelease: true })) {
      problems.push(
        `${name}@${meta.version} requires ${peer}@"${range}" but ${peer}@${installed} is installed`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error('Incompatible native peer dependencies:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    '\nThese packages ship coupled native code. Align them (usually to the ' +
      'versions the current Expo SDK pins) before merging, or the EAS build ' +
      'will fail at compile time.',
  );
  process.exit(1);
}

console.log('Native peer dependencies are consistent.');
