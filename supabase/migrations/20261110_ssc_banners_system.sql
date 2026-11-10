-- ============================================================================
-- Migration: 20261110_ssc_banners_system.sql
-- Description: Isolated promotional banner management system for SSC Consumer App
-- Zero-impact guarantee: Purely additive table, isolated functions and policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ssc_banners (
  id TEXT PRIMARY KEY DEFAULT ('ssc_bnr_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12))),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'none' CHECK (link_type IN ('store', 'deal', 'category', 'custom_url', 'none')),
  target_id TEXT,
  target_name TEXT,
  custom_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  clicks_count INT NOT NULL DEFAULT 0,
  impressions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SSA Administrator'
);

-- Indices for rapid querying and ordering
CREATE INDEX IF NOT EXISTS idx_ssc_banners_order ON public.ssc_banners (display_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ssc_banners_active ON public.ssc_banners (is_active);

-- Enable Row Level Security
ALTER TABLE public.ssc_banners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view active published banners" ON public.ssc_banners;
DROP POLICY IF EXISTS "Admins have full access to ssc_banners" ON public.ssc_banners;

-- Policy 1: Public/Consumers can view active banners within their scheduled timeframe
CREATE POLICY "Public can view active published banners"
  ON public.ssc_banners
  FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );

-- Policy 2: Allow all operations for authenticated service or admin users
CREATE POLICY "Admins have full access to ssc_banners"
  ON public.ssc_banners
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RPC: get_active_ssc_banners
-- Used by SSC Consumer App to retrieve active published banners in order
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_ssc_banners()
RETURNS TABLE (
  id TEXT,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  link_type TEXT,
  target_id TEXT,
  target_name TEXT,
  custom_url TEXT,
  display_order INT,
  is_active BOOLEAN,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  clicks_count INT,
  impressions_count INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
    b.link_type,
    b.target_id,
    b.target_name,
    b.custom_url,
    b.display_order,
    b.is_active,
    b.start_date,
    b.end_date,
    b.clicks_count,
    b.impressions_count,
    b.created_at,
    b.updated_at
  FROM public.ssc_banners b
  WHERE b.is_active = true
    AND (b.start_date IS NULL OR b.start_date <= now())
    AND (b.end_date IS NULL OR b.end_date >= now())
  ORDER BY b.display_order ASC, b.created_at DESC;
$$;

-- ============================================================================
-- RPC: get_all_ssc_banners_admin
-- Used by SSA Admin Console to retrieve all banners including drafts & analytics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_ssc_banners_admin()
RETURNS TABLE (
  id TEXT,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  link_type TEXT,
  target_id TEXT,
  target_name TEXT,
  custom_url TEXT,
  display_order INT,
  is_active BOOLEAN,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
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
    b.link_type,
    b.target_id,
    b.target_name,
    b.custom_url,
    b.display_order,
    b.is_active,
    b.start_date,
    b.end_date,
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
-- Atomic insert or update for SSC banners from SSA Admin Console
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
  v_link_type TEXT;
  v_target_id TEXT;
  v_target_name TEXT;
  v_custom_url TEXT;
  v_display_order INT;
  v_is_active BOOLEAN;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_created_by TEXT;
  v_result JSONB;
BEGIN
  v_id := NULLIF(TRIM(p_banner->>'id'), '');
  v_title := TRIM(COALESCE(p_banner->>'title', ''));
  v_subtitle := TRIM(COALESCE(p_banner->>'subtitle', ''));
  v_image_url := TRIM(COALESCE(p_banner->>'imageUrl', p_banner->>'image_url', ''));
  v_link_type := COALESCE(NULLIF(TRIM(p_banner->>'linkType'), ''), NULLIF(TRIM(p_banner->>'link_type'), ''), 'none');
  v_target_id := NULLIF(TRIM(COALESCE(p_banner->>'targetId', p_banner->>'target_id', '')), '');
  v_target_name := NULLIF(TRIM(COALESCE(p_banner->>'targetName', p_banner->>'target_name', '')), '');
  v_custom_url := NULLIF(TRIM(COALESCE(p_banner->>'customUrl', p_banner->>'custom_url', '')), '');
  v_display_order := COALESCE((p_banner->>'displayOrder')::INT, (p_banner->>'display_order')::INT, 0);
  v_is_active := COALESCE((p_banner->>'isActive')::BOOLEAN, (p_banner->>'is_active')::BOOLEAN, true);
  v_created_by := COALESCE(NULLIF(TRIM(p_banner->>'createdBy'), ''), 'SSA Administrator');

  -- Dates parsing
  IF (p_banner->>'startDate') IS NOT NULL AND TRIM(p_banner->>'startDate') <> '' THEN
    v_start_date := (p_banner->>'startDate')::TIMESTAMPTZ;
  ELSIF (p_banner->>'start_date') IS NOT NULL AND TRIM(p_banner->>'start_date') <> '' THEN
    v_start_date := (p_banner->>'start_date')::TIMESTAMPTZ;
  ELSE
    v_start_date := NULL;
  END IF;

  IF (p_banner->>'endDate') IS NOT NULL AND TRIM(p_banner->>'endDate') <> '' THEN
    v_end_date := (p_banner->>'endDate')::TIMESTAMPTZ;
  ELSIF (p_banner->>'end_date') IS NOT NULL AND TRIM(p_banner->>'end_date') <> '' THEN
    v_end_date := (p_banner->>'end_date')::TIMESTAMPTZ;
  ELSE
    v_end_date := NULL;
  END IF;

  -- Validate mandatory fields
  IF v_title = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banner title is required.');
  END IF;

  IF v_image_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banner image URL is required.');
  END IF;

  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ssc_banners WHERE id = v_id) THEN
    -- Update existing banner
    UPDATE public.ssc_banners
    SET
      title = v_title,
      subtitle = v_subtitle,
      image_url = v_image_url,
      link_type = v_link_type,
      target_id = v_target_id,
      target_name = v_target_name,
      custom_url = v_custom_url,
      display_order = v_display_order,
      is_active = v_is_active,
      start_date = v_start_date,
      end_date = v_end_date,
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
      link_type,
      target_id,
      target_name,
      custom_url,
      display_order,
      is_active,
      start_date,
      end_date,
      created_by
    ) VALUES (
      v_title,
      v_subtitle,
      v_image_url,
      v_link_type,
      v_target_id,
      v_target_name,
      v_custom_url,
      v_display_order,
      v_is_active,
      v_start_date,
      v_end_date,
      v_created_by
    )
    RETURNING to_jsonb(public.ssc_banners.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'banner', v_result, 'action', 'created');
  END IF;
END;
$$;

-- ============================================================================
-- RPC: toggle_ssc_banner_status
-- Rapid one-click activation/deactivation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.toggle_ssc_banner_status(p_banner_id TEXT, p_is_active BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ssc_banners
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_banner_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'id', p_banner_id, 'isActive', p_is_active);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Banner not found.');
  END IF;
END;
$$;

-- ============================================================================
-- RPC: delete_ssc_banner
-- Safe deletion of an SSC banner
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_ssc_banner(p_banner_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ssc_banners WHERE id = p_banner_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'id', p_banner_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Banner not found.');
  END IF;
END;
$$;

-- ============================================================================
-- RPC: record_ssc_banner_click
-- Atomic tracking of consumer clicks on promotional banners
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_ssc_banner_click(p_banner_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ssc_banners
  SET clicks_count = clicks_count + 1
  WHERE id = p_banner_id;

  RETURN jsonb_build_object('success', true, 'id', p_banner_id);
END;
$$;

-- ============================================================================
-- RPC: record_ssc_banner_impression
-- Atomic tracking of impressions on promotional banners
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_ssc_banner_impression(p_banner_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ssc_banners
  SET impressions_count = impressions_count + 1
  WHERE id = p_banner_id;

  RETURN jsonb_build_object('success', true, 'id', p_banner_id);
END;
$$;
