import { test, expect, describe } from 'bun:test';
import { actionReducer, hasOutput, safeFileName, statusOf, type ActionStates } from './actionState';

describe('actionReducer', () => {
  test('walks idle → loading → success → idle per action', () => {
    let s: ActionStates = {};
    expect(statusOf(s, 'copy')).toBe('idle');
    s = actionReducer(s, { type: 'start', key: 'copy' });
    expect(statusOf(s, 'copy')).toBe('loading');
    s = actionReducer(s, { type: 'success', key: 'copy' });
    expect(statusOf(s, 'copy')).toBe('success');
    s = actionReducer(s, { type: 'reset', key: 'copy' });
    expect(statusOf(s, 'copy')).toBe('idle');
  });

  test('records failures with a message and keeps other actions independent', () => {
    let s: ActionStates = actionReducer({}, { type: 'start', key: 'save' });
    s = actionReducer(s, { type: 'start', key: 'copy' });
    s = actionReducer(s, { type: 'error', key: 'save', message: 'permission denied' });
    expect(s.save).toEqual({ status: 'error', message: 'permission denied' });
    expect(statusOf(s, 'copy')).toBe('loading');
  });

  test('falls back to a generic error message', () => {
    expect(actionReducer({}, { type: 'error', key: 'txt' }).txt.message).toBe('Something went wrong');
  });
});

describe('hasOutput', () => {
  test('is false for empty, whitespace and non-strings', () => {
    expect(hasOutput('')).toBe(false);
    expect(hasOutput('   \n')).toBe(false);
    expect(hasOutput(null)).toBe(false);
    expect(hasOutput(undefined)).toBe(false);
    expect(hasOutput('result')).toBe(true);
  });
});

describe('safeFileName', () => {
  test('builds a filesystem-safe name', () => {
    expect(safeFileName('Ad Copy Generator!')).toBe('ad-copy-generator');
    expect(safeFileName('instagram-caption-output')).toBe('instagram-caption-output');
    expect(safeFileName('')).toBe('result');
    expect(safeFileName(null, 'x')).toBe('x');
  });
});
