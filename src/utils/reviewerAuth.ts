// App Store / Play reviewer sign-in check. Pure (no react-native import) so it
// runs under `bun test`.
//
// Why hashes: every EXPO_PUBLIC_* value is inlined into the JS bundle, so a
// plain reviewer password there could be read by anyone who unpacks the app.
// The bundle now carries only SHA-256 hex digests of the password(s).

export const REVIEWER_EMAIL = 'demo@marketingtool.pro';

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Comma-separated SHA-256 hex digests; anything that is not a digest is dropped. */
export const parseReviewerHashes = (raw?: string | null): string[] =>
  (raw ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => SHA256_HEX.test(h));

/**
 * True when email/password are the reviewer's. Email is trimmed and lowercased
 * and the password trimmed, so autofill whitespace cannot defeat the match.
 */
export const isReviewerLogin = async (
  email: string,
  password: string,
  hashes: string[],
  sha256Hex: (value: string) => Promise<string>,
): Promise<boolean> => {
  if (hashes.length === 0) return false;
  if (email.trim().toLowerCase() !== REVIEWER_EMAIL) return false;
  const digest = (await sha256Hex(password.trim())).toLowerCase();
  return hashes.includes(digest);
};
