import { test, expect } from 'bun:test';
import { COUNTRIES, DEFAULT_COUNTRY, findCountry } from './countries';

// Dialling codes are not unique. Before PRIMARY_BY_CODE existed, a code-only
// lookup returned whichever entry sorted first -- Canada for '+1', Guernsey for
// '+44', Kazakhstan for '+7' -- so a stored OTP session without `countryIso`
// restored the wrong country for three of the largest markets.
test('shared dialling codes resolve to their primary country', () => {
  expect(findCountry(undefined, '+1')?.iso).toBe('US');
  expect(findCountry(undefined, '+44')?.iso).toBe('GB');
  expect(findCountry(undefined, '+7')?.iso).toBe('RU');
});

test('ISO takes precedence over dialling code', () => {
  expect(findCountry('CA', '+1')?.iso).toBe('CA');
  expect(findCountry('JE', '+44')?.iso).toBe('JE');
});

test('unshared dialling codes are unaffected', () => {
  expect(findCountry(undefined, '+91')?.iso).toBe('IN');
  expect(findCountry(undefined, '+61')?.iso).toBe('AU');
  expect(findCountry(undefined, '+81')?.iso).toBe('JP');
});

test('unknown input yields undefined', () => {
  expect(findCountry(undefined, '+999')).toBeUndefined();
  expect(findCountry('ZZ')).toBeUndefined();
  expect(findCountry()).toBeUndefined();
});

test('every country entry is well formed', () => {
  const malformed = COUNTRIES.filter(
    (c) => !c.code.startsWith('+') || !/^[A-Z]{2}$/.test(c.iso) || !c.flag || !c.name,
  );
  expect(malformed).toHaveLength(0);
});

test('ISO codes are unique', () => {
  expect(new Set(COUNTRIES.map((c) => c.iso)).size).toBe(COUNTRIES.length);
});

// The picker once shipped four entries, which left users elsewhere unable to
// select their code and therefore unable to receive an OTP at all.
test('coverage spans every major market', () => {
  expect(COUNTRIES.length).toBeGreaterThan(200);
  for (const iso of ['US', 'GB', 'IN', 'NG', 'BR', 'ID', 'PK', 'PH', 'EG', 'VN', 'CN', 'RU', 'JP', 'DE']) {
    expect(findCountry(iso)?.iso).toBe(iso);
  }
});

test('default country is stable', () => {
  expect(DEFAULT_COUNTRY.iso).toBe('IN');
  expect(DEFAULT_COUNTRY.code).toBe('+91');
});
