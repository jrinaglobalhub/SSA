const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const client = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function runCleanup() {
  await client.connect();
  console.log('Connected to DB');

  try {
    await client.query('BEGIN');

    // 1. Clean verified demo application test_camp_a_1794196939804
    const delHist = await client.query(`
      DELETE FROM spotlight_status_history 
      WHERE campaign_id = 'test_camp_a_1794196939804'
      RETURNING id;
    `);
    console.log(`Deleted ${delHist.rowCount} history rows for test_camp_a_1794196939804`);

    const delCamp = await client.query(`
      DELETE FROM spotlight_campaigns 
      WHERE id = 'test_camp_a_1794196939804'
      RETURNING id, title;
    `);
    console.log(`Deleted ${delCamp.rowCount} demo campaign:`, delCamp.rows);

    // 2. Clean 4 verified demo stores
    const demoStoreIds = [
      'store_26f002a20d1a',
      'store_706be533bd21',
      'store_8048cac72578',
      'store_60d0c5a702df'
    ];

    const delStores = await client.query(`
      DELETE FROM stores 
      WHERE id = ANY($1) AND name = 'Multi App Retail'
      RETURNING id, name;
    `, [demoStoreIds]);
    console.log(`Deleted ${delStores.rowCount} demo stores:`, delStores.rows);

    // 3. Clean demo app_users with dummy phone 9998887776
    const delUsers = await client.query(`
      DELETE FROM app_users 
      WHERE phone = '9998887776' AND full_name = 'Multi App User'
      RETURNING id, full_name, phone;
    `);
    console.log(`Deleted ${delUsers.rowCount} demo app_users:`, delUsers.rows);

    await client.query('COMMIT');
    console.log('Transaction COMMITTED successfully.');

    // 4. Verify remaining stores
    const remStores = await client.query(`SELECT count(*) FROM stores`);
    console.log(`Remaining stores in database: ${remStores.rows[0].count} (Expected: 13 genuine stores)`);

    // Verify remaining campaigns
    const remCamps = await client.query(`SELECT id, title, banner_url, payment_status, status FROM spotlight_campaigns`);
    console.log(`Remaining spotlight campaigns: ${remCamps.rows.length}`);
    remCamps.rows.forEach(c => console.log(`  - ${c.id} | ${c.title} | ${c.status} | ${c.payment_status}`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup, ROLLED BACK:', err);
  } finally {
    await client.end();
  }
}

runCleanup();
