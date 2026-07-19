// Single source of truth for turning what a user types into E.164.
//
// Why this exists: OTP send used to build the number with a bare
// `${dialCode}${whatever the user typed}` concatenation, and separately
// defaulted anything without a '+' to +91. That produced invalid E.164 for
// several input shapes people actually type, and Firebase only rejected them
// after a network round-trip with `auth/invalid-phone-number`:
//
//   India selected, user types │ old result           │ now
//   ───────────────────────────┼──────────────────────┼──────────────────
//   9876543210                 │ +919876543210  ✅    │ +919876543210
//   09876543210  (trunk zero)  │ +9109876543210 ❌    │ +919876543210
//   919876543210 (with CC)     │ +91919876543210 ❌   │ +919876543210
//   +919876543210 (full intl)  │ +91+919876543210 ❌  │ +919876543210
//   98765 43210  (spaces)      │ +9198765 43210 ❌    │ +919876543210
//
// The trunk-zero case is why India specifically was reported broken: Indian
// numbers are written domestically with a leading 0, so users type it.
//
// Strategy: rather than applying fixups blindly (which can corrupt a number
// that legitimately starts with its own country code), we build candidate
// interpretations and pick the first one that passes the length rule. A
// transformation is only accepted if it produces something valid.

import type { Country } from '../constants/countries';

/** ITU-T E.164 caps a full international number at 15 digits including the country code. */
const E164_MAX_DIGITS = 15;
const MIN_NATIONAL_DIGITS = 4;

export interface NormalizedPhone {
  valid: boolean;
  /** E.164, e.g. "+919876543210". Only set when valid. */
  e164?: string;
  /** User-facing message. Only set when invalid. */
  error?: string;
}

function nationalBounds(country: Country): { min: number; max: number } {
  const dialDigits = country.dialCode.replace(/\D/g, '').length;
  return {
    min: country.minLen ?? MIN_NATIONAL_DIGITS,
    max: country.maxLen ?? E164_MAX_DIGITS - dialDigits,
  };
}

function isValidNational(national: string, country: Country): boolean {
  const { min, max } = nationalBounds(country);
  if (national.length < min || national.length > max) return false;
  // A national number never starts with 0 once the trunk prefix is removed.
  if (national.startsWith('0')) return false;
  return true;
}

/**
 * Normalize a user-entered phone number to E.164.
 *
 * @param country       the country selected in the picker
 * @param rawNational   whatever is in the text field. May contain spaces,
 *                      dashes, brackets, a trunk 0, a duplicated country code,
 *                      or even a full "+.." international number.
 */
export function normalizePhone(country: Country, rawNational: string): NormalizedPhone {
  const raw = (rawNational ?? '').trim();
  if (!raw) return { valid: false, error: 'Please enter a phone number' };

  const dial = country.dialCode.replace(/\D/g, '');
  const digits = raw.replace(/\D/g, '');

  if (!digits) return { valid: false, error: 'Please enter a phone number' };

  // A leading '+' means the user pasted a full international number. If it
  // isn't this country's code, honour what they pasted rather than prefixing
  // the selected country's code onto another country's number.
  if (raw.startsWith('+') && !digits.startsWith(dial)) {
    if (digits.length > E164_MAX_DIGITS || digits.length < MIN_NATIONAL_DIGITS) {
      return { valid: false, error: 'That phone number does not look valid' };
    }
    return { valid: true, e164: `+${digits}` };
  }

  // Candidate interpretations, most-literal first. We accept the first that
  // validates, so a number that legitimately begins with its own country code
  // (e.g. an Indian 10-digit number starting "91") is not corrupted by the
  // duplicate-country-code fixup.
  const stripTrunk = (s: string) => s.replace(/^0+/, '');
  const stripDial = (s: string) => (dial && s.startsWith(dial) ? s.slice(dial.length) : s);

  const candidates = [
    digits,
    stripTrunk(digits),
    stripDial(digits),
    stripTrunk(stripDial(digits)),
    stripDial(stripTrunk(digits)),
  ];

  for (const candidate of candidates) {
    if (candidate && isValidNational(candidate, country)) {
      return { valid: true, e164: `+${dial}${candidate}` };
    }
  }

  const { min, max } = nationalBounds(country);
  const expected = min === max ? `${min} digits` : `${min}–${max} digits`;
  return {
    valid: false,
    error: `Enter a valid ${country.name} number (${expected} after ${country.dialCode})`,
  };
}

/**
 * Guard for values that should already be E.164 by the time they reach the
 * auth layer. Keeps the "who normalizes" contract explicit at call sites.
 */
export function isE164(value: string | null | undefined): boolean {
  return !!value && /^\+[1-9]\d{4,14}$/.test(value);
}
