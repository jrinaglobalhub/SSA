-- =========================================================================
-- SMARTSHOPPER ECOSYSTEM COMPLETE PRODUCTION RECOVERY & SECURITY MIGRATION
-- Target: Shared Supabase PostgreSQL (tpcrwtxtqvvdghtfckea)
-- Ecosystem Integration: SSC (Consumer), SSM (Merchant), SSD (Delivery), SSA (Admin)
-- Version: 3.1.0 (Idempotent, Safe Schema Patching)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. EXTEND PUBLIC.ORDERS WITH DELIVERY REFERENCES
-- =========================================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_partner_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_job_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_partner ON public.orders(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_job ON public.orders(delivery_job_id);

-- =========================================================================
-- 2. CREATE / PATCH DELIVERY PARTNER APPLICATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_ref TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'BIKE',
  vehicle_reg_number TEXT NOT NULL,
  is_own_vehicle BOOLEAN NOT NULL DEFAULT true,
  license_photo_url TEXT NOT NULL,
  vehicle_photo_url TEXT NOT NULL,
  noc_document_url TEXT,
  noc_document_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS admin_remarks TEXT;
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS correction_requested_fields TEXT[];
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS verification_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS operating_state TEXT NOT NULL DEFAULT 'Kerala';
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.delivery_partner_applications ADD COLUMN IF NOT EXISTS driving_licence_number TEXT;

CREATE INDEX IF NOT EXISTS idx_partner_apps_ref ON public.delivery_partner_applications(application_ref);
CREATE INDEX IF NOT EXISTS idx_partner_apps_phone ON public.delivery_partner_applications(phone);
CREATE INDEX IF NOT EXISTS idx_partner_apps_email ON public.delivery_partner_applications(email);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON public.delivery_partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_apps_auth_user ON public.delivery_partner_applications(auth_user_id);

-- =========================================================================
-- 3. CREATE / PATCH DELIVERY PARTNERS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id TEXT PRIMARY KEY DEFAULT ('partner_' || replace(gen_random_uuid()::text, '-', '')),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_ref TEXT REFERENCES public.delivery_partner_applications(application_ref) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'BIKE',
  vehicle_reg_number TEXT NOT NULL,
  vehicle_photo_url TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_lat NUMERIC(10, 6) DEFAULT 8.727312,
  current_lng NUMERIC(10, 6) DEFAULT 77.044753,
  location_updated_at TIMESTAMPTZ DEFAULT NOW(),
  rating NUMERIC(3, 2) DEFAULT 5.0,
  total_deliveries INT DEFAULT 0,
  active_job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS operating_state TEXT NOT NULL DEFAULT 'Kerala';
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'ENGLISH';
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS bank_account_masked TEXT;
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;

CREATE INDEX IF NOT EXISTS idx_delivery_partners_online ON public.delivery_partners(is_online, is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_partners_auth ON public.delivery_partners(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partners_location ON public.delivery_partners(current_lat, current_lng);

-- =========================================================================
-- 4. CREATE / PATCH DELIVERY JOBS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_jobs (
  id TEXT PRIMARY KEY DEFAULT ('job_' || replace(gen_random_uuid()::text, '-', '')),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  bill_id TEXT REFERENCES public.bills(id) ON DELETE SET NULL,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  store_name TEXT NOT NULL,
  store_address TEXT NOT NULL,
  store_phone TEXT,
  store_lat NUMERIC(10, 6) NOT NULL DEFAULT 8.727312,
  store_lng NUMERIC(10, 6) NOT NULL DEFAULT 77.044753,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_lat NUMERIC(10, 6),
  customer_lng NUMERIC(10, 6),
  assigned_partner_id TEXT REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_ACCEPTANCE' CHECK (
    status IN (
      'PENDING_ACCEPTANCE',
      'ASSIGNED',
      'ARRIVED_AT_STORE',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED_AT_DROP',
      'DELIVERED',
      'CANCELLED'
    )
  ),
  items JSONB DEFAULT '[]'::jsonb,
  items_count INT DEFAULT 1,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 60,
  distance_km NUMERIC(5, 2) DEFAULT 3.0,
  estimated_minutes INT DEFAULT 15,
  special_instructions TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_jobs ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.delivery_jobs ADD COLUMN IF NOT EXISTS otp_attempt_count INT DEFAULT 0;
ALTER TABLE public.delivery_jobs ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON public.delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_partner ON public.delivery_jobs(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_order ON public.delivery_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_store ON public.delivery_jobs(store_id);

-- =========================================================================
-- 5. CREATE / PATCH DELIVERY ASSIGNMENTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OFFERED' CHECK (status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'DECLINED', 'EXPIRED', 'COMPLETED', 'CANCELLED')),
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  decline_reason TEXT,
  CONSTRAINT uq_job_partner_assignment UNIQUE (job_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_job ON public.delivery_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_assignments_partner ON public.delivery_assignments(partner_id);

-- =========================================================================
-- 6. CREATE / PATCH DELIVERY LOCATION LOGS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_location_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT REFERENCES public.delivery_jobs(id) ON DELETE SET NULL,
  partner_id TEXT NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  lat NUMERIC(10, 6) NOT NULL,
  lng NUMERIC(10, 6) NOT NULL,
  speed NUMERIC(5, 2),
  heading NUMERIC(5, 2),
  altitude NUMERIC(6, 2),
  accuracy NUMERIC(5, 2),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_logs_job ON public.delivery_location_logs(job_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_loc_logs_partner ON public.delivery_location_logs(partner_id, logged_at DESC);

-- =========================================================================
-- 7. CREATE DELIVERY CHAT MESSAGES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('partner', 'customer', 'store', 'system')),
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_chat_job ON public.delivery_chat_messages(job_id, created_at ASC);

-- =========================================================================
-- 8. CREATE DELIVERY SETTLEMENTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES public.delivery_partners(id) ON DELETE RESTRICT,
  settlement_ref TEXT UNIQUE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  completed_deliveries_count INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  payment_method TEXT DEFAULT 'BANK_TRANSFER',
  transaction_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_partner ON public.delivery_settlements(partner_id, created_at DESC);

-- =========================================================================
-- 9. LEAST-PRIVILEGE ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS across all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settlements ENABLE ROW LEVEL SECURITY;

-- 9.1 ORDERS & ORDER ITEMS SECURITY HARMONIZATION
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can update order items" ON public.order_items;

DROP POLICY IF EXISTS "orders_authenticated_customer_select" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_select" ON public.orders;
DROP POLICY IF EXISTS "orders_partner_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_authenticated_customer_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_merchant_update" ON public.orders;
DROP POLICY IF EXISTS "orders_service_role" ON public.orders;

-- Authenticated customers can view only their own orders
CREATE POLICY "orders_authenticated_customer_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id = (auth.uid())::text
    OR customer_id IN (SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text)
    OR customer_phone = (SELECT phone FROM public.app_users WHERE id = (auth.uid())::text)
  );

-- Merchants can view and update orders belonging to their store
CREATE POLICY "orders_merchant_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text
    )
  );

CREATE POLICY "orders_merchant_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text
    )
  );

