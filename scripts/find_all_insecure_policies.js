const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function findInsecure() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, cmd;
  `);

  console.log('--- ALL POLICIES WITH "true" OR OPEN ACCESS ---');
  res.rows.forEach(r => {
    const isQualTrue = r.qual === 'true';
    const isCheckTrue = r.with_check === 'true';
    const hasAnon = r.roles.includes('anon') || r.roles.includes('public');
    if (isQualTrue || isCheckTrue || hasAnon) {
      console.log(`[${r.tablename}] "${r.policyname}" | CMD: ${r.cmd} | ROLES: ${r.roles}`);
      console.log(`  QUAL: ${r.qual}`);
      console.log(`  WITH CHECK: ${r.with_check}\n`);
    }
  });

  await client.end();
}

findInsecure().catch(console.error);
