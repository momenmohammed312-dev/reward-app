/**
 * Seed script: creates the initial superadmin user.
 * Usage: node scripts/seed-superadmin.js
 *
 * Ensures:
 * - Migration 004 has been run (tenant_id is nullable)
 * - A superadmin user is created with the provided credentials
 *
 * Default credentials (override via env vars):
 *   SUPERADMIN_EMAIL=admin@mo2capital.com
 *   SUPERADMIN_PASSWORD=SuperAdmin@2026
 */

const bcrypt = require('bcrypt');
const db = require('../dist/config/db.js').default;

const EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@mo2capital.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@2026';
const NAME = process.env.SUPERADMIN_NAME || 'Super Admin';

async function seedSuperAdmin() {
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
    if (existing.rows.length > 0) {
      console.log(`[seed] Superadmin already exists: ${EMAIL}`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const result = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, is_active)
       VALUES (NULL, $1, $2, $3, 'superadmin', true)
       RETURNING id, email, name, role`,
      [EMAIL, passwordHash, NAME]
    );

    console.log(`[seed] Superadmin created: ${result.rows[0].email} (role: ${result.rows[0].role})`);
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err.message);
    process.exit(1);
  }
}

seedSuperAdmin();
