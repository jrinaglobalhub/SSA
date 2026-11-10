-- =========================================================================
-- MIGRATION: 20261103_p0_database_rls_security_hardening.sql
-- DESCRIPTION: P0 Critical RLS Security Lockdown for SmartShopper Ecosystem
-- AUTHOR: SmartShopper Security & Database Architecture Team
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. CENTRALIZED SECURE ADMIN VERIFICATION FUNCTION
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    -- Service role is always admin
    (auth.jwt() ->> 'role') = 'service_role'
    OR
    -- Supabase app_metadata admin role
    ((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin')
    OR
    -- Verified admin or super_admin in app_users
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (auth.uid())::text
        AND role IN ('admin', 'super_admin')
    )
    OR
    -- Authorized JRINA Founder / Executive email
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND (
          email = 'info@jrina.online' 
          OR email = 'founder@jrina.online' 
          OR email = 'jrinaglobalhub@gmail.com'
          OR email ILIKE '%@jrina.online'
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Ensure Founder account has super_admin role in app_users
UPDATE public.app_users
SET role = 'super_admin'
WHERE id IN (
  SELECT id::text FROM auth.users 
  WHERE email IN ('info@jrina.online', 'founder@jrina.online', 'jrinaglobalhub@gmail.com')
);

-- -------------------------------------------------------------------------
-- 2. ORDERS SECURITY LOCKDOWN
-- -------------------------------------------------------------------------
-- Drop dangerous open/true policies
DROP POLICY IF EXISTS "Orders read policy" ON public.orders;
DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
DROP POLICY IF EXISTS "Orders update policy" ON public.orders;

-- Drop older policies if present to ensure clean state
DROP POLICY IF EXISTS "orders_authenticated_customer_select" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_select" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_update" ON public.orders;
DROP POLICY IF EXISTS "orders_partner_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_update" ON public.orders;

-- Revoke direct permissions from anonymous users
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- Enable and force RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customer SELECT: Read only own orders
CREATE POLICY "orders_customer_select" ON public.orders
FOR SELECT TO authenticated
USING (
  customer_id = (auth.uid())::text
  OR customer_id IN (SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text)
  OR customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
  OR public.is_admin()
);

-- Merchant SELECT: Access orders belonging to verified store
CREATE POLICY "orders_merchant_select" ON public.orders
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT stores.id FROM public.stores 
    WHERE stores.owner_id = (auth.uid())::text OR stores.id = (auth.uid())::text
  )
  OR public.is_admin()
);

-- Delivery Partner SELECT: Access assigned orders or orders linked to assigned jobs
CREATE POLICY "orders_partner_select" ON public.orders
FOR SELECT TO authenticated
USING (
  delivery_partner_id IN (
    SELECT delivery_partners.id FROM public.delivery_partners 
    WHERE delivery_partners.auth_user_id = auth.uid()
  )
  OR id IN (
    SELECT delivery_jobs.order_id FROM public.delivery_jobs 
    WHERE delivery_jobs.assigned_partner_id IN (
      SELECT delivery_partners.id FROM public.delivery_partners 
      WHERE delivery_partners.auth_user_id = auth.uid()
    )
  )
  OR public.is_admin()
);

-- Customer INSERT: Create order only for authenticated identity
CREATE POLICY "orders_customer_insert" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  (
    customer_id = (auth.uid())::text 
    OR customer_id IN (SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text)
    OR customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
  )
  OR public.is_admin()
);

-- Merchant UPDATE: Update only permitted store orders
CREATE POLICY "orders_merchant_update" ON public.orders
FOR UPDATE TO authenticated
USING (
  store_id IN (
    SELECT stores.id FROM public.stores 
    WHERE stores.owner_id = (auth.uid())::text OR stores.id = (auth.uid())::text
  )
  OR public.is_admin()
)
WITH CHECK (
  store_id IN (
    SELECT stores.id FROM public.stores 
    WHERE stores.owner_id = (auth.uid())::text OR stores.id = (auth.uid())::text
  )
  OR public.is_admin()
);

-- Customer UPDATE: Update only own order (e.g. customer cancellation)
CREATE POLICY "orders_customer_update" ON public.orders
FOR UPDATE TO authenticated
USING (
  customer_id = (auth.uid())::text
  OR customer_id IN (SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text)
  OR customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
  OR public.is_admin()
)
WITH CHECK (
  customer_id = (auth.uid())::text
  OR customer_id IN (SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text)
  OR customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
  OR public.is_admin()
);

