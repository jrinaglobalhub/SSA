const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function checkFns() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const secDefFns = await client.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      p.proconfig as config,
      pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `);

  console.log(`Found ${secDefFns.rows.length} SECURITY DEFINER functions in public schema.`);
  secDefFns.rows.forEach(r => {
    const hasSearchPath = r.config && r.config.some(c => c.includes('search_path'));
    if (!hasSearchPath) {
      console.log(`\n>>> FUNCTION WITHOUT search_path: ${r.proname}(${r.args})`);
      console.log(r.def.slice(0, 300) + '...\n');
    }
  });

  await client.end();
}

checkFns().catch(console.error);
