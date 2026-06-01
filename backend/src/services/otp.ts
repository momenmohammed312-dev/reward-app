import db from '../config/db.js';
import axios from 'axios';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'victorylink';

const sendSMS = async (phone: string, code: string) => {
  try {
    if (SMS_PROVIDER === 'victorylink') {
      await axios.post('https://smsvas.victorylink.com/sendsms', {
        username: process.env.SMS_USERNAME,
        password: process.env.SMS_PASSWORD,
        SMSSender: process.env.SMS_SENDER_NAME || 'MO2Loyalty',
        SMSText: `كود التحقق الخاص بك هو: ${code}`,
        SMSReceiver: phone,
      });
    } else {
      console.log(`[SMS SENDER Mock] Sent OTP code ${code} to ${phone}`);
    }
    console.log(`[SMS] OTP sent to ${phone} via ${SMS_PROVIDER}`);
  } catch (err: any) {
    console.warn(`[SMS] Failed to send via ${SMS_PROVIDER}, falling back to console log:`, err.message);
    console.log(`[SMS SENDER Mock] Sent OTP code ${code} to ${phone}`);
  }
};

export class OTPService {
  /**
   * Generates a 6-digit OTP code, stores it in the database and returns it.
   */
  static async generateOTP(tenantId: string, phone: string): Promise<string> {
    // Generate a random 6 digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Save to database
    await db.query(
      `INSERT INTO otp_codes (tenant_id, phone, code, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tenantId, phone, code, expiresAt]
    );

    await sendSMS(phone, code);

    return code;
  }

  /**
   * Verifies the OTP for a given phone and tenant.
   * Returns true if valid, false if invalid/expired.
   */
  static async verifyOTP(tenantId: string, phone: string, code: string): Promise<boolean> {
    // Get the latest unused OTP code for this phone and tenant
    const result = await db.query(
      `SELECT * FROM otp_codes
       WHERE tenant_id = $1 AND phone = $2 AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, phone]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const otpRecord = result.rows[0];

    // Check if code has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return false;
    }

    // Check if max attempts reached
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return false;
    }

    // Check code correctness
    if (otpRecord.code !== code) {
      // Increment attempts
      await db.query(
        `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`,
        [otpRecord.id]
      );
      return false;
    }

    // Mark as used
    await db.query(
      `UPDATE otp_codes SET used_at = NOW() WHERE id = $1`,
      [otpRecord.id]
    );

    return true;
  }
}
