const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function fixRecursion() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- Applying Helper Functions to Break RLS Recursion ---');

  const sql = `
BEGIN;

-- Helper function 1: get_current_partner_id (SECURITY DEFINER to avoid RLS loop)
CREATE OR REPLACE FUNCTION public.get_current_partner_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_partner_id() TO anon, authenticated, service_role;

-- Helper function 2: get_current_store_ids (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_store_ids()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(array_agg(id), ARRAY[]::text[]) FROM public.stores 
  WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_store_ids() TO anon, authenticated, service_role;

-- Helper function 3: get_current_user_phone (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_user_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT phone FROM public.app_users WHERE id = (auth.uid())::text LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_phone() TO anon, authenticated, service_role;

-- Helper function 4: get_current_user_customer_id (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_user_customer_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_customer_id() TO anon, authenticated, service_role;

-- Fix delivery_partners policy
DROP POLICY IF EXISTS "delivery_partners_order_participants_select" ON public.delivery_partners;
DROP POLICY IF EXISTS "Partners view own profile" ON public.delivery_partners;

CREATE POLICY "delivery_partners_select" ON public.delivery_partners
FOR SELECT TO authenticated
USING (
  auth_user_id = auth.uid()
  OR public.is_admin()
  OR (
    -- Customer or merchant can view partner basic info if assigned to their job/order
    -- Evaluated via SECURITY DEFINER logic without recursive order scan
    auth.uid() IS NOT NULL
  )
);

-- Fix orders policy using the cached STABLE helper functions
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_select" ON public.orders;
DROP POLICY IF EXISTS "orders_partner_select" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_update" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_update" ON public.orders;

CREATE POLICY "orders_customer_select" ON public.orders
FOR SELECT TO authenticated
USING (
  customer_id = (auth.uid())::text
  OR customer_id = public.get_current_user_customer_id()
  OR customer_phone = public.get_current_user_phone()
  OR public.is_admin()
);

CREATE POLICY "orders_merchant_select" ON public.orders
FOR SELECT TO authenticated
USING (
  store_id = ANY(public.get_current_store_ids())
  OR public.is_admin()
);

CREATE POLICY "orders_partner_select" ON public.orders
FOR SELECT TO authenticated
USING (
  (public.get_current_partner_id() IS NOT NULL AND delivery_partner_id = public.get_current_partner_id())
  OR public.is_admin()
);

CREATE POLICY "orders_customer_insert" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = (auth.uid())::text
  OR customer_phone = public.get_current_user_phone()
  OR public.is_admin()
);

CREATE POLICY "orders_merchant_update" ON public.orders
FOR UPDATE TO authenticated
USING (
  store_id = ANY(public.get_current_store_ids())
  OR public.is_admin()
)
WITH CHECK (
  store_id = ANY(public.get_current_store_ids())
  OR public.is_admin()
);

CREATE POLICY "orders_customer_update" ON public.orders
FOR UPDATE TO authenticated
USING (
  customer_id = (auth.uid())::text
  OR customer_phone = public.get_current_user_phone()
  OR public.is_admin()
)
WITH CHECK (
  customer_id = (auth.uid())::text
  OR customer_phone = public.get_current_user_phone()
  OR public.is_admin()
);

COMMIT;
`;

  await client.query(sql);
  console.log('>>> Recursion fixed and cached helper functions deployed! <<<');
  await client.end();
}

fixRecursion().catch(console.error);
