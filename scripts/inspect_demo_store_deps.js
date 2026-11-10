const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const client = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  const demoStoreIds = [
    'store_26f002a20d1a',
    'store_706be533bd21',
    'store_8048cac72578',
    'store_60d0c5a702df'
  ];

  const tables = [
    'offers', 'catalog', 'reviews', 'bills', 'merchant_subscriptions',
    'store_gst_declarations', 'store_custom_categories', 'orders',
    'spotlight_campaigns', 'subscription_notification_outbox', 'delivery_jobs',
    'banner_daily_slots', 'store_verification_history', 'subscription_audit_logs'
  ];

  for (const sId of demoStoreIds) {
    console.log(`\n=== Checking dependencies for ${sId} ===`);
    for (const t of tables) {
      try {
        const q = await client.query(`SELECT count(*) FROM ${t} WHERE store_id = $1`, [sId]);
        if (parseInt(q.rows[0].count) > 0) {
          console.log(`  -> ${t}: ${q.rows[0].count} records`);
        }
      } catch (e) {
        console.log(`  -> error checking ${t}: ${e.message}`);
      }
    }
  }

  // Check banner_daily_slots columns
  const bdsCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'banner_daily_slots'
    ORDER BY ordinal_position
  `);
  console.log('\nbanner_daily_slots columns:');
  console.dir(bdsCols.rows, { depth: null });

  // Check existing banner_daily_slots rows
  const bdsRows = await client.query(`SELECT * FROM banner_daily_slots LIMIT 20`);
  console.log('\nbanner_daily_slots existing rows count:', bdsRows.rows.length);
  console.dir(bdsRows.rows, { depth: null });

  // Check demo owner users
  const demoUsers = await client.query(`
    SELECT id, full_name, phone, role, created_at 
    FROM app_users 
    WHERE id = ANY($1) OR phone = '9998887776'
  `, [
    ['26f002a2-0d1a-4191-8cdd-b6a041c0df6e',
     '706be533-bd21-4d55-af92-985b4dc02f97',
     '8048cac7-2578-414c-ad8f-bd6abbbeac3d',
     '60d0c5a7-02df-4228-a482-87885c296484']
  ]);
  console.log('\nDemo app_users found:', demoUsers.rows);

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
