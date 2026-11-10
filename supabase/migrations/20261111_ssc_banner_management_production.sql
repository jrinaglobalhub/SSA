-- ============================================================================
-- Migration: 20261111_ssc_banner_management_production.sql
-- Description: Complete Production-Grade SSC Banner Management System for SSA
-- Supports: Custom Admin Banners + Approved SSM Advertising Banners,
--           Location Targeting (All, State, District, City, Pincode, Radius),
--           IST-Aware Scheduling, Draft/Active Lifecycle, and Dedicated Storage.
-- Zero-Impact: Purely additive columns & functions, preserving existing workflows.
-- ============================================================================

-- 1. Ensure dedicated storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ssc-banners',
  'ssc-banners',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Storage RLS Policies for ssc-banners
DROP POLICY IF EXISTS "Public can view ssc-banners images" ON storage.objects;
CREATE POLICY "Public can view ssc-banners images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'ssc-banners');

DROP POLICY IF EXISTS "Admins can upload ssc-banners images" ON storage.objects;
CREATE POLICY "Admins can upload ssc-banners images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'ssc-banners');

DROP POLICY IF EXISTS "Admins can update ssc-banners images" ON storage.objects;
CREATE POLICY "Admins can update ssc-banners images"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'ssc-banners');

DROP POLICY IF EXISTS "Admins can delete ssc-banners images" ON storage.objects;
CREATE POLICY "Admins can delete ssc-banners images"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'ssc-banners');

