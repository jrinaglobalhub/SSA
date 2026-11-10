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

  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name ILIKE '%referral%' OR table_name ILIKE '%campaign%' OR table_name ILIKE '%volunteer%')
  `);
  console.log('Matching tables:', tables.rows);

  // Check columns of app_users and stores related to referral
  const userCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'app_users' AND column_name ILIKE '%refer%'
  `);
  console.log('app_users referral columns:', userCols.rows);

  const storeCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'stores' AND column_name ILIKE '%refer%'
  `);
  console.log('stores referral columns:', storeCols.rows);

  // Check all existing referral codes in stores and app_users
  const storeCodes = await client.query(`SELECT referral_code FROM stores WHERE referral_code IS NOT NULL`);
  console.log('Existing store referral codes:', storeCodes.rows.map(r => r.referral_code));

  const userCodes = await client.query(`SELECT shopper_pass_code FROM app_users WHERE shopper_pass_code IS NOT NULL`);
  console.log('Existing shopper_pass_code count:', userCodes.rows.length);

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
