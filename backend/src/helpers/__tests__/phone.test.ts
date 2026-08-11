import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../phone.js';

describe('normalizePhone', () => {
  it('accepts already-normalized 11-digit Egyptian mobile', () => {
    expect(normalizePhone('01112345678')).toBe('01112345678');
    expect(normalizePhone('01098765432')).toBe('01098765432');
  });

  it('strips the international prefix +2', () => {
    expect(normalizePhone('+201112345678')).toBe('01112345678');
    expect(normalizePhone('201012345678')).toBe('01012345678');
  });

  it('strips a leading 00', () => {
    expect(normalizePhone('00201112345678')).toBe('01112345678');
  });

  it('adds a leading 0 when given a 10-digit number starting with 1', () => {
    expect(normalizePhone('1112345678')).toBe('01112345678');
  });

  it('returns an empty string for clearly invalid numbers', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('123')).toBe('');
    expect(normalizePhone('0221234567')).toBe('');
    expect(normalizePhone('20112345678')).toBe('');
  });
});
