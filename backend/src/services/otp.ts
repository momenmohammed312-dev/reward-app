import db from '../config/db.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

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

    // In a real application, you would send this OTP via SMS/WhatsApp API (e.g. Twilio, VictoryLink)
    console.log(`[SMS SENDER Mock] Sent OTP code ${code} to ${phone} for tenant ${tenantId}`);

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
