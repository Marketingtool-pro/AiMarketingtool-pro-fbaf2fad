// App Store / Play reviewer sign-in check. Pure (no react-native import) so it
// runs under `bun test`.
//
// Every EXPO_PUBLIC_* value is inlined into the JS bundle, so the reviewer
// password must never be one. The bundle carries only salted PBKDF2-SHA256
// keys ("<salt hex>:<key hex>", comma-separated); a fast unsalted hash would
// let anyone who unpacks the app brute-force it offline.
// Generate an entry with: node scripts/reviewer-hash.mjs

import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

export const REVIEWER_EMAIL = 'demo@marketingtool.pro';
/** Must match scripts/reviewer-hash.mjs. */
export const REVIEWER_PBKDF2_ITERATIONS = 65_536;

export type ReviewerKey = { salt: string; key: string };

const ENTRY = /^([0-9a-f]{32,}):([0-9a-f]{64})$/;

/** "<salt hex>:<key hex>" entries; anything malformed is dropped. */
export const parseReviewerKeys = (raw?: string | null): ReviewerKey[] =>
  (raw ?? '')
    .split(',')
    .map((e) => ENTRY.exec(e.trim().toLowerCase()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ salt: m[1], key: m[2] }));

export const deriveReviewerKey = async (password: string, saltHex: string): Promise<string> =>
  bytesToHex(
    await pbkdf2Async(sha256, password, hexToBytes(saltHex), {
      c: REVIEWER_PBKDF2_ITERATIONS,
      dkLen: 32,
    }),
  );

const sameHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/**
 * True when email/password are the reviewer's. Email is trimmed and lowercased
 * and the password trimmed, so autofill whitespace cannot defeat the match.
 * The slow key derivation only runs for the reviewer email.
 */
export const isReviewerLogin = async (
  email: string,
  password: string,
  keys: ReviewerKey[],
): Promise<boolean> => {
  if (keys.length === 0) return false;
  if (email.trim().toLowerCase() !== REVIEWER_EMAIL) return false;
  for (const { salt, key } of keys) {
    if (sameHex(await deriveReviewerKey(password.trim(), salt), key)) return true;
  }
  return false;
};
