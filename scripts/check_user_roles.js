const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function test() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT u.id, u.username, u.full_name, u.role, a.email 
    FROM public.app_users u 
    LEFT JOIN auth.users a ON a.id::text = u.id 
    WHERE a.email ILIKE '%jrina%' OR u.role ILIKE '%admin%';
  `);
  console.log('Admin / JRINA users in app_users:', res.rows);

  await client.end();
}

test().catch(console.error);
