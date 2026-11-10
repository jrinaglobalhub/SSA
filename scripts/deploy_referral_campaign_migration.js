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

  const sql = fs.readFileSync('supabase/migrations/20261109_referral_campaign_system.sql', 'utf8');
  console.log('Applying migration 20261109_referral_campaign_system.sql...');
  await client.query(sql);
  console.log('Migration applied successfully!');

  // Verify tables
  const testTbl = await client.query('SELECT count(*) FROM public.referral_campaigns;');
  console.log('referral_campaigns count:', testTbl.rows[0].count);

  await client.end();
}

deploy().catch(console.error);