-- Delivery partners can view orders assigned to them
CREATE POLICY "orders_partner_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    delivery_partner_id IN (
      SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid()
    )
    OR id IN (
      SELECT order_id FROM public.delivery_jobs 
      WHERE assigned_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
    )
  );

-- Admins have full operational access
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "orders_service_role" ON public.orders
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "order_items_scoped_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_service_role" ON public.order_items;

CREATE POLICY "order_items_scoped_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        o.customer_id = (auth.uid())::text
        OR o.customer_id IN (SELECT customer_id FROM public.app_users WHERE id = (auth.uid())::text)
        OR o.store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
        OR o.delivery_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = (auth.uid())::text AND au.role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "order_items_service_role" ON public.order_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 9.2 DELIVERY PARTNER APPLICATIONS POLICIES
DROP POLICY IF EXISTS "Anyone can submit partner application" ON public.delivery_partner_applications;
DROP POLICY IF EXISTS "Applicants view own application" ON public.delivery_partner_applications;
DROP POLICY IF EXISTS "Admins manage applications" ON public.delivery_partner_applications;
DROP POLICY IF EXISTS "delivery_partner_apps_service_role" ON public.delivery_partner_applications;

CREATE POLICY "Anyone can submit partner application" ON public.delivery_partner_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Applicants view own application" ON public.delivery_partner_applications
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins manage applications" ON public.delivery_partner_applications
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "delivery_partner_apps_service_role" ON public.delivery_partner_applications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 9.3 DELIVERY PARTNERS POLICIES
DROP POLICY IF EXISTS "Delivery partners select" ON public.delivery_partners;
DROP POLICY IF EXISTS "Delivery partners update" ON public.delivery_partners;
DROP POLICY IF EXISTS "Partners view own profile" ON public.delivery_partners;
DROP POLICY IF EXISTS "Partners update own status" ON public.delivery_partners;
DROP POLICY IF EXISTS "delivery_partners_service_role" ON public.delivery_partners;

