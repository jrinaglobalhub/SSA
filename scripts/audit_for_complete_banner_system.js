const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const client = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  console.log('--- spotlight_campaigns columns ---');
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'spotlight_campaigns'
    ORDER BY ordinal_position
  `);
  console.log(cols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

  console.log('\n--- spotlight_campaigns count by status ---');
  const counts = await client.query('SELECT status, count(*) FROM spotlight_campaigns GROUP BY status');
  console.log(counts.rows);

  console.log('\n--- approved spotlight_campaigns sample ---');
  const approved = await client.query(`
    SELECT sc.id, sc.store_id, s.name as store_name, s.address, s.lat, s.lng, sc.status, sc.start_date, sc.end_date, sc.banner_url, sc.payment_status, sc.total_amount, sc.duration_days
    FROM spotlight_campaigns sc
    LEFT JOIN stores s ON sc.store_id = s.id
    WHERE sc.status IN ('approved', 'scheduled', 'active', 'completed')
    LIMIT 5
  `);
  console.log(approved.rows);

  console.log('\n--- ssc_banners columns ---');
  const bcols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ssc_banners'
    ORDER BY ordinal_position
  `);
  console.log(bcols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

  console.log('\n--- storage.buckets ---');
  const buckets = await client.query('SELECT id, name, public FROM storage.buckets');
  console.log(buckets.rows);

  console.log('\n--- admin users in auth.users / app_users ---');
  const admins = await client.query(`
    SELECT id, email, role, user_metadata 
    FROM auth.users 
    WHERE email LIKE '%admin%' OR email LIKE '%founder%' OR id IN (SELECT id FROM app_users WHERE role = 'admin')
  `);
  console.log(admins.rows);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
