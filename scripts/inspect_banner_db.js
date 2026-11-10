const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

async function inspect() {
  const client = new Client({
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.tpcrwtxtqvvdghtfckea',
    password: 'password@2026/jrina',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('=== 1. spotlight_campaigns COLUMNS ===');
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spotlight_campaigns'
    ORDER BY ordinal_position;
  `);
  console.log(cols.rows);

  console.log('\n=== 2. spotlight_campaigns CONSTRAINTS ===');
  const cons = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'public.spotlight_campaigns'::regclass;
  `);
  console.log(cons.rows);

  console.log('\n=== 3. stores COLUMNS related to owner ===');
  const storeCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stores';
  `);
  console.log(storeCols.rows.map(r => r.column_name));

  console.log('\n=== 4. Check app_users table ===');
  const appUsers = await client.query(`SELECT id, username, full_name, phone, role FROM public.app_users LIMIT 5;`);
  console.log(appUsers.rows);

  console.log('\n=== 5. Check if any slot table exists ===');
  const slotTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name ILIKE '%slot%';
  `);
  console.log(slotTables.rows);

  await client.end();
}

inspect().catch(console.error);
