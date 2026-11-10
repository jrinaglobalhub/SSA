const fs = require('fs');
const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

async function deploy() {
  const client = new Client({
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.tpcrwtxtqvvdghtfckea',
    password: 'password@2026/jrina',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully!');

  const sql = fs.readFileSync('supabase/migrations/20261111_ssc_banner_management_production.sql', 'utf8');
  console.log('Applying migration 20261111_ssc_banner_management_production.sql...');
  await client.query(sql);
  console.log('Migration applied successfully!');

  // Verify storage bucket
  const bRes = await client.query("SELECT id, name, public FROM storage.buckets WHERE id = 'ssc-banners'");
  console.log('Storage bucket ssc-banners verified:', bRes.rows);

  // Verify columns count
  const cRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ssc_banners' 
    ORDER BY ordinal_position
  `);
  console.log('ssc_banners total columns:', cRes.rows.length);

  await client.end();
}

deploy().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
