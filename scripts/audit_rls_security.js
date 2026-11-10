const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function audit() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- Connected to Supabase PostgreSQL ---');

  // 1. Tables and RLS status
  const tables = await client.query(`
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  console.log('=== TABLES & RLS STATUS ===');
  console.table(tables.rows);

  // 2. Existing RLS policies
  const policies = await client.query(`
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  console.log('\n=== POLICIES IN PUBLIC SCHEMA ===');
  policies.rows.forEach(p => {
    console.log(`[${p.tablename}] "${p.policyname}" | CMD: ${p.cmd} | ROLES: ${p.roles} | PERMISSIVE: ${p.permissive}`);
    console.log(`  QUAL: ${p.qual}`);
    if (p.with_check) console.log(`  WITH CHECK: ${p.with_check}`);
  });

  // 3. Storage buckets and policies
  const buckets = await client.query(`SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;`);
  console.log('\n=== STORAGE BUCKETS ===');
  console.table(buckets.rows);

  const storagePolicies = await client.query(`
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
    ORDER BY tablename, policyname;
  `);
  console.log('\n=== STORAGE POLICIES ===');
  storagePolicies.rows.forEach(p => {
    console.log(`[${p.tablename}] "${p.policyname}" | CMD: ${p.cmd} | ROLES: ${p.roles}`);
    console.log(`  QUAL: ${p.qual}`);
    if (p.with_check) console.log(`  WITH CHECK: ${p.with_check}`);
  });

  // 4. SECURITY DEFINER functions check search_path
  const secDefFns = await client.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      p.prosecdef as is_security_definer,
      p.proconfig as config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `);
  console.log('\n=== SECURITY DEFINER FUNCTIONS ===');
  console.table(secDefFns.rows);

  await client.end();
}

audit().catch(console.error);