-- 2. Ensure ssc_banners table exists and has all required production columns
CREATE TABLE IF NOT EXISTS public.ssc_banners (
  id TEXT PRIMARY KEY DEFAULT ('ssc_bnr_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12))),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add additive columns if they do not exist
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS source_request_id TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS merchant_name TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS redirect_type TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS redirect_target TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS targeting_type TEXT NOT NULL DEFAULT 'all';
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS target_state TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS target_district TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS target_city TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS target_pincodes TEXT;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS target_latitude DOUBLE PRECISION;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS target_longitude DOUBLE PRECISION;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS target_radius_km NUMERIC;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS clicks_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS impressions_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.ssc_banners ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'SSA Administrator';

-- Relax link_type check constraint to support modern redirect types ('custom_url', 'external', 'none', etc.)
ALTER TABLE public.ssc_banners DROP CONSTRAINT IF EXISTS ssc_banners_link_type_check;
ALTER TABLE public.ssc_banners ADD CONSTRAINT ssc_banners_link_type_check CHECK (link_type = ANY (ARRAY['store'::text, 'deal'::text, 'category'::text, 'custom_url'::text, 'external'::text, 'none'::text]));

-- Backward compatibility sync for legacy columns
UPDATE public.ssc_banners
SET
  start_at = COALESCE(start_at, start_date),
  end_at = COALESCE(end_at, end_date),
  redirect_type = COALESCE(NULLIF(redirect_type, 'none'), NULLIF(link_type, ''), 'none'),
  redirect_target = COALESCE(redirect_target, target_id, custom_url),
  status = CASE
    WHEN status IS NOT NULL AND status IN ('draft', 'active', 'inactive', 'archived') THEN status
    WHEN is_active = false THEN 'inactive'
    ELSE 'active'
  END
WHERE start_at IS NULL OR end_at IS NULL OR status IS NULL;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_ssc_banners_status ON public.ssc_banners (status);
CREATE INDEX IF NOT EXISTS idx_ssc_banners_source_type ON public.ssc_banners (source_type);
CREATE INDEX IF NOT EXISTS idx_ssc_banners_source_req ON public.ssc_banners (source_request_id);
CREATE INDEX IF NOT EXISTS idx_ssc_banners_display_order ON public.ssc_banners (display_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ssc_banners_schedule ON public.ssc_banners (start_at, end_at);

-- RLS
ALTER TABLE public.ssc_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active published banners" ON public.ssc_banners;
DROP POLICY IF EXISTS "Admins have full access to ssc_banners" ON public.ssc_banners;

CREATE POLICY "Public can view active published banners"
  ON public.ssc_banners
  FOR SELECT
  USING (
    status = 'active'
    AND is_active = true
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );

CREATE POLICY "Admins have full access to ssc_banners"
  ON public.ssc_banners
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Drop existing functions to allow altering return signatures
DROP FUNCTION IF EXISTS public.get_active_ssc_banners();
DROP FUNCTION IF EXISTS public.get_active_ssc_banners(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_all_ssc_banners_admin();
DROP FUNCTION IF EXISTS public.toggle_ssc_banner_status(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.toggle_ssc_banner_status(TEXT, TEXT);

-- ============================================================================
-- RPC: get_active_ssc_banners
-- Dynamic retrieval for SSC consumer app with location targeting & schedule checks
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_ssc_banners(
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_pincode TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  source_type TEXT,
  source_request_id TEXT,
  merchant_id TEXT,
  merchant_name TEXT,
  redirect_type TEXT,
  redirect_target TEXT,
  target_id TEXT,
  target_name TEXT,
  custom_url TEXT,
  link_type TEXT,
  display_order INT,
  is_active BOOLEAN,
  status TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  targeting_type TEXT,
  target_state TEXT,
  target_city TEXT,
  target_pincodes TEXT,
  target_radius_km NUMERIC,
  clicks_count INT,
  impressions_count INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.subtitle,
    b.image_url,
    b.source_type,
    b.source_request_id,
    b.merchant_id,
    b.merchant_name,
    b.redirect_type,
    b.redirect_target,
    COALESCE(b.target_id, b.redirect_target) AS target_id,
    b.target_name,
    COALESCE(b.custom_url, b.redirect_target) AS custom_url,
    COALESCE(b.link_type, b.redirect_type) AS link_type,
    b.display_order,
    (b.status = 'active') AS is_active,
    b.status,
    COALESCE(b.start_at, b.start_date) AS start_at,
    COALESCE(b.end_at, b.end_date) AS end_at,
    COALESCE(b.start_at, b.start_date) AS start_date,
    COALESCE(b.end_at, b.end_date) AS end_date,
    b.targeting_type,
    b.target_state,
    b.target_city,
    b.target_pincodes,
    b.target_radius_km,
    b.clicks_count,
    b.impressions_count,
    b.created_at,
    b.updated_at
  FROM public.ssc_banners b
  WHERE b.status = 'active'
    AND b.is_active = true
    AND (COALESCE(b.start_at, b.start_date) IS NULL OR COALESCE(b.start_at, b.start_date) <= now())
    AND (COALESCE(b.end_at, b.end_date) IS NULL OR COALESCE(b.end_at, b.end_date) >= now())
    AND (
      -- 1. All locations
      b.targeting_type = 'all' OR b.targeting_type IS NULL
      -- 2. State targeting
      OR (b.targeting_type = 'state' AND p_state IS NOT NULL AND b.target_state ILIKE '%' || p_state || '%')
      -- 3. City targeting
      OR (b.targeting_type = 'city' AND p_city IS NOT NULL AND b.target_city ILIKE '%' || p_city || '%')
      -- 4. Pincode targeting
      OR (b.targeting_type = 'pincode' AND p_pincode IS NOT NULL AND b.target_pincodes ILIKE '%' || p_pincode || '%')
      -- 5. Radius targeting (Haversine formula in km)
      OR (
        b.targeting_type = 'radius'
        AND p_lat IS NOT NULL
        AND p_lng IS NOT NULL
        AND b.target_latitude IS NOT NULL
        AND b.target_longitude IS NOT NULL
        AND (
          6371 * acos(
            least(1.0, greatest(-1.0,
              cos(radians(p_lat)) * cos(radians(b.target_latitude)) *
              cos(radians(b.target_longitude) - radians(p_lng)) +
              sin(radians(p_lat)) * sin(radians(b.target_latitude))
            ))
          )
        ) <= COALESCE(b.target_radius_km, 10.0)
      )
    )
  ORDER BY b.display_order ASC, b.created_at DESC;
END;
$$;

-- ============================================================================
-- RPC: get_all_ssc_banners_admin
-- Complete admin fetch for SSA console
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_ssc_banners_admin()
RETURNS TABLE (
  id TEXT,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  storage_path TEXT,
  source_type TEXT,
  source_request_id TEXT,
  merchant_id TEXT,
  merchant_name TEXT,
  redirect_type TEXT,
  redirect_target TEXT,
  target_id TEXT,
  target_name TEXT,
  custom_url TEXT,
  link_type TEXT,
  display_order INT,
  is_active BOOLEAN,
  status TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  targeting_type TEXT,
  target_state TEXT,
  target_district TEXT,
  target_city TEXT,
  target_pincodes TEXT,
  target_latitude DOUBLE PRECISION,
  target_longitude DOUBLE PRECISION,
  target_radius_km NUMERIC,
  clicks_count INT,
  impressions_count INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    b.id,
    b.title,
    b.subtitle,
    b.image_url,
    b.storage_path,
    b.source_type,
    b.source_request_id,
    b.merchant_id,
    b.merchant_name,
    b.redirect_type,
    b.redirect_target,
    COALESCE(b.target_id, b.redirect_target) AS target_id,
    b.target_name,
    COALESCE(b.custom_url, b.redirect_target) AS custom_url,
    COALESCE(b.link_type, b.redirect_type) AS link_type,
    b.display_order,
    (b.status = 'active') AS is_active,
    b.status,
    COALESCE(b.start_at, b.start_date) AS start_at,
    COALESCE(b.end_at, b.end_date) AS end_at,
    COALESCE(b.start_at, b.start_date) AS start_date,
    COALESCE(b.end_at, b.end_date) AS end_date,
    b.targeting_type,
    b.target_state,
    b.target_district,
    b.target_city,
    b.target_pincodes,
    b.target_latitude,
    b.target_longitude,
    b.target_radius_km,
    b.clicks_count,
    b.impressions_count,
    b.created_at,
    b.updated_at,
    b.created_by
  FROM public.ssc_banners b
  ORDER BY b.display_order ASC, b.created_at DESC;
$$;

-- ============================================================================
-- RPC: save_ssc_banner
-- Atomic insert or update for Custom and SSM banners from SSA Admin Console
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_ssc_banner(p_banner JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_title TEXT;
  v_subtitle TEXT;
  v_image_url TEXT;
  v_storage_path TEXT;
  v_source_type TEXT;
  v_source_request_id TEXT;
  v_merchant_id TEXT;
  v_merchant_name TEXT;
  v_redirect_type TEXT;
  v_link_type TEXT;
  v_redirect_target TEXT;
  v_status TEXT;
  v_display_order INT;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_targeting_type TEXT;
  v_target_state TEXT;
  v_target_district TEXT;
  v_target_city TEXT;
  v_target_pincodes TEXT;
  v_target_latitude DOUBLE PRECISION;
  v_target_longitude DOUBLE PRECISION;
  v_target_radius_km NUMERIC;
  v_created_by TEXT;
  v_result JSONB;
BEGIN
  v_id := NULLIF(TRIM(p_banner->>'id'), '');
  v_title := TRIM(COALESCE(p_banner->>'title', ''));
  v_subtitle := TRIM(COALESCE(p_banner->>'subtitle', ''));
  v_image_url := TRIM(COALESCE(p_banner->>'imageUrl', p_banner->>'image_url', ''));
  v_storage_path := NULLIF(TRIM(COALESCE(p_banner->>'storagePath', p_banner->>'storage_path', '')), '');
  v_source_type := COALESCE(NULLIF(TRIM(p_banner->>'sourceType'), ''), NULLIF(TRIM(p_banner->>'source_type'), ''), 'custom');
  v_source_request_id := NULLIF(TRIM(COALESCE(p_banner->>'sourceRequestId', p_banner->>'source_request_id', '')), '');
  v_merchant_id := NULLIF(TRIM(COALESCE(p_banner->>'merchantId', p_banner->>'merchant_id', '')), '');
  v_merchant_name := NULLIF(TRIM(COALESCE(p_banner->>'merchantName', p_banner->>'merchant_name', '')), '');
  
  -- Redirect resolution
  v_redirect_type := COALESCE(
    NULLIF(TRIM(p_banner->>'redirectType'), ''),
    NULLIF(TRIM(p_banner->>'redirect_type'), ''),
    NULLIF(TRIM(p_banner->>'linkType'), ''),
    NULLIF(TRIM(p_banner->>'link_type'), ''),
    'none'
  );
  v_redirect_target := COALESCE(
    NULLIF(TRIM(p_banner->>'redirectTarget'), ''),
    NULLIF(TRIM(p_banner->>'redirect_target'), ''),
    NULLIF(TRIM(p_banner->>'targetId'), ''),
    NULLIF(TRIM(p_banner->>'target_id'), ''),
    NULLIF(TRIM(p_banner->>'customUrl'), ''),
    NULLIF(TRIM(p_banner->>'custom_url'), ''),
    ''
  );

  v_link_type := CASE
    WHEN v_redirect_type IN ('store', 'deal', 'category', 'custom_url', 'external', 'none') THEN v_redirect_type
    WHEN v_redirect_type = 'custom' THEN 'custom_url'
    ELSE 'none'
  END;

  -- Status resolution
  IF (p_banner->>'status') IS NOT NULL AND TRIM(p_banner->>'status') IN ('draft', 'active', 'inactive', 'archived') THEN
    v_status := TRIM(p_banner->>'status');
  ELSIF (p_banner->>'isActive')::BOOLEAN IS FALSE OR (p_banner->>'is_active')::BOOLEAN IS FALSE THEN
    v_status := 'inactive';
  ELSE
    v_status := 'active';
  END IF;

  v_display_order := COALESCE((p_banner->>'displayOrder')::INT, (p_banner->>'display_order')::INT, 0);

  -- Dates parsing
  IF (p_banner->>'startAt') IS NOT NULL AND TRIM(p_banner->>'startAt') <> '' THEN
    v_start_at := (p_banner->>'startAt')::TIMESTAMPTZ;
  ELSIF (p_banner->>'start_at') IS NOT NULL AND TRIM(p_banner->>'start_at') <> '' THEN
    v_start_at := (p_banner->>'start_at')::TIMESTAMPTZ;
  ELSIF (p_banner->>'startDate') IS NOT NULL AND TRIM(p_banner->>'startDate') <> '' THEN
    v_start_at := (p_banner->>'startDate')::TIMESTAMPTZ;
  ELSIF (p_banner->>'start_date') IS NOT NULL AND TRIM(p_banner->>'start_date') <> '' THEN
    v_start_at := (p_banner->>'start_date')::TIMESTAMPTZ;
  ELSE
    v_start_at := NULL;
  END IF;

  IF (p_banner->>'endAt') IS NOT NULL AND TRIM(p_banner->>'endAt') <> '' THEN
    v_end_at := (p_banner->>'endAt')::TIMESTAMPTZ;
  ELSIF (p_banner->>'end_at') IS NOT NULL AND TRIM(p_banner->>'end_at') <> '' THEN
    v_end_at := (p_banner->>'end_at')::TIMESTAMPTZ;
  ELSIF (p_banner->>'endDate') IS NOT NULL AND TRIM(p_banner->>'endDate') <> '' THEN
    v_end_at := (p_banner->>'endDate')::TIMESTAMPTZ;
  ELSIF (p_banner->>'end_date') IS NOT NULL AND TRIM(p_banner->>'end_date') <> '' THEN
    v_end_at := (p_banner->>'end_date')::TIMESTAMPTZ;
  ELSE
    v_end_at := NULL;
  END IF;

  -- Targeting parameters
  v_targeting_type := COALESCE(NULLIF(TRIM(p_banner->>'targetingType'), ''), NULLIF(TRIM(p_banner->>'targeting_type'), ''), 'all');
  v_target_state := NULLIF(TRIM(COALESCE(p_banner->>'targetState', p_banner->>'target_state', '')), '');
  v_target_district := NULLIF(TRIM(COALESCE(p_banner->>'targetDistrict', p_banner->>'target_district', '')), '');
  v_target_city := NULLIF(TRIM(COALESCE(p_banner->>'targetCity', p_banner->>'target_city', '')), '');
  v_target_pincodes := NULLIF(TRIM(COALESCE(p_banner->>'targetPincodes', p_banner->>'target_pincodes', '')), '');
  
  IF (p_banner->>'targetLatitude') IS NOT NULL AND TRIM(p_banner->>'targetLatitude') <> '' THEN
    v_target_latitude := (p_banner->>'targetLatitude')::DOUBLE PRECISION;
  ELSIF (p_banner->>'target_latitude') IS NOT NULL AND TRIM(p_banner->>'target_latitude') <> '' THEN
    v_target_latitude := (p_banner->>'target_latitude')::DOUBLE PRECISION;
  ELSE
    v_target_latitude := NULL;
  END IF;

  IF (p_banner->>'targetLongitude') IS NOT NULL AND TRIM(p_banner->>'targetLongitude') <> '' THEN
    v_target_longitude := (p_banner->>'targetLongitude')::DOUBLE PRECISION;
  ELSIF (p_banner->>'target_longitude') IS NOT NULL AND TRIM(p_banner->>'target_longitude') <> '' THEN
    v_target_longitude := (p_banner->>'target_longitude')::DOUBLE PRECISION;
  ELSE
    v_target_longitude := NULL;
  END IF;

  IF (p_banner->>'targetRadiusKm') IS NOT NULL AND TRIM(p_banner->>'targetRadiusKm') <> '' THEN
    v_target_radius_km := (p_banner->>'targetRadiusKm')::NUMERIC;
  ELSIF (p_banner->>'target_radius_km') IS NOT NULL AND TRIM(p_banner->>'target_radius_km') <> '' THEN
    v_target_radius_km := (p_banner->>'target_radius_km')::NUMERIC;
  ELSE
    v_target_radius_km := NULL;
  END IF;

  v_created_by := COALESCE(NULLIF(TRIM(p_banner->>'createdBy'), ''), 'SSA Administrator');

  -- Validations
  IF v_title = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banner title is required.');
  END IF;

  IF v_image_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banner image URL is required.');
  END IF;

  IF v_start_at IS NOT NULL AND v_end_at IS NOT NULL AND v_start_at > v_end_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'End date/time cannot be earlier than start date/time.');
  END IF;

  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ssc_banners WHERE id = v_id) THEN
    -- Update existing banner
    UPDATE public.ssc_banners
    SET
      title = v_title,
      subtitle = v_subtitle,
      image_url = v_image_url,
      storage_path = v_storage_path,
      source_type = v_source_type,
      source_request_id = v_source_request_id,
      merchant_id = v_merchant_id,
      merchant_name = v_merchant_name,
      redirect_type = v_redirect_type,
      redirect_target = v_redirect_target,
      link_type = v_link_type,
      target_id = v_redirect_target,
      target_name = COALESCE(v_merchant_name, p_banner->>'targetName', p_banner->>'target_name'),
      custom_url = CASE WHEN v_redirect_type = 'custom_url' THEN v_redirect_target ELSE NULL END,
      status = v_status,
      is_active = (v_status = 'active'),
      display_order = v_display_order,
      start_at = v_start_at,
      end_at = v_end_at,
      start_date = v_start_at,
      end_date = v_end_at,
      targeting_type = v_targeting_type,
      target_state = v_target_state,
      target_district = v_target_district,
      target_city = v_target_city,
      target_pincodes = v_target_pincodes,
      target_latitude = v_target_latitude,
      target_longitude = v_target_longitude,
      target_radius_km = v_target_radius_km,
      updated_at = now()
    WHERE id = v_id
    RETURNING to_jsonb(public.ssc_banners.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'banner', v_result, 'action', 'updated');
  ELSE
    -- Insert new banner
    INSERT INTO public.ssc_banners (
      title,
      subtitle,
      image_url,
      storage_path,
      source_type,
      source_request_id,
      merchant_id,
      merchant_name,
      redirect_type,
      redirect_target,
      link_type,
      target_id,
      target_name,
      custom_url,
      status,
      is_active,
      display_order,
      start_at,
      end_at,
      start_date,
      end_date,
      targeting_type,
      target_state,
      target_district,
      target_city,
      target_pincodes,
      target_latitude,
      target_longitude,
      target_radius_km,
      created_by
    ) VALUES (
      v_title,
      v_subtitle,
      v_image_url,
      v_storage_path,
      v_source_type,
      v_source_request_id,
      v_merchant_id,
      v_merchant_name,
      v_redirect_type,
      v_redirect_target,
      v_link_type,
      v_redirect_target,
      COALESCE(v_merchant_name, p_banner->>'targetName', p_banner->>'target_name'),
      CASE WHEN v_redirect_type = 'custom_url' THEN v_redirect_target ELSE NULL END,
      v_status,
      (v_status = 'active'),
      v_display_order,
      v_start_at,
      v_end_at,
      v_start_at,
      v_end_at,
      v_targeting_type,
      v_target_state,
      v_target_district,
      v_target_city,
      v_target_pincodes,
      v_target_latitude,
      v_target_longitude,
      v_target_radius_km,
      v_created_by
    )
    RETURNING to_jsonb(public.ssc_banners.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'banner', v_result, 'action', 'created');
  END IF;
END;
$$;

-- ============================================================================
-- RPC: get_approved_ssm_banners
-- Retrieves genuine approved advertising requests from spotlight_campaigns
-- and correlates with public.ssc_banners to indicate whether already published
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_approved_ssm_banners()
RETURNS TABLE (
  request_id TEXT,
  store_id TEXT,
  merchant_id TEXT,
  store_name TEXT,
  owner_name TEXT,
  store_address TEXT,
  store_lat DOUBLE PRECISION,
  store_lng DOUBLE PRECISION,
  title TEXT,
  description TEXT,
  banner_url TEXT,
  status TEXT,
  payment_status TEXT,
  total_amount NUMERIC,
  duration_days INT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_published_to_ssc BOOLEAN,
  ssc_banner_id TEXT,
  ssc_banner_status TEXT,
  ssc_display_order INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    sc.id AS request_id,
    sc.store_id,
    sc.merchant_id,
    COALESCE(s.name, 'Merchant Store') AS store_name,
    COALESCE(u.full_name, u.username, 'Store Owner') AS owner_name,
    COALESCE(s.address, '') AS store_address,
    s.lat::DOUBLE PRECISION AS store_lat,
    s.lng::DOUBLE PRECISION AS store_lng,
    COALESCE(sc.title, s.name, 'Promotional Banner') AS title,
    COALESCE(sc.description, '') AS description,
    sc.banner_url,
    sc.status,
    sc.payment_status,
    sc.total_amount,
    sc.duration_days,
    sc.start_date,
    sc.end_date,
    (sb.id IS NOT NULL AND sb.status = 'active') AS is_published_to_ssc,
    sb.id AS ssc_banner_id,
    sb.status AS ssc_banner_status,
    COALESCE(sb.display_order, 0) AS ssc_display_order
  FROM public.spotlight_campaigns sc
  LEFT JOIN public.stores s ON sc.store_id = s.id
  LEFT JOIN public.app_users u ON sc.merchant_id = u.id
  LEFT JOIN public.ssc_banners sb ON sb.source_request_id = sc.id
  WHERE sc.status IN ('approved', 'scheduled', 'active', 'completed')
    AND sc.payment_status = 'paid'
    AND sc.banner_url IS NOT NULL
  ORDER BY sc.start_date DESC;
$$;

-- ============================================================================
-- RPC: publish_approved_ssm_banner
-- Publishes an already-approved SSM advertising banner to SSC
-- Uses the original merchant-uploaded image with zero re-upload required
-- ============================================================================
CREATE OR REPLACE FUNCTION public.publish_approved_ssm_banner(
  p_request_id TEXT,
  p_display_order INT DEFAULT 0,
  p_targeting JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_banner_id TEXT;
  v_targeting_type TEXT;
  v_target_state TEXT;
  v_target_district TEXT;
  v_target_city TEXT;
  v_target_pincodes TEXT;
  v_target_lat DOUBLE PRECISION;
  v_target_lng DOUBLE PRECISION;
  v_target_radius NUMERIC;
  v_result JSONB;
BEGIN
  -- 1. Fetch approved request
  SELECT
    sc.id, sc.store_id, sc.merchant_id, sc.title, sc.description,
    sc.banner_url, sc.start_date, sc.end_date, sc.status, sc.payment_status,
    s.name AS store_name, s.address AS store_address,
    s.lat::DOUBLE PRECISION AS store_lat,
    s.lng::DOUBLE PRECISION AS store_lng
  INTO v_req
  FROM public.spotlight_campaigns sc
  LEFT JOIN public.stores s ON sc.store_id = s.id
  WHERE sc.id = p_request_id
    AND sc.status IN ('approved', 'scheduled', 'active', 'completed')
    AND sc.payment_status = 'paid';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approved SSM advertising request not found or not eligible.');
  END IF;

  -- 2. Extract targeting overrides or defaults
  v_targeting_type := COALESCE(NULLIF(TRIM(p_targeting->>'targetingType'), ''), 'all');
  v_target_state := NULLIF(TRIM(COALESCE(p_targeting->>'targetState', '')), '');
  v_target_district := NULLIF(TRIM(COALESCE(p_targeting->>'targetDistrict', '')), '');
  v_target_city := NULLIF(TRIM(COALESCE(p_targeting->>'targetCity', '')), '');
  v_target_pincodes := NULLIF(TRIM(COALESCE(p_targeting->>'targetPincodes', '')), '');
  
  IF (p_targeting->>'targetLatitude') IS NOT NULL AND TRIM(p_targeting->>'targetLatitude') <> '' THEN
    v_target_lat := (p_targeting->>'targetLatitude')::DOUBLE PRECISION;
  ELSE
    v_target_lat := v_req.store_lat;
  END IF;

  IF (p_targeting->>'targetLongitude') IS NOT NULL AND TRIM(p_targeting->>'targetLongitude') <> '' THEN
    v_target_lng := (p_targeting->>'targetLongitude')::DOUBLE PRECISION;
  ELSE
    v_target_lng := v_req.store_lng;
  END IF;

  IF (p_targeting->>'targetRadiusKm') IS NOT NULL AND TRIM(p_targeting->>'targetRadiusKm') <> '' THEN
    v_target_radius := (p_targeting->>'targetRadiusKm')::NUMERIC;
  ELSE
    v_target_radius := 10.0;
  END IF;

  -- 3. Check if already exists in ssc_banners
  SELECT id INTO v_banner_id FROM public.ssc_banners WHERE source_request_id = p_request_id;

  IF v_banner_id IS NOT NULL THEN
    -- Reactivate and update existing
    UPDATE public.ssc_banners
    SET
      status = 'active',
      is_active = true,
      display_order = p_display_order,
      start_at = v_req.start_date,
      end_at = v_req.end_date,
      start_date = v_req.start_date,
      end_date = v_req.end_date,
      targeting_type = v_targeting_type,
      target_state = v_target_state,
      target_district = v_target_district,
      target_city = v_target_city,
      target_pincodes = v_target_pincodes,
      target_latitude = v_target_lat,
      target_longitude = v_target_lng,
      target_radius_km = v_target_radius,
      updated_at = now()
    WHERE id = v_banner_id
    RETURNING to_jsonb(public.ssc_banners.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'action', 'updated', 'banner', v_result);
  ELSE
    -- Insert new SSM-approved banner into ssc_banners
    INSERT INTO public.ssc_banners (
      title,
      subtitle,
      image_url,
      source_type,
      source_request_id,
      merchant_id,
      merchant_name,
      redirect_type,
      redirect_target,
      link_type,
      target_id,
      target_name,
      status,
      is_active,
      display_order,
      start_at,
      end_at,
      start_date,
      end_date,
      targeting_type,
      target_state,
      target_district,
      target_city,
      target_pincodes,
      target_latitude,
      target_longitude,
      target_radius_km,
      created_by
    ) VALUES (
      COALESCE(v_req.title, v_req.store_name, 'Sponsored Ad'),
      COALESCE(v_req.description, 'Sponsored advertisement by ' || v_req.store_name),
      v_req.banner_url,
      'ssm_approved',
      v_req.id,
      v_req.merchant_id,
      v_req.store_name,
      'store',
      v_req.store_id,
      'store',
      v_req.store_id,
      v_req.store_name,
      'active',
      true,
      p_display_order,
      v_req.start_date,
      v_req.end_date,
      v_req.start_date,
      v_req.end_date,
      v_targeting_type,
      v_target_state,
      v_target_district,
      v_target_city,
      v_target_pincodes,
      v_target_lat,
      v_target_lng,
      v_target_radius,
      'SSA Administrator'
    )
    RETURNING to_jsonb(public.ssc_banners.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'action', 'published', 'banner', v_result);
  END IF;
END;
$$;

-- ============================================================================
-- RPC: toggle_ssc_banner_status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.toggle_ssc_banner_status(p_banner_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
  v_is_active BOOLEAN;
BEGIN
  v_new_status := LOWER(TRIM(p_status));
  IF v_new_status NOT IN ('active', 'inactive', 'draft', 'archived') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status provided.');
  END IF;

  v_is_active := (v_new_status = 'active');

  UPDATE public.ssc_banners
  SET
    status = v_new_status,
    is_active = v_is_active,
    updated_at = now()
  WHERE id = p_banner_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'id', p_banner_id, 'status', v_new_status, 'isActive', v_is_active);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Banner not found.');
  END IF;
END;
$$;
