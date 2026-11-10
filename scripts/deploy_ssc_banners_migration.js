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

  const sql = fs.readFileSync('supabase/migrations/20261110_ssc_banners_system.sql', 'utf8');
  console.log('Applying migration 20261110_ssc_banners_system.sql...');
  await client.query(sql);
  console.log('Migration applied successfully!');

  // Verify table existence
  const res = await client.query("SELECT count(*) FROM public.ssc_banners");
  console.log('Verification: ssc_banners table exists, current row count:', res.rows[0].count);

  await client.end();
}

deploy().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
