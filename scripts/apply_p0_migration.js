const fs = require('fs');
const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function deployMigration() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- Applying P0 Critical RLS Security Hardening Migration ---');
  const sql = fs.readFileSync('c:/Users/Muhammad J R/Documents/JRINA/SSA App/supabase/migrations/20261103_p0_database_rls_security_hardening.sql', 'utf8');

  try {
    await client.query(sql);
    console.log('>>> Migration successfully applied and committed! <<<');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

deployMigration().catch(console.error);
