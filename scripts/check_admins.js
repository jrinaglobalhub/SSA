const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function checkAdmins() {
  const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const res = await client.query(`
      SELECT id, email, is_super_admin, role, raw_app_meta_data, raw_user_meta_data, created_at, last_sign_in_at
      FROM auth.users
      WHERE email ILIKE '%jrina%' OR email ILIKE '%admin%' OR email ILIKE '%founder%' OR (raw_user_meta_data->>'role') ILIKE '%admin%';
    `);

    console.log('Admin/Founder accounts in auth.users:', res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkAdmins();
