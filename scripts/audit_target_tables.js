const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function checkSpecific() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tablesToCheck = ['orders', 'order_items', 'bills', 'bill_items', 'chat_messages', 'delivery_jobs', 'delivery_partners', 'delivery_partner_applications', 'delivery_assignments', 'delivery_settlements', 'delivery_location_logs', 'delivery_chat_messages'];

  for (const t of tablesToCheck) {
    const res = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = $1;
    `, [t]);
    console.log(`\n=================== TABLE: ${t} (${res.rows.length} policies) ===================`);
    res.rows.forEach(r => {
      console.log(`POLICY: "${r.policyname}" | CMD: ${r.cmd} | ROLES: ${r.roles}`);
      console.log(`  QUAL: ${r.qual}`);
      console.log(`  WITH CHECK: ${r.with_check}`);
    });
  }

  // Also check grants on these tables for anon and authenticated
  console.log('\n=================== TABLE PRIVILEGES (anon & authenticated) ===================');
  const grants = await client.query(`
    SELECT grantee, table_name, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated') AND table_name = ANY($1)
    ORDER BY table_name, grantee, privilege_type;
  `, [tablesToCheck]);
  
  const grantMap = {};
  grants.rows.forEach(g => {
    const key = `${g.table_name} (${g.grantee})`;
    if (!grantMap[key]) grantMap[key] = [];
    grantMap[key].push(g.privilege_type);
  });
  console.log(grantMap);

  await client.end();
}

checkSpecific().catch(console.error);
