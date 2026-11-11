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

  const sql = fs.readFileSync('supabase/migrations/20261111_universal_sudo_user_management.sql', 'utf8');
  console.log('Applying migration 20261111_universal_sudo_user_management.sql...');
  await client.query(sql);
  console.log('Migration applied successfully!');

  // Verify table existence
  const tRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'admin_sudo_audit_logs'
  `);
  console.log('Verified table admin_sudo_audit_logs:', tRes.rows);

  // Verify functions
  const fRes = await client.query(`
    SELECT proname 
    FROM pg_proc 
    WHERE proname IN ('execute_sudo_user_action', 'get_sudo_audit_logs', 'get_admin_consumers')
  `);
  console.log('Verified functions:', fRes.rows.map(r => r.proname));

  await client.end();
}

deploy().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
