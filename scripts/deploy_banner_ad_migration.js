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

  const sql = fs.readFileSync('supabase/migrations/20261109_banner_ad_management_system.sql', 'utf8');
  console.log('Applying migration...');
  await client.query(sql);
  console.log('Migration 20261109_banner_ad_management_system.sql applied successfully!');

  // Verify banner_slot_controls row
  const slotRes = await client.query('SELECT * FROM public.banner_slot_controls;');
  console.log('banner_slot_controls content:', slotRes.rows);

  await client.end();
}

deploy().catch(console.error);
