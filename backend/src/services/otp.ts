import db from '../config/db.js';
import { logger } from './logger.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'victorylink';

async function sendVictoryLinkSMS(phone: string, message: string) {
  const username = process.env.VICTORYLINK_USERNAME;
  const password = process.env.VICTORYLINK_PASSWORD;
  const sender = process.env.VICTORYLINK_SENDER || 'LoyaltyApp';

  if (!username || !password) {
    logger.warn('VictoryLink credentials missing — skipping SMS in development');
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
  logger.debug('VictoryLink response', { responseText });

  if (!responseText.includes('<Result>0</Result>')) {
    throw new Error(`VictoryLink SMS failed: ${responseText}`);
  }
}

const sendSMS = async (phone: string, code: string) => {
  try {
    const message = `كود التحقق الخاص بك هو: ${code}\nصالح لمدة ${OTP_EXPIRY_MINUTES} دقائق.`;
    await sendVictoryLinkSMS(phone, message);
    logger.info(`OTP sent to ${phone} via VictoryLink`);
  } catch (err: any) {
    logger.warn('Failed to send via VictoryLink, falling back to mock', { error: (err as Error).message });
    logger.info(`Mock OTP sent to ${phone}`, { code });
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
       VALUES ($1::uuid, $2, $3, $4)`,
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
    // Atomically verify and consume the OTP in a single transaction to prevent race conditions
    const result = await db.query(
      `UPDATE otp_codes
       SET used_at = NOW(), attempts = attempts + 1
       WHERE id = (
         SELECT id FROM otp_codes
         WHERE tenant_id = $1::uuid AND phone = $2 AND used_at IS NULL
           AND expires_at > NOW()
           AND attempts < max_attempts
           AND code = $3
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE
       )
       RETURNING id`,
      [tenantId, phone, code]
    );

    if (result.rows.length > 0) {
      return true;
    }

    // Code was wrong, expired, or max attempts reached — increment attempts on any matching record
    await db.query(
      `UPDATE otp_codes
       SET attempts = attempts + 1
       WHERE id = (
         SELECT id FROM otp_codes
         WHERE tenant_id = $1::uuid AND phone = $2 AND used_at IS NULL
           AND code != $3
         ORDER BY created_at DESC
         LIMIT 1
       )`,
      [tenantId, phone, code]
    );

    return false;
  }
}
