import crypto from 'crypto';
import db from '../config/db.js';
import { logger } from './logger.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const MAX_FAILED_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function sendVictoryLinkSMS(phone: string, message: string) {
  const username = process.env.VICTORYLINK_USERNAME;
  const password = process.env.VICTORYLINK_PASSWORD;
  const sender = process.env.VICTORYLINK_SENDER || 'LoyaltyApp';

  if (!username || !password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('VictoryLink SMS credentials are not configured in production');
    }
    logger.warn(`[DEV] SMS sending skipped for ${phone} (VictoryLink credentials not configured)`);
    return;
  }

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<SMS>
  <AccountInfo>
    <Username>${username}</Username>
    <Password>${password}</Password>
  </AccountInfo>
  <MessageData>
    <Message>
      <SenderName>${sender}</SenderName>
      <MessageText>${message}</MessageText>
      <RecipientList>
        <Recipient>${phone}</Recipient>
      </RecipientList>
    </Message>
  </MessageData>
</SMS>`;

  const response = await fetch('https://www.victorylink.com/VictoryLink_WebService/SmsSend.asmx/XML_SendSMS', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `xml_request=${encodeURIComponent(xmlBody)}`,
  });

  const responseText = await response.text();
  if (!responseText.includes('<Result>0</Result>')) {
    throw new Error(`VictoryLink SMS failed: ${responseText}`);
  }
}

const sendSMS = async (phone: string, code: string) => {
  try {
    const message = `كود التحقق الخاص بك هو: ${code}\nصالح لمدة ${OTP_EXPIRY_MINUTES} دقائق.`;
    await sendVictoryLinkSMS(phone, message);
  } catch (error) {
    logger.error('SMS Delivery failure', {
      phone: phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2'),
      error: (error as Error).message,
    });
    throw new Error('Failed to send SMS OTP code');
  }
};

export class OTPService {
  /**
   * Generates a cryptographically secure 6-digit OTP, stores its SHA-256 hash, and sends via SMS.
   */
  static async generateOTP(tenantId: string, phone: string) {
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Invalidate existing active OTPs for this phone
      await client.query(
        `UPDATE otp_codes SET is_used = true, used_at = NOW()
         WHERE tenant_id = $1::uuid AND phone = $2 AND is_used = false AND used_at IS NULL`,
        [tenantId, phone]
      );

      // Store SHA-256 hash, never plaintext
      await client.query(
        `INSERT INTO otp_codes (tenant_id, phone, code, expires_at)
         VALUES ($1::uuid, $2, $3, $4)`,
        [tenantId, phone, otpHash, expiresAt]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await sendSMS(phone, otpCode);

    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEV ONLY] OTP generated for ${phone}: ${otpCode}`);
    }

    return { success: true, message: 'OTP sent successfully' };
  }

  /**
   * Verifies an OTP code against stored hash with brute-force attempt limits.
   */
  static async verifyOTP(tenantId: string, phone: string, code: string): Promise<boolean> {
    const inputHash = hashOtp(code.trim());

    const result = await db.query(
      `SELECT id, code, attempts, max_attempts, expires_at, is_used
       FROM otp_codes
       WHERE tenant_id = $1::uuid AND phone = $2 AND is_used = false AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, phone]
    );

    if (result.rows.length === 0) {
      throw new Error('No active OTP found. Please request a new code.');
    }

    const otpRecord = result.rows[0];

    if (new Date() > new Date(otpRecord.expires_at)) {
      await db.query(`UPDATE otp_codes SET is_used = true, used_at = NOW() WHERE id = $1`, [otpRecord.id]);
      throw new Error('OTP has expired. Please request a new one.');
    }

    const maxAttempts = otpRecord.max_attempts ?? MAX_FAILED_ATTEMPTS;
    if (otpRecord.attempts >= maxAttempts) {
      await db.query(`UPDATE otp_codes SET is_used = true, used_at = NOW() WHERE id = $1`, [otpRecord.id]);
      throw new Error('Too many failed attempts. Code locked for security.');
    }

    const storedHashBuffer = Buffer.from(otpRecord.code, 'utf8');
    const inputHashBuffer = Buffer.from(inputHash, 'utf8');

    const isMatch =
      storedHashBuffer.length === inputHashBuffer.length &&
      crypto.timingSafeEqual(storedHashBuffer, inputHashBuffer);

    if (!isMatch) {
      await db.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otpRecord.id]);
      throw new Error('Invalid OTP code. Please check and try again.');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE otp_codes SET is_used = true, used_at = NOW() WHERE id = $1 AND is_used = false`,
        [otpRecord.id]
      );

      await client.query(
        `UPDATE customers SET is_verified = true
         WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL`,
        [tenantId, phone]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return true;
  }
}
