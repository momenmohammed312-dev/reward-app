import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/loyalty' });
async function main() {
  const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables:', tables.rows.map(r => r.table_name));
  await p.end();
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
