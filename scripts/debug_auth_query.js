const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function test() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const consumerA_id = 'ae01e272-d135-4c2a-99d2-ffe730361735';
  try {
    await client.query('BEGIN;');
    await client.query('SET LOCAL ROLE authenticated;');
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [consumerA_id]);
    await client.query(`SELECT set_config('request.jwt.claims', $1, true);`, [
      JSON.stringify({ sub: consumerA_id, role: 'authenticated' })
    ]);
    const res = await client.query('SELECT id, customer_id FROM public.orders LIMIT 1;');
    console.log('Result:', res.rows);
    await client.query('COMMIT;');
  } catch(e) {
    console.log('Error message:', e.message);
    await client.query('ROLLBACK;');
  }
  await client.end();
}
test().catch(console.error);