-- -------------------------------------------------------------------------
-- 3. ORDER ITEMS SECURITY LOCKDOWN
-- -------------------------------------------------------------------------
-- Drop dangerous open/true policies
DROP POLICY IF EXISTS "Order items read policy" ON public.order_items;
DROP POLICY IF EXISTS "Order items insert policy" ON public.order_items;
DROP POLICY IF EXISTS "Order items update policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_scoped_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update" ON public.order_items;

-- Revoke direct permissions from anonymous users
REVOKE ALL ON public.order_items FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Only visible to authorized participants of the parent order
CREATE POLICY "order_items_select" ON public.order_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.customer_id = (auth.uid())::text
        OR o.customer_id IN (SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text)
        OR o.customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
        OR o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
        OR o.delivery_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
        OR id IN (
          SELECT delivery_jobs.order_id FROM public.delivery_jobs 
          WHERE delivery_jobs.assigned_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
        )
        OR public.is_admin()
      )
  )
);

-- INSERT: Customer inserting items for own order, or Merchant for own order, or Admin
CREATE POLICY "order_items_insert" ON public.order_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.customer_id = (auth.uid())::text
        OR o.customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
        OR o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
        OR public.is_admin()
      )
  )
);

-- UPDATE: Merchant updating preparation/replacement status on store order items, or Admin
CREATE POLICY "order_items_update" ON public.order_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
        OR public.is_admin()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
        OR public.is_admin()
      )
  )
);

-- -------------------------------------------------------------------------
-- 4. ORDER STATUS HISTORY LOCKDOWN
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "order_status_history_anon_select" ON public.order_status_history;
DROP POLICY IF EXISTS "Order status history read" ON public.order_status_history;
DROP POLICY IF EXISTS "Order status history insert" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_select" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_insert" ON public.order_status_history;

REVOKE ALL ON public.order_status_history FROM anon;
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_history_select" ON public.order_status_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND (
        o.customer_id = (auth.uid())::text
        OR o.customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
        OR o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
        OR o.delivery_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
        OR public.is_admin()
      )
  )
);

CREATE POLICY "order_status_history_insert" ON public.order_status_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND (
        o.customer_id = (auth.uid())::text
        OR o.customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
        OR o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
        OR o.delivery_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
        OR public.is_admin()
      )
  )
);

-- -------------------------------------------------------------------------
-- 5. DELIVERY LOGISTICS SECURITY LOCKDOWN
-- -------------------------------------------------------------------------
-- Delivery jobs: Drop anonymous access
DROP POLICY IF EXISTS "delivery_jobs_anon_select" ON public.delivery_jobs;
REVOKE ALL ON public.delivery_jobs FROM anon;
GRANT SELECT, UPDATE ON public.delivery_jobs TO authenticated;
GRANT ALL ON public.delivery_jobs TO service_role;

-- Delivery partners: Drop anonymous access
DROP POLICY IF EXISTS "delivery_partners_anon_select" ON public.delivery_partners;
DROP POLICY IF EXISTS "delivery_partners_order_participants_select" ON public.delivery_partners;
REVOKE ALL ON public.delivery_partners FROM anon;
GRANT SELECT, UPDATE ON public.delivery_partners TO authenticated;
GRANT ALL ON public.delivery_partners TO service_role;

-- Allow order customer / merchant to view assigned partner basic details
CREATE POLICY "delivery_partners_order_participants_select" ON public.delivery_partners
FOR SELECT TO authenticated
USING (
  auth_user_id = auth.uid()
  OR id IN (
    SELECT o.delivery_partner_id FROM public.orders o
    WHERE (
      o.customer_id = (auth.uid())::text 
      OR o.customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
      OR o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
    )
    AND o.delivery_partner_id IS NOT NULL
  )
  OR public.is_admin()
);

-- Revoke anonymous access on delivery_assignments, delivery_location_logs, delivery_settlements, delivery_chat_messages
REVOKE ALL ON public.delivery_assignments FROM anon;
REVOKE ALL ON public.delivery_location_logs FROM anon;
REVOKE ALL ON public.delivery_settlements FROM anon;
REVOKE ALL ON public.delivery_chat_messages FROM anon;

-- Revoke anonymous access on chat_messages
REVOKE ALL ON public.chat_messages FROM anon;

