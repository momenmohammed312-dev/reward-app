import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/loyalty' });
async function main() {
  const cols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='branches' ORDER BY ordinal_position");
  console.log('branches columns:', cols.rows.map(r => r.column_name));
  const cols2 = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='customers' ORDER BY ordinal_position");
  console.log('customers columns:', cols2.rows.map(r => r.column_name));
  const cols3 = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='admin_activity_log' ORDER BY ordinal_position");
  console.log('admin_activity_log columns:', cols3.rows.map(r => r.column_name));
  await p.end();
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
