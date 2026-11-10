const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function checkConsumers() {
  const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // 1. Consumers from app_users
    const appConsumers = await client.query(`
      SELECT id, username, full_name, phone, role, customer_id, address, referral_code, created_at
      FROM public.app_users
      WHERE role = 'consumer' OR role IS NULL
      ORDER BY created_at DESC;
    `);
    console.log(`app_users with role='consumer' or null: ${appConsumers.rows.length}`);
    console.log('Sample rows:', appConsumers.rows.slice(0, 5));

    // 2. All distinct roles in app_users
    const rolesRes = await client.query(`
      SELECT role, count(*) FROM public.app_users GROUP BY role;
    `);
    console.log('Roles breakdown in app_users:', rolesRes.rows);

    // 3. Consumers from auth.users (joining with raw_user_meta_data)
    const authConsumers = await client.query(`
      SELECT 
        u.id, 
        u.email, 
        u.phone as auth_phone,
        u.created_at as registered_at,
        u.last_sign_in_at,
        u.raw_user_meta_data->>'full_name' as meta_full_name,
        u.raw_user_meta_data->>'phone' as meta_phone,
        u.raw_user_meta_data->>'username' as meta_username,
        u.raw_user_meta_data->>'role' as meta_role,
        u.raw_user_meta_data->'delivery_address' as meta_address,
        u.banned_until,
        u.deleted_at
      FROM auth.users u
      WHERE (u.raw_user_meta_data->>'role') = 'consumer'
         OR (u.raw_user_meta_data->>'role') IS NULL
         OR (u.raw_user_meta_data->>'role') NOT IN ('merchant_partner')
      ORDER BY u.created_at DESC;
    `);
    console.log(`\nConsumers in auth.users: ${authConsumers.rows.length}`);
    console.log('Sample auth consumers:', authConsumers.rows.slice(0, 5));

    // 4. Join auth.users and public.app_users to see complete merged profile
    const mergedConsumers = await client.query(`
      SELECT 
        u.id,
        COALESCE(a.full_name, u.raw_user_meta_data->>'full_name', a.username, u.email) as name,
        COALESCE(a.phone, u.raw_user_meta_data->>'phone', u.phone) as phone,
        u.email,
        COALESCE(
          a.address->>'state',
          u.raw_user_meta_data->'delivery_address'->>'state',
          'Kerala'
        ) as state,
        COALESCE(
          a.address->>'city',
          u.raw_user_meta_data->'delivery_address'->>'city'
        ) as city,
        COALESCE(
          a.address->>'addressLine',
          a.address->>'address',
          u.raw_user_meta_data->'delivery_address'->>'addressLine'
        ) as address_line,
        u.created_at as registration_date,
        u.last_sign_in_at as last_active_date,
        CASE 
          WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'Banned'
          WHEN u.deleted_at IS NOT NULL THEN 'Deleted'
          WHEN u.last_sign_in_at > now() - interval '30 days' THEN 'Active'
          ELSE 'Inactive'
        END as account_status,
        a.customer_id,
        a.referral_code,
        a.referred_by_code
      FROM auth.users u
      LEFT JOIN public.app_users a ON u.id = a.id
      WHERE (u.raw_user_meta_data->>'role' = 'consumer' OR a.role = 'consumer')
         OR ((u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' != 'merchant_partner') AND (a.role IS NULL OR a.role != 'merchant_partner'))
      ORDER BY u.created_at DESC;
    `);
    console.log(`\nTotal merged real consumer profiles: ${mergedConsumers.rows.length}`);
    console.log('First 5 merged consumers:');
    mergedConsumers.rows.slice(0, 5).forEach((c, i) => {
      console.log(`[${i+1}] ${c.name} | Phone: ${c.phone} | Email: ${c.email} | State: ${c.state} | Reg: ${c.registration_date} | Last Active: ${c.last_active_date} | Status: ${c.account_status}`);
    });

  } catch (err) {
    console.error('Error querying consumers:', err);
  } finally {
    await client.end();
  }
}

checkConsumers();
