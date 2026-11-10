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

  // Search stores matching Multi App Retail
  const stores = await client.query(`
    SELECT s.id, s.name, s.category, s.created_at, s.owner_id, u.full_name as owner_name, u.phone as owner_phone
    FROM stores s
    LEFT JOIN app_users u ON s.owner_id = u.id
    WHERE s.name ILIKE '%Multi App Retail%' OR s.name ILIKE '%demo%' OR s.name ILIKE '%test%'
  `);
  console.log('\n--- MATCHING STORES ---', stores.rows.length);
  console.dir(stores.rows, { depth: null });

  // Check all stores
  const allStores = await client.query(`
    SELECT s.id, s.name, s.created_at, u.full_name as owner_name, s.verification_status
    FROM stores s
    LEFT JOIN app_users u ON s.owner_id = u.id
    ORDER BY s.created_at DESC
  `);
  console.log('\n--- ALL STORES TOTAL:', allStores.rows.length);
  allStores.rows.forEach(r => console.log(`${r.id} | ${r.name} | ${r.verification_status} | ${r.owner_name} | ${r.created_at}`));

  // Check spotlight campaigns
  const camps = await client.query(`
    SELECT sc.*, s.name as store_name
    FROM spotlight_campaigns sc
    LEFT JOIN stores s ON sc.store_id = s.id
  `);
  console.log('\n--- ALL SPOTLIGHT CAMPAIGNS TOTAL:', camps.rows.length);
  camps.rows.forEach(c => console.log(`${c.id} | Store: ${c.store_name} (${c.store_id}) | Banner: ${c.banner_url} | Amount: ${c.total_amount} | Start: ${c.start_date} | End: ${c.end_date} | Status: ${c.status} | Pay: ${c.payment_status}`));

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
