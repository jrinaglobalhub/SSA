const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');
const client = new Client({
  connectionString: 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Creating private delivery-docs storage bucket...');
  await client.query(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'delivery-docs',
      'delivery-docs',
      false,
      10485760, -- 10MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    -- RLS Policies on storage.objects for delivery-docs
    DROP POLICY IF EXISTS "Authenticated users can upload delivery docs" ON storage.objects;
    CREATE POLICY "Authenticated users can upload delivery docs" ON storage.objects
      FOR INSERT TO public
      WITH CHECK (bucket_id = 'delivery-docs');

    DROP POLICY IF EXISTS "Authorized users view delivery docs" ON storage.objects;
    CREATE POLICY "Authorized users view delivery docs" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'delivery-docs'
        AND (
          (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
          OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
          OR (auth.jwt() ->> 'role') = 'service_role'
          OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
        )
      );
  `);
  console.log('Private delivery-docs bucket created successfully!');
  await client.end();
}
run().catch(console.error);
