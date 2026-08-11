/**
 * Normalizes a raw phone string (from POS payloads, forms, etc.) into the
 * canonical local format used across the platform: exactly 11 digits
 * beginning with "01" (e.g. 01001234567).
 *
 * Handles international prefixes (+20 / 0020 / 20), whitespace, and dashes.
 * Returns '' for any value that cannot be normalized to a valid local number
 * so callers can reject it explicitly.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');

  // Strip double-zero international prefix (00...)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Strip Egypt country code (20...) when followed by a full local number
  if (digits.startsWith('20') && digits.length > 11) {
    digits = digits.slice(2);
  }

  // Restore the national leading zero if the number was given without it
  if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }

  // Keep only the final 11 digits
  digits = digits.slice(-11);

  if (!/^01[0-9]{9}$/.test(digits)) {
    return '';
  }

  return digits;
}
