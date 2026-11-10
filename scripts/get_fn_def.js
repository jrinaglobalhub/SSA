const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function getFunctionDef(name) {
  const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const res = await client.query(`
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = $1;
    `, [name]);

    if (res.rows[0]) {
      console.log(`--- Function definition for ${name} ---`);
      console.log(res.rows[0].def);
    } else {
      console.log(`Function ${name} not found`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

getFunctionDef('resolve_customer_by_code');
getFunctionDef('admin_review_spotlight_campaign');