CREATE POLICY "Partners view own profile" ON public.delivery_partners
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Partners update own status" ON public.delivery_partners
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "delivery_partners_service_role" ON public.delivery_partners
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 9.4 DELIVERY JOBS POLICIES
DROP POLICY IF EXISTS "Delivery jobs insert" ON public.delivery_jobs;
DROP POLICY IF EXISTS "Delivery jobs select" ON public.delivery_jobs;
DROP POLICY IF EXISTS "Delivery jobs update" ON public.delivery_jobs;
DROP POLICY IF EXISTS "Partners view assigned or available jobs" ON public.delivery_jobs;
DROP POLICY IF EXISTS "Partners update assigned jobs" ON public.delivery_jobs;
DROP POLICY IF EXISTS "delivery_jobs_service_role" ON public.delivery_jobs;

CREATE POLICY "Partners view assigned or available jobs" ON public.delivery_jobs
  FOR SELECT TO authenticated
  USING (
    assigned_partner_id IN (
      SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid()
    )
    OR (status = 'PENDING_ACCEPTANCE' AND assigned_partner_id IS NULL)
    OR customer_id = (auth.uid())::text
    OR store_id IN (SELECT id FROM public.stores WHERE owner_id = (auth.uid())::text OR id = (auth.uid())::text)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Partners update assigned jobs" ON public.delivery_jobs
  FOR UPDATE TO authenticated
  USING (
    assigned_partner_id IN (
      SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "delivery_jobs_service_role" ON public.delivery_jobs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 9.5 ASSIGNMENTS, LOCATION LOGS, CHAT, SETTLEMENTS POLICIES
DROP POLICY IF EXISTS "Delivery assignments insert" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Delivery assignments select" ON public.delivery_assignments;
DROP POLICY IF EXISTS "assignments_partner_policy" ON public.delivery_assignments;

CREATE POLICY "assignments_partner_policy" ON public.delivery_assignments
  FOR ALL TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "location_logs_partner_insert" ON public.delivery_location_logs;
DROP POLICY IF EXISTS "location_logs_select" ON public.delivery_location_logs;

CREATE POLICY "location_logs_partner_insert" ON public.delivery_location_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "location_logs_select" ON public.delivery_location_logs
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
    OR job_id IN (SELECT id FROM public.delivery_jobs WHERE customer_id = (auth.uid())::text)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "delivery_chat_select" ON public.delivery_chat_messages;
DROP POLICY IF EXISTS "delivery_chat_insert" ON public.delivery_chat_messages;

CREATE POLICY "delivery_chat_select" ON public.delivery_chat_messages
  FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.delivery_jobs
      WHERE (
        assigned_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
        OR customer_id = (auth.uid())::text
      )
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

CREATE POLICY "delivery_chat_insert" ON public.delivery_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    job_id IN (
      SELECT id FROM public.delivery_jobs
      WHERE status IN ('ASSIGNED', 'ARRIVED_AT_STORE', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROP')
      AND (
        assigned_partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
        OR customer_id = (auth.uid())::text
      )
    )
  );

DROP POLICY IF EXISTS "settlements_partner_select" ON public.delivery_settlements;
CREATE POLICY "settlements_partner_select" ON public.delivery_settlements
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE auth_user_id = auth.uid())
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  );

-- =========================================================================
-- 10. REVISE SAVE_CUSTOMER_ORDER WITH SERVER-SIDE KERALA & DISTANCE VALIDATION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.save_customer_order(p_order jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id TEXT;
  v_order_number TEXT;
  v_store_id TEXT;
  v_store RECORD;
  v_item JSONB;
  v_item_id TEXT;
  v_item_unit_price NUMERIC(12, 2);
  v_item_qty INT;
  v_distance NUMERIC;
BEGIN
  -- 1. Extract and sanitize order identification
  v_order_id := p_order->>'id';
  IF v_order_id IS NULL OR v_order_id = '' THEN
    v_order_id := 'ord_' || replace(gen_random_uuid()::text, '-', '');
  END IF;

  v_order_number := p_order->>'orderNumber';
  IF v_order_number IS NULL OR v_order_number = '' THEN
    v_order_number := 'SS-ORD-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0');
  END IF;

  v_store_id := p_order->>'storeId';
  IF v_store_id IS NULL OR v_store_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'storeId is required.');
  END IF;

  -- Canonicalize store ID
  SELECT * INTO v_store
  FROM public.stores
  WHERE id = v_store_id
     OR id = ('store_' || v_store_id)
     OR id = REPLACE(v_store_id, 'store_', '')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Specified store was not found.');
  END IF;

  v_store_id := v_store.id;

  -- 2. SERVER-SIDE GEOGRAPHICAL & DISTANCE VALIDATION
  IF NOT public.is_store_kerala_eligible(v_store_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ordering is currently available exclusively for Kerala-based partner stores.');
  END IF;

  v_distance := COALESCE((p_order->>'roadDistanceKm')::numeric, 0);
  IF v_distance > 10.0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery address exceeds maximum 10 km service radius from store.');
  END IF;

  -- 3. Insert or update the order
  INSERT INTO public.orders (
    id,
    order_number,
    store_id,
    customer_id,
    customer_name,
    customer_phone,
    delivery_address,
    item_subtotal,
    delivery_charge,
    platform_fee,
    discount_amount,
    total_amount,
    status,
    payment_method,
    payment_status,
    preparation_status,
    preparation_progress,
    otp,
    otp_verified,
    otp_status,
    road_distance_km,
    store_name,
    store_address,
    store_phone,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_order_number,
    v_store_id,
    COALESCE(p_order->>'customerId', 'CUST-GUEST'),
    COALESCE(p_order->>'customerName', p_order->'deliveryAddress'->>'fullName', 'Customer'),
    COALESCE(p_order->>'customerPhone', p_order->'deliveryAddress'->>'phone', ''),
    COALESCE(p_order->'deliveryAddress', '{}'::jsonb),
    COALESCE((p_order->>'itemSubtotal')::numeric, 0),
    COALESCE((p_order->>'deliveryCharge')::numeric, 0),
    COALESCE((p_order->>'platformFee')::numeric, 1.00),
    COALESCE((p_order->>'discountAmount')::numeric, 0),
    COALESCE((p_order->>'totalCodAmount')::numeric, (p_order->>'totalAmount')::numeric, 0),
    COALESCE(p_order->>'status', 'received'),
    COALESCE(p_order->>'paymentMethod', 'cod'),
    COALESCE(p_order->>'paymentStatus', 'pending'),
    'pending',
    0.00,
    COALESCE(p_order->>'otp', LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0')),
    COALESCE((p_order->>'otpVerified')::boolean, false),
    COALESCE(p_order->>'otpStatus', 'pending'),
    v_distance,
    COALESCE(p_order->>'storeName', v_store.name, 'Partner Store'),
    COALESCE(p_order->>'storeAddress', v_store.address, ''),
    COALESCE(p_order->>'storePhone', v_store.phone, ''),
    p_order->>'notes',
    COALESCE((p_order->>'createdAt')::timestamptz, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    delivery_address = EXCLUDED.delivery_address,
    updated_at = NOW();

  -- 4. Insert line items
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    DELETE FROM public.order_items WHERE order_id = v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      v_item_id := v_item->>'id';
      IF v_item_id IS NULL OR v_item_id = '' THEN
        v_item_id := 'item_' || replace(gen_random_uuid()::text, '-', '');
      END IF;

      IF v_item->>'unitPrice' IS NOT NULL THEN
        v_item_unit_price := (v_item->>'unitPrice')::numeric;
      ELSIF v_item->>'offerPrice' IS NOT NULL THEN
        v_item_unit_price := REGEXP_REPLACE(v_item->>'offerPrice', '[^0-9.]', '', 'g')::numeric;
      ELSE
        v_item_unit_price := 0;
      END IF;

      v_item_qty := COALESCE((v_item->>'quantity')::int, 1);

      INSERT INTO public.order_items (
        id,
        order_id,
        product_id,
        product_name,
        sku,
        category,
        image_url,
        unit_price,
        quantity,
        prepared_quantity,
        is_ready,
        variant,
        specifications,
        is_cancelled,
        created_at,
        updated_at
      ) VALUES (
        v_item_id,
        v_order_id,
        v_item->>'productId',
        COALESCE(v_item->>'productName', v_item->>'name', 'Item'),
        v_item->>'sku',
        v_item->>'category',
        COALESCE(v_item->>'imageUrl', v_item->>'image_url', ''),
        v_item_unit_price,
        v_item_qty,
        COALESCE((v_item->>'preparedQuantity')::int, 0),
        COALESCE((v_item->>'isReady')::boolean, false),
        v_item->'variant',
        v_item->'specifications',
        COALESCE((v_item->>'isCancelled')::boolean, false),
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'store_id', v_store_id
  );
END;
$function$;

-- =========================================================================
-- 11. AUTOMATIC DELIVERY JOB CREATION TRIGGER (ON ORDER 100% READY)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_auto_create_delivery_job_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store RECORD;
  v_existing_job RECORD;
  v_addr JSONB;
  v_customer_lat NUMERIC;
  v_customer_lng NUMERIC;
  v_distance NUMERIC;
  v_payout NUMERIC;
  v_items JSONB;
  v_items_count INT;
  v_job_id TEXT;
BEGIN
  -- Trigger condition: Order becomes 'ready' or 'ready_for_pickup'
  IF (NEW.status IN ('ready', 'ready_for_pickup') AND (OLD.status IS NULL OR OLD.status NOT IN ('ready', 'ready_for_pickup'))) THEN

    -- Prevent duplicate delivery job creation
    SELECT * INTO v_existing_job
    FROM public.delivery_jobs
    WHERE order_id = NEW.id OR order_number = NEW.order_number;

    IF FOUND THEN
      RETURN NEW;
    END IF;

    -- Fetch store details with canonical store ID lookup
    SELECT * INTO v_store
    FROM public.stores
    WHERE id = NEW.store_id 
       OR id = ('store_' || NEW.store_id)
       OR id = REPLACE(NEW.store_id, 'store_', '')
    LIMIT 1;

    v_addr := NEW.delivery_address;
    v_customer_lat := COALESCE((v_addr->>'lat')::NUMERIC, NULL);
    v_customer_lng := COALESCE((v_addr->>'lng')::NUMERIC, NULL);
    v_distance := COALESCE(NEW.road_distance_km, 3.0);
    
    -- Calculate partner payout: base ₹50 + ₹10 per km beyond 2km
    v_payout := GREATEST(50.0, 50.0 + (GREATEST(0, v_distance - 2.0) * 10.0));

    -- Snapshot order items
    SELECT 
      COALESCE(jsonb_agg(jsonb_build_object('id', oi.id, 'name', oi.product_name, 'quantity', oi.quantity, 'unitPrice', oi.unit_price)), '[]'::jsonb),
      COALESCE(SUM(oi.quantity), 1)
    INTO v_items, v_items_count
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id;

    v_job_id := 'job_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.delivery_jobs (
      id,
      order_id,
      order_number,
      store_id,
      store_name,
      store_address,
      store_phone,
      store_lat,
      store_lng,
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      customer_lat,
      customer_lng,
      status,
      items,
      items_count,
      total_amount,
      payout_amount,
      distance_km,
      estimated_minutes,
      created_at
    ) VALUES (
      v_job_id,
      NEW.id,
      NEW.order_number,
      COALESCE(v_store.id, NEW.store_id),
      COALESCE(v_store.name, NEW.store_name, 'Partner Merchant'),
      COALESCE(v_store.address, NEW.store_address, 'Store Address'),
      COALESCE(v_store.phone, NEW.store_phone, ''),
      COALESCE(v_store.lat, 8.727312),
      COALESCE(v_store.lng, 77.044753),
      NEW.customer_id,
      COALESCE(NEW.customer_name, v_addr->>'fullName', 'Customer'),
      COALESCE(NEW.customer_phone, v_addr->>'phone', ''),
      COALESCE(
        CONCAT_WS(', ', v_addr->>'houseDetails', v_addr->>'streetArea', v_addr->>'city', v_addr->>'district', v_addr->>'pincode'),
        'Customer Delivery Address'
      ),
      v_customer_lat,
      v_customer_lng,
      'PENDING_ACCEPTANCE',
      COALESCE(v_items, '[]'::jsonb),
      COALESCE(v_items_count, 1),
      COALESCE(NEW.total_amount, 0),
      v_payout,
      v_distance,
      LEAST(60, GREATEST(10, ROUND(v_distance * 4)::INT)),
      NOW()
    );

    NEW.delivery_job_id := v_job_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_ready_for_delivery ON public.orders;
CREATE TRIGGER trg_order_ready_for_delivery
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_create_delivery_job_from_order();

-- =========================================================================
-- 12. ATOMIC DISPATCH & DELIVERY LIFECYCLE RPCs
-- =========================================================================

-- A. ACCEPT DELIVERY JOB (RACE-CONDITION RESISTANT WITH ROW LOCK)
CREATE OR REPLACE FUNCTION public.rpc_accept_delivery_job(
  p_job_id TEXT,
  p_partner_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job RECORD;
  v_partner RECORD;
BEGIN
  -- 1. Check partner validity and online status
  SELECT * INTO v_partner
  FROM public.delivery_partners
  WHERE id = p_partner_id AND is_active = true AND is_online = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner is offline or inactive. Please go online to accept orders.');
  END IF;

  IF v_partner.active_job_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an active delivery trip in progress.');
  END IF;

  -- 2. Lock job row with FOR UPDATE
  SELECT * INTO v_job
  FROM public.delivery_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery job not found.');
  END IF;

  IF v_job.status != 'PENDING_ACCEPTANCE' OR v_job.assigned_partner_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This delivery has already been assigned to another partner.');
  END IF;

  -- 3. Atomic Assignment
  UPDATE public.delivery_jobs
  SET
    assigned_partner_id = p_partner_id,
    status = 'ASSIGNED',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;

  -- 4. Record Assignment History
  INSERT INTO public.delivery_assignments (job_id, partner_id, status, responded_at)
  VALUES (p_job_id, p_partner_id, 'ACCEPTED', NOW())
  ON CONFLICT (job_id, partner_id) DO UPDATE SET status = 'ACCEPTED', responded_at = NOW();

  -- 5. Update partner active job reference
  UPDATE public.delivery_partners
  SET active_job_id = p_job_id, updated_at = NOW()
  WHERE id = p_partner_id;

  -- 6. Synchronize with public.orders
  UPDATE public.orders
  SET 
    delivery_partner_id = p_partner_id,
    delivery_job_id = p_job_id,
    updated_at = NOW()
  WHERE id = v_job.order_id OR order_number = v_job.order_number;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'partner_id', p_partner_id,
    'status', 'ASSIGNED'
  );
END;
$$;

-- B. DECLINE DELIVERY JOB
CREATE OR REPLACE FUNCTION public.rpc_decline_delivery_job(
  p_job_id TEXT,
  p_partner_id TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.delivery_assignments (job_id, partner_id, status, responded_at, decline_reason)
  VALUES (p_job_id, p_partner_id, 'DECLINED', NOW(), p_reason)
  ON CONFLICT (job_id, partner_id) DO UPDATE SET status = 'DECLINED', responded_at = NOW(), decline_reason = p_reason;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- C. STORE PICKUP CONFIRMATION
CREATE OR REPLACE FUNCTION public.rpc_confirm_store_pickup(
  p_job_id TEXT,
  p_partner_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT * INTO v_job
  FROM public.delivery_jobs
  WHERE id = p_job_id AND assigned_partner_id = p_partner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job assignment not found for this partner.');
  END IF;

  UPDATE public.delivery_jobs
  SET
    status = 'PICKED_UP',
    picked_up_at = NOW(),
    pickup_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;

  -- Synchronize with public.orders (SSC & SSM realtime listener sees out_for_delivery)
  UPDATE public.orders
  SET status = 'out_for_delivery', updated_at = NOW()
  WHERE id = v_job.order_id OR order_number = v_job.order_number;

  RETURN jsonb_build_object('success', true, 'status', 'PICKED_UP');
END;
$$;

-- D. VERIFY AND COMPLETE DELIVERY (STRICT SERVER OTP VERIFICATION)
CREATE OR REPLACE FUNCTION public.rpc_verify_and_complete_delivery(
  p_job_id TEXT,
  p_partner_id TEXT,
  p_entered_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job RECORD;
  v_order RECORD;
  v_expected_otp TEXT;
  v_settlement_ref TEXT;
BEGIN
  SELECT * INTO v_job
  FROM public.delivery_jobs
  WHERE id = p_job_id AND assigned_partner_id = p_partner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active job assignment not found for this partner.');
  END IF;

  IF v_job.otp_attempt_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum OTP verification attempts exceeded. Please contact SmartShopper support.');
  END IF;

  -- Retrieve authoritative OTP from public.orders
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_job.order_id OR order_number = v_job.order_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated customer order was not found.');
  END IF;

  v_expected_otp := TRIM(COALESCE(v_order.otp, ''));

  IF v_expected_otp = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No OTP registered for this order in backend.');
  END IF;

  IF TRIM(p_entered_otp) != v_expected_otp THEN
    UPDATE public.delivery_jobs
    SET otp_attempt_count = otp_attempt_count + 1
    WHERE id = p_job_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid OTP. Please ask customer to read the 4-digit OTP shown in their SmartShopper app.',
      'attempts_left', 5 - (v_job.otp_attempt_count + 1)
    );
  END IF;

  -- OTP Verified! Complete delivery atomically
  UPDATE public.delivery_jobs
  SET
    status = 'DELIVERED',
    delivered_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;

  -- Clear partner active job and increment delivery count
  UPDATE public.delivery_partners
  SET
    active_job_id = NULL,
    total_deliveries = total_deliveries + 1,
    updated_at = NOW()
  WHERE id = p_partner_id;

  -- Synchronize with public.orders (SSC & SSM)
  UPDATE public.orders
  SET
    status = 'delivered',
    payment_status = 'collected',
    otp_verified = true,
    otp_status = 'verified',
    delivered_at = NOW(),
    updated_at = NOW()
  WHERE id = v_job.order_id OR order_number = v_job.order_number;

  -- Record settlement entry for driver payout
  v_settlement_ref := 'SETTLE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0');
  INSERT INTO public.delivery_settlements (
    partner_id,
    settlement_ref,
    amount,
    period_start,
    period_end,
    completed_deliveries_count,
    status,
    transaction_ref,
    created_at
  ) VALUES (
    p_partner_id,
    v_settlement_ref,
    v_job.payout_amount,
    NOW(),
    NOW(),
    1,
    'PENDING',
    'ORDER-' || COALESCE(v_job.order_number, v_job.order_id),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Delivery verified and completed successfully!',
    'job_id', p_job_id,
    'payout_amount', v_job.payout_amount,
    'collected_cod', v_job.total_amount
  );
END;
$$;

-- E. PARTNER AVAILABILITY & HEARTBEAT RPC
CREATE OR REPLACE FUNCTION public.rpc_update_partner_heartbeat(
  p_partner_id TEXT,
  p_is_online BOOLEAN,
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.delivery_partners
  SET
    is_online = p_is_online,
    last_heartbeat_at = NOW(),
    current_lat = COALESCE(p_lat, current_lat),
    current_lng = COALESCE(p_lng, current_lng),
    location_updated_at = CASE WHEN p_lat IS NOT NULL THEN NOW() ELSE location_updated_at END,
    updated_at = NOW()
  WHERE id = p_partner_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- F. QUERY AVAILABLE JOBS FOR DELIVERY PARTNER
CREATE OR REPLACE FUNCTION public.rpc_get_available_delivery_jobs(
  p_partner_id TEXT,
  p_partner_lat NUMERIC DEFAULT NULL,
  p_partner_lng NUMERIC DEFAULT NULL,
  p_max_radius_km NUMERIC DEFAULT 25.0
)
RETURNS TABLE (
  job_id TEXT,
  order_id TEXT,
  order_number TEXT,
  store_id TEXT,
  store_name TEXT,
  store_address TEXT,
  store_phone TEXT,
  store_lat NUMERIC,
  store_lng NUMERIC,
  customer_name TEXT,
  customer_address TEXT,
  customer_lat NUMERIC,
  customer_lng NUMERIC,
  total_order_amount NUMERIC,
  payout_amount NUMERIC,
  distance_km NUMERIC,
  estimated_minutes INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id AS job_id,
    j.order_id,
    COALESCE(j.order_number, j.order_id) AS order_number,
    j.store_id,
    j.store_name,
    j.store_address,
    j.store_phone,
    j.store_lat,
    j.store_lng,
    j.customer_name,
    j.customer_address,
    j.customer_lat,
    j.customer_lng,
    j.total_amount AS total_order_amount,
    j.payout_amount,
    j.distance_km,
    j.estimated_minutes,
    j.created_at
  FROM public.delivery_jobs j
  WHERE j.status = 'PENDING_ACCEPTANCE'
    AND j.assigned_partner_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.delivery_assignments a
      WHERE a.job_id = j.id AND a.partner_id = p_partner_id AND a.status IN ('DECLINED', 'REJECTED')
    )
  ORDER BY j.created_at DESC
  LIMIT 20;
END;
$$;

-- G. ADMIN APPROVE / REJECT DELIVERY APPLICATION RPC
CREATE OR REPLACE FUNCTION public.rpc_admin_update_application_status(
  p_application_id TEXT,
  p_status TEXT,
  p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app RECORD;
  v_existing_partner RECORD;
  v_partner_id TEXT;
BEGIN
  -- Verify caller is admin or service_role
  IF NOT (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (SELECT 1 FROM public.app_users WHERE id = (auth.uid())::text AND role IN ('admin', 'super_admin'))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Only Super Admin can approve applications.');
  END IF;

  SELECT * INTO v_app
  FROM public.delivery_partner_applications
  WHERE id::text = p_application_id OR application_ref = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
  END IF;

  UPDATE public.delivery_partner_applications
  SET
    status = p_status,
    admin_remarks = COALESCE(p_remarks, admin_remarks),
    reviewed_at = NOW(),
    updated_at = NOW(),
    verification_history = COALESCE(verification_history, '[]'::jsonb) || jsonb_build_object(
      'status', p_status,
      'timestamp', NOW(),
      'note', COALESCE(p_remarks, 'Status updated by Admin')
    )::jsonb
  WHERE id = v_app.id;

  -- If approved, create or activate delivery partner profile
  IF p_status = 'APPROVED' THEN
    SELECT * INTO v_existing_partner
    FROM public.delivery_partners
    WHERE phone = v_app.phone OR application_ref = v_app.application_ref;

    IF FOUND THEN
      UPDATE public.delivery_partners
      SET is_active = true, updated_at = NOW()
      WHERE id = v_existing_partner.id;
    ELSE
      v_partner_id := 'partner_' || v_app.phone;
      INSERT INTO public.delivery_partners (
        id,
        auth_user_id,
        application_ref,
        full_name,
        phone,
        email,
        vehicle_type,
        vehicle_reg_number,
        vehicle_photo_url,
        is_active,
        is_online,
        created_at,
        updated_at
      ) VALUES (
        v_app.auth_user_id,
        v_app.application_ref,
        v_app.full_name,
        v_app.phone,
        v_app.email,
        v_app.vehicle_type,
        v_app.vehicle_reg_number,
        v_app.vehicle_photo_url,
        true,
        false,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

-- H. SECURE USERNAME LOGIN HELPER RPC
CREATE OR REPLACE FUNCTION public.rpc_get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_username IS NULL OR TRIM(p_username) = '' THEN
    RETURN NULL;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.app_users a ON a.id = u.id::text
  WHERE LOWER(TRIM(a.username)) = LOWER(TRIM(p_username))
  LIMIT 1;

  RETURN v_email;
END;
$$;
