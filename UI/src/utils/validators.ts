// src/utils/validators.ts

/**
 * Validates Egyptian phone numbers.
 * Supports:
 * - 010XXXXXXXX, 011XXXXXXXX, 012XXXXXXXX, 015XXXXXXXX (11 digits)
 * - +2010XXXXXXXX, +2011XXXXXXXX, etc.
 */
export function validateEgyptianPhone(phone: string): boolean {
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  
  // Regex matches:
  // - Starts with optional +2 or 2 header
  // - Then 010, 011, 012, or 015
  // - Followed by exactly 8 digits
  const egPhoneRegex = /^(?:\+?2)?01[0125]\d{8}$/;
  
  return egPhoneRegex.test(cleanPhone);
}

/**
 * Formats phone to a standard display format
 */
export function formatEgyptianPhoneForDisplay(phone: string): string {
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  if (cleanPhone.startsWith('+2')) {
    return cleanPhone;
  }
  if (cleanPhone.startsWith('20')) {
    return `+${cleanPhone}`;
  }
  return cleanPhone;
}