-- -------------------------------------------------------------------------
-- 6. PUSH NOTIFICATION LOGS & STORE CUSTOM CATEGORIES LOCKDOWN
-- -------------------------------------------------------------------------
-- push_delivery_logs
DROP POLICY IF EXISTS "Allow select push_delivery_logs" ON public.push_delivery_logs;
DROP POLICY IF EXISTS "Allow insert push_delivery_logs" ON public.push_delivery_logs;
REVOKE ALL ON public.push_delivery_logs FROM anon;
GRANT ALL ON public.push_delivery_logs TO service_role;

CREATE POLICY "push_delivery_logs_admin_select" ON public.push_delivery_logs
FOR SELECT TO authenticated
USING (public.is_admin());

-- store_custom_categories
DROP POLICY IF EXISTS "Allow merchants to delete custom categories" ON public.store_custom_categories;
DROP POLICY IF EXISTS "Allow merchants to insert custom categories" ON public.store_custom_categories;
DROP POLICY IF EXISTS "Allow public read on store_custom_categories" ON public.store_custom_categories;
DROP POLICY IF EXISTS "custom_categories_select" ON public.store_custom_categories;
DROP POLICY IF EXISTS "custom_categories_insert" ON public.store_custom_categories;
DROP POLICY IF EXISTS "custom_categories_update" ON public.store_custom_categories;
DROP POLICY IF EXISTS "custom_categories_delete" ON public.store_custom_categories;

ALTER TABLE public.store_custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_categories_select" ON public.store_custom_categories
FOR SELECT TO public
USING (true);

CREATE POLICY "custom_categories_insert" ON public.store_custom_categories
FOR INSERT TO authenticated
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
  OR public.is_admin()
);

CREATE POLICY "custom_categories_update" ON public.store_custom_categories
FOR UPDATE TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
  OR public.is_admin()
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
  OR public.is_admin()
);

CREATE POLICY "custom_categories_delete" ON public.store_custom_categories
FOR DELETE TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
  OR public.is_admin()
);

-- spotlight_campaigns
DROP POLICY IF EXISTS "p_spotlight_campaigns_insert" ON public.spotlight_campaigns;
DROP POLICY IF EXISTS "spotlight_campaigns_store_owner_insert" ON public.spotlight_campaigns;

CREATE POLICY "spotlight_campaigns_store_owner_insert" ON public.spotlight_campaigns
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = spotlight_campaigns.store_id
      AND (stores.owner_id = (auth.uid())::text OR stores.id = (auth.uid())::text)
  )
  OR public.is_admin()
);

-- -------------------------------------------------------------------------
-- 7. STORAGE OBJECTS HARDENING (delivery-docs)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload delivery docs" ON storage.objects;
DROP POLICY IF EXISTS "delivery_docs_upload_scoped" ON storage.objects;

CREATE POLICY "delivery_docs_upload_scoped" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-docs'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR
    EXISTS (
      SELECT 1 FROM public.delivery_partners dp
      WHERE dp.auth_user_id = auth.uid()
        AND (storage.foldername(name))[1] = REPLACE(REPLACE(dp.phone, '+', ''), ' ', '')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.delivery_partner_applications dpa
      WHERE dpa.auth_user_id = auth.uid()
        AND (storage.foldername(name))[1] = REPLACE(REPLACE(dpa.phone, '+', ''), ' ', '')
    )
    OR
    public.is_admin()
  )
);

-- -------------------------------------------------------------------------
-- 8. SECURITY DEFINER SEARCH PATH REPAIRS
-- -------------------------------------------------------------------------
ALTER FUNCTION public.admin_review_spotlight_campaign(text, text, text, text, timestamp with time zone, timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.attach_spotlight_payment_order(text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_chat_rate_limit(text, integer, interval) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_spotlight_application(text, text, text, text, text, jsonb, timestamp with time zone, integer, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.fetch_merchant_spotlight_campaigns(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_product_description_ai(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_spotlight_banners(numeric, numeric, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_eligible_push_tokens_for_deal(text, numeric, numeric, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_recipient_push_tokens_for_chat(text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_spotlight_pricing() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_push_on_new_chat_message() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_push_on_new_offer() SET search_path = public, pg_temp;
ALTER FUNCTION public.verify_spotlight_payment(text, text, text, text, numeric, text) SET search_path = public, pg_temp;

COMMIT;
