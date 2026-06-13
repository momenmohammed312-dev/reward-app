import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/postgres' });

async function main() {
  const r = await p.query("SELECT 1 FROM pg_database WHERE datname='loyalty'");
  if (r.rows.length === 0) {
    await p.query('CREATE DATABASE loyalty');
    console.log('Created database loyalty');
  } else {
    console.log('Database loyalty already exists');
  }
  await p.end();
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
