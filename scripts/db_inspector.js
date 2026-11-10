const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function inspect() {
  const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database successfully!');

    // 1. List public tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Public tables:', tablesRes.rows.map(r => r.table_name));

    // 2. Count and inspect app_users
    const appUsersCount = await client.query(`SELECT COUNT(*) FROM public.app_users;`);
    console.log('app_users count:', appUsersCount.rows[0].count);

    const appUsersCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'app_users'
      ORDER BY ordinal_position;
    `);
    console.log('app_users columns:', appUsersCols.rows);

    // 3. Sample rows from app_users
    const sampleUsers = await client.query(`SELECT * FROM public.app_users LIMIT 5;`);
    console.log('Sample app_users rows:', sampleUsers.rows);

    // 4. Count and inspect auth.users
    const authUsersCount = await client.query(`SELECT COUNT(*) FROM auth.users;`);
    console.log('auth.users count:', authUsersCount.rows[0].count);

    const authCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    console.log('auth.users columns:', authCols.rows.map(c => c.column_name));

    const sampleAuth = await client.query(`
      SELECT id, email, phone, raw_user_meta_data, created_at, last_sign_in_at 
      FROM auth.users 
      LIMIT 5;
    `);
    console.log('Sample auth.users:', sampleAuth.rows);

    // 5. Check RLS policies on app_users
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'app_users';
    `);
    console.log('Policies on app_users:', policiesRes.rows);

    // 6. Check permissions on app_users
    const permsRes = await client.query(`
      SELECT grantee, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = 'app_users';
    `);
    console.log('Grants on app_users:', permsRes.rows);

  } catch (err) {
    console.error('Error connecting/querying DB:', err);
  } finally {
    await client.end();
  }
}

inspect();
