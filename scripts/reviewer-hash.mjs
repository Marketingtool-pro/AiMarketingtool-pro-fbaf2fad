#!/usr/bin/env node
// Prints one EXPO_PUBLIC_REVIEWER_PASSWORD_PBKDF2 entry ("<salt hex>:<key hex>")
// for the App Store / Play reviewer password. The password is read from stdin
// so it never lands in shell history:
//
//   node scripts/reviewer-hash.mjs        (type the password, then Enter)
//
// Iterations must match REVIEWER_PBKDF2_ITERATIONS in src/utils/reviewerAuth.ts.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITERATIONS = 65_536;

const rl = createInterface({ input: process.stdin, terminal: false });
rl.once('line', (line) => {
  rl.close();
  const password = line.trim();
  if (password.length < 16) {
    console.error('Use a random reviewer password of at least 16 characters.');
    process.exit(1);
  }
  const salt = randomBytes(16);
  const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  console.log(`${salt.toString('hex')}:${key.toString('hex')}`);
});
