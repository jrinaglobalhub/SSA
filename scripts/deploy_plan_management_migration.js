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

  const sql = fs.readFileSync('supabase/migrations/20261123_manual_store_plan_management.sql', 'utf8');
  console.log('Applying migration 20261123_manual_store_plan_management.sql...');
  await client.query(sql);
  console.log('Migration applied successfully!');

  // Verify function
  const fRes = await client.query(`
    SELECT proname, proargtypes 
    FROM pg_proc 
    WHERE proname = 'admin_override_store_plan'
  `);
  console.log('Verified function admin_override_store_plan:', fRes.rows);

  // Verify column
  const cRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'stores' AND column_name = 'subscription_expires_at'
  `);
  console.log('Verified column subscription_expires_at:', cRes.rows);

  await client.end();
}

deploy().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
