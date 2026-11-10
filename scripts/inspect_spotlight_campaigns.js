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

  const camps = await client.query(`
    SELECT sc.*, s.name as store_name, s.owner_id, u.full_name as owner_name, u.phone as owner_phone
    FROM spotlight_campaigns sc
    LEFT JOIN stores s ON sc.store_id = s.id
    LEFT JOIN app_users u ON s.owner_id = u.id
    ORDER BY sc.created_at ASC
  `);

  console.log('Total spotlight campaigns:', camps.rows.length);
  for (const c of camps.rows) {
    console.log('----------------------------------------------------');
    console.log(`ID: ${c.id}`);
    console.log(`Store: ${c.store_name} (${c.store_id})`);
    console.log(`Owner: ${c.owner_name} (${c.owner_phone})`);
    console.log(`Banner URL: ${c.banner_url}`);
    console.log(`Title: ${c.title} | Type: ${c.campaign_type}`);
    console.log(`Dates: ${c.start_date} -> ${c.end_date}`);
    console.log(`Total Amount: ${c.total_amount} | Payment Status: ${c.payment_status}`);
    console.log(`Status: ${c.status} | Created At: ${c.created_at}`);
  }

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
