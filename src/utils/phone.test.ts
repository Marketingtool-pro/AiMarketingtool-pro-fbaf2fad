import { test, expect, describe } from 'bun:test';
import { normalizePhone, isE164 } from './phone';
import { COUNTRIES, findCountry, DEFAULT_COUNTRY } from '../constants/countries';

const IN = findCountry('IN')!;
const US = findCountry('US')!;
const CA = findCountry('CA')!;
const GB = findCountry('GB')!;

describe('country data', () => {
  test('has a real country list, not the old 4-entry stub', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
  });

  test('iso2 is unique — it is the identity key', () => {
    const seen = new Set(COUNTRIES.map(c => c.iso2));
    expect(seen.size).toBe(COUNTRIES.length);
  });

  test('dialCode is NOT unique, which is why iso2 keying matters', () => {
    expect(US.dialCode).toBe('+1');
    expect(CA.dialCode).toBe('+1');
    expect(US.iso2).not.toBe(CA.iso2);
  });

  test('findCountry resolves US and Canada distinctly', () => {
    expect(findCountry('CA')!.name).toBe('Canada');
    expect(findCountry('US')!.name).toBe('United States');
    expect(findCountry('ca')!.name).toBe('Canada'); // case-insensitive
  });

  test('default country is India', () => {
    expect(DEFAULT_COUNTRY.iso2).toBe('IN');
  });

  test('every entry has a dial code and a flag', () => {
    for (const c of COUNTRIES) {
      expect(c.dialCode).toMatch(/^\+\d{1,4}$/);
      expect(c.flag.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });
});

describe('India — the reported OTP failure', () => {
  test('plain 10-digit number', () => {
    expect(normalizePhone(IN, '9876543210').e164).toBe('+919876543210');
  });

  test('trunk zero is stripped (the actual India bug)', () => {
    expect(normalizePhone(IN, '09876543210').e164).toBe('+919876543210');
  });

  test('duplicated country code is collapsed', () => {
    expect(normalizePhone(IN, '919876543210').e164).toBe('+919876543210');
  });

  test('pasted full international number', () => {
    expect(normalizePhone(IN, '+919876543210').e164).toBe('+919876543210');
  });

  test('spaces and punctuation are ignored', () => {
    expect(normalizePhone(IN, '98765 43210').e164).toBe('+919876543210');
    expect(normalizePhone(IN, '98765-43210').e164).toBe('+919876543210');
    expect(normalizePhone(IN, '(98765) 43210').e164).toBe('+919876543210');
  });

  test('trunk zero AND country code together', () => {
    expect(normalizePhone(IN, '9109876543210').e164).toBe('+919876543210');
  });

  test('an Indian number that legitimately starts with 91 is not corrupted', () => {
    // 9198765432 is a valid 10-digit national number beginning "91".
    // The duplicate-CC fixup must not strip it, because the literal reading
    // already validates.
    expect(normalizePhone(IN, '9198765432').e164).toBe('+919198765432');
  });

  test('too short is rejected before any network call', () => {
    const r = normalizePhone(IN, '98765');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('India');
    expect(r.error).toContain('10 digits');
  });

  test('too long is rejected', () => {
    expect(normalizePhone(IN, '98765432109999').valid).toBe(false);
  });

  test('empty input is rejected', () => {
    expect(normalizePhone(IN, '').valid).toBe(false);
    expect(normalizePhone(IN, '   ').valid).toBe(false);
  });
});

describe('other countries', () => {
  test('US 10-digit', () => {
    expect(normalizePhone(US, '4155552671').e164).toBe('+14155552671');
  });

  test('US with 1- prefix typed in', () => {
    expect(normalizePhone(US, '14155552671').e164).toBe('+14155552671');
  });

  test('US formatted the way Americans write it', () => {
    expect(normalizePhone(US, '(415) 555-2671').e164).toBe('+14155552671');
  });

  test('Canada keeps its own identity despite sharing +1', () => {
    expect(normalizePhone(CA, '6045552671').e164).toBe('+16045552671');
  });

  test('UK trunk zero', () => {
    expect(normalizePhone(GB, '07911123456').e164).toBe('+447911123456');
    expect(normalizePhone(GB, '7911123456').e164).toBe('+447911123456');
  });

  test('a spread of countries across continents', () => {
    const cases: Array<[string, string, string]> = [
      ['JP', '9012345678', '+819012345678'],
      ['BR', '11987654321', '+5511987654321'],
      ['NG', '8031234567', '+2348031234567'],
      ['DE', '15123456789', '+4915123456789'],
      ['AU', '412345678', '+61412345678'],
      ['ZA', '821234567', '+27821234567'],
      ['SG', '81234567', '+6581234567'],
      ['AE', '501234567', '+971501234567'],
    ];
    for (const [iso2, input, expected] of cases) {
      const c = findCountry(iso2)!;
      expect(normalizePhone(c, input).e164).toBe(expected);
    }
  });

  test('pasting another country number overrides the picker', () => {
    // India selected, but the user pasted a UK number.
    expect(normalizePhone(IN, '+447911123456').e164).toBe('+447911123456');
  });

  test('countries without explicit length rules still validate generically', () => {
    const np = findCountry('NP')!; // no minLen/maxLen configured
    expect(normalizePhone(np, '9812345678').valid).toBe(true);
    expect(normalizePhone(np, '1').valid).toBe(false);
  });
});

describe('isE164', () => {
  test('accepts well-formed E.164', () => {
    expect(isE164('+919876543210')).toBe(true);
    expect(isE164('+14155552671')).toBe(true);
  });

  test('accepts shape-valid E.164 (syntax only, not semantic correctness)', () => {
    // isE164 validates syntactic shape, not whether the number is dialable.
    // +9109876543210 is syntactically valid E.164 even though it represents
    // the old malformed output (trunk zero appended to CC); normalizePhone
    // is responsible for preventing that from being produced.
    expect(isE164('+9109876543210')).toBe(true);
  });

  test('rejects the malformed shapes the old code produced', () => {
    expect(isE164('+91+919876543210')).toBe(false);
    expect(isE164('+9198765 43210')).toBe(false);
    expect(isE164('9876543210')).toBe(false);
    expect(isE164('')).toBe(false);
    expect(isE164(null)).toBe(false);
  });
});
