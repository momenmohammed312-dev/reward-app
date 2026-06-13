import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/loyalty' });

async function main() {
  const migrations = [
    '../DB/migrations/005_admin_audit_soft_delete.sql',
    '../DB/migrations/006_branch_timezone_working_hours.sql',
  ];
  for (const file of migrations) {
    const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    try {
      await p.query(sql);
      console.log(`Applied: ${file}`);
    } catch (e) {
      console.error(`Error in ${file}:`, e.message);
    }
  }
  console.log('Migrations done');
  await p.end();
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
