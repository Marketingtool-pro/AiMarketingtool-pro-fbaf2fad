import { test, expect, describe } from 'bun:test';
import { createHash } from 'node:crypto';
import { isReviewerLogin, parseReviewerHashes } from './reviewerAuth';

const sha256Hex = async (v: string) => createHash('sha256').update(v).digest('hex');
const hashOf = (v: string) => createHash('sha256').update(v).digest('hex');

describe('parseReviewerHashes', () => {
  test('keeps only 64-char hex digests, lowercased', () => {
    const a = hashOf('one');
    const b = hashOf('two').toUpperCase();
    expect(parseReviewerHashes(` ${a} , ${b},plain-password,`)).toEqual([a, b.toLowerCase()]);
  });

  test('returns empty for missing input', () => {
    expect(parseReviewerHashes(undefined)).toEqual([]);
    expect(parseReviewerHashes('')).toEqual([]);
  });
});

describe('isReviewerLogin', () => {
  const hashes = [hashOf('Review-Pass-1')];

  test('accepts the reviewer email and password, ignoring case and whitespace', async () => {
    expect(await isReviewerLogin('  Demo@MarketingTool.pro ', ' Review-Pass-1 ', hashes, sha256Hex)).toBe(true);
  });

  test('rejects a wrong password', async () => {
    expect(await isReviewerLogin('demo@marketingtool.pro', 'review-pass-1', hashes, sha256Hex)).toBe(false);
  });

  test('rejects another email with the right password', async () => {
    expect(await isReviewerLogin('someone@marketingtool.pro', 'Review-Pass-1', hashes, sha256Hex)).toBe(false);
  });

  test('is disabled when no hashes are configured', async () => {
    expect(await isReviewerLogin('demo@marketingtool.pro', 'Review-Pass-1', [], sha256Hex)).toBe(false);
  });
});
