const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function fetchAllRealConsumers() {
  const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const res = await client.query(`
      SELECT 
        u.id::text as id,
        COALESCE(NULLIF(a.full_name, ''), NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(a.username, ''), split_part(u.email, '@', 1)) as name,
        COALESCE(NULLIF(a.phone, ''), NULLIF(u.raw_user_meta_data->>'phone', ''), NULLIF(u.phone, ''), 'Not available') as phone,
        u.email,
        COALESCE(
          NULLIF(a.address->>'state', ''),
          NULLIF(u.raw_user_meta_data->'delivery_address'->>'state', ''),
          'Kerala'
        ) as state,
        COALESCE(
          NULLIF(a.address->>'city', ''),
          NULLIF(u.raw_user_meta_data->'delivery_address'->>'city', ''),
          'Not available'
        ) as city,
        u.created_at as registration_date,
        u.last_sign_in_at as last_active_date,
        CASE 
          WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'Banned'
          WHEN u.deleted_at IS NOT NULL THEN 'Deleted'
          WHEN u.last_sign_in_at > now() - interval '30 days' THEN 'Active'
          ELSE 'Inactive'
        END as account_status,
        COALESCE(a.customer_id, 'Not assigned') as customer_id,
        COALESCE(a.referral_code, 'None') as referral_code,
        COALESCE(a.referred_by_code, 'Direct') as referred_by_code
      FROM auth.users u
      LEFT JOIN public.app_users a ON u.id::text = a.id
      WHERE (u.raw_user_meta_data->>'role' = 'consumer' OR a.role = 'consumer')
         OR ((u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' != 'merchant_partner') AND (a.role IS NULL OR a.role != 'merchant_partner'))
      ORDER BY u.created_at DESC;
    `);

    console.log(`Found ${res.rows.length} real consumers in production database!`);
    console.table(res.rows.map(r => ({
      name: r.name,
      phone: r.phone,
      email: r.email,
      state: r.state,
      reg: r.registration_date.toISOString().slice(0, 10),
      last_active: r.last_active_date ? r.last_active_date.toISOString().slice(0, 10) : 'Never',
      status: r.account_status,
      customer_id: r.customer_id
    })));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fetchAllRealConsumers();
