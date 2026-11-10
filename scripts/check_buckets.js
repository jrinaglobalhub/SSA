const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');
const client = new Client({
  connectionString: 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, name, public FROM storage.buckets ORDER BY id;');
  console.log('Storage buckets:');
  res.rows.forEach(r => console.log('  - ' + r.id + ' (public: ' + r.public + ')'));
  await client.end();
}
run().catch(console.error);
