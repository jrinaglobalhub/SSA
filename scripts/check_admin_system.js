const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function checkAdminFns() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT proname, prosecdef, prosrc 
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE n.nspname = 'public' AND proname ILIKE '%admin%';
  `);

  console.log('Admin functions:', res.rows.map(r => ({ name: r.proname, secdef: r.prosecdef })));

  // Check how SSA / admin identifies admins in app_users
  const admins = await client.query(`
    SELECT id, username, full_name, phone, role 
    FROM public.app_users 
    WHERE role IN ('admin', 'super_admin');
  `);
  console.log('Admin users in app_users:', admins.rows);

  await client.end();
}

checkAdminFns().catch(console.error);
