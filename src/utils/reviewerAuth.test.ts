import { test, expect, describe } from 'bun:test';
import { pbkdf2Sync } from 'node:crypto';
import {
  REVIEWER_PBKDF2_ITERATIONS,
  deriveReviewerKey,
  isReviewerLogin,
  parseReviewerKeys,
} from './reviewerAuth';

const SALT = '00112233445566778899aabbccddeeff';
// Independent reference: Node's native PBKDF2 must agree with the app's.
const nodeKey = (password: string, salt = SALT) =>
  pbkdf2Sync(password, Buffer.from(salt, 'hex'), REVIEWER_PBKDF2_ITERATIONS, 32, 'sha256').toString('hex');

describe('parseReviewerKeys', () => {
  test('keeps well-formed salt:key entries, lowercased', () => {
    const key = nodeKey('x');
    expect(parseReviewerKeys(` ${SALT}:${key.toUpperCase()} , plain-password, ${SALT},`)).toEqual([
      { salt: SALT, key },
    ]);
  });

  test('returns empty for missing input', () => {
    expect(parseReviewerKeys(undefined)).toEqual([]);
    expect(parseReviewerKeys('')).toEqual([]);
  });
});

describe('reviewer key derivation', () => {
  test('matches Node PBKDF2-SHA256', async () => {
    expect(await deriveReviewerKey('Review-Pass-1', SALT)).toBe(nodeKey('Review-Pass-1'));
  });
});

describe('isReviewerLogin', () => {
  const keys = [{ salt: SALT, key: nodeKey('Review-Pass-1') }];

  test('accepts the reviewer email and password, ignoring case and whitespace', async () => {
    expect(await isReviewerLogin('  Demo@MarketingTool.pro ', ' Review-Pass-1 ', keys)).toBe(true);
  });

  test('rejects a wrong password', async () => {
    expect(await isReviewerLogin('demo@marketingtool.pro', 'review-pass-1', keys)).toBe(false);
  });

  test('rejects another email with the right password', async () => {
    expect(await isReviewerLogin('someone@marketingtool.pro', 'Review-Pass-1', keys)).toBe(false);
  });

  test('is disabled when no keys are configured', async () => {
    expect(await isReviewerLogin('demo@marketingtool.pro', 'Review-Pass-1', [])).toBe(false);
  });
});
