import fs from 'fs';
import path from 'path';
import db from '../config/db.js';
import { logger } from './logger.js';

export class MigrationRunner {
  /**
   * Executes pending database migration SQL scripts in alphabetical order.
   */
  static async run(migrationsDir: string): Promise<string[]> {
    const client = await db.pool.connect();
    const applied: string[] = [];

    try {
      // 1. Ensure schema_migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. Fetch already applied migrations
      const appliedRes = await client.query(`SELECT version FROM schema_migrations`);
      const appliedVersions = new Set(
        appliedRes.rows.map((r: { version: string }) => r.version)
      );

      // 3. Scan migrations directory
      if (!fs.existsSync(migrationsDir)) {
        logger.warn(`Migrations directory not found: ${migrationsDir}`);
        return [];
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const version = file.split('_')[0];
        if (appliedVersions.has(version)) {
          continue;
        }

        logger.info(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sqlContent);
          await client.query(
            `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`,
            [version, file]
          );
          await client.query('COMMIT');
          applied.push(file);
          logger.info(`Successfully applied migration: ${file}`);
        } catch (migrationErr: unknown) {
          await client.query('ROLLBACK');
          const msg = migrationErr instanceof Error ? migrationErr.message : String(migrationErr);
          logger.error(`Migration failed on file ${file}:`, { error: msg });
          throw migrationErr;
        }
      }

      return applied;
    } finally {
      client.release();
    }
  }
}
