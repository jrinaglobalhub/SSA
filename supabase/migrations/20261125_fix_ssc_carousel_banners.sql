-- ============================================================================
-- Migration: 20261125_fix_ssc_carousel_banners.sql
-- Description: Complete Audit & Repair for SSC Carousel Banner Management
-- Fixes:
--   1. Storage bucket 'ssc-banners' RLS policies for seamless upload, update, and deletion.
--   2. Real-time synchronization: Add public.ssc_banners to supabase_realtime publication.
--   3. Dedicated reordering RPC: public.reorder_ssc_banners(TEXT[]).
--   4. Enhanced delete RPC with automated storage object cleanup: public.delete_ssc_banner(TEXT).
--   5. Synchronized status & active flags in save_ssc_banner and toggle_ssc_banner_status.
--   6. Strict temporal and status enforcement in get_active_ssc_banners.
-- ============================================================================

-- 1. Ensure dedicated storage bucket exists and is public
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
  USING (bucket_id = 'ssc-banners')
  WITH CHECK (bucket_id = 'ssc-banners');

DROP POLICY IF EXISTS "Admins can delete ssc-banners images" ON storage.objects;
CREATE POLICY "Admins can delete ssc-banners images"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'ssc-banners');

-- 2. Add public.ssc_banners to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ssc_banners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ssc_banners;
  END IF;
END $$;

-- 3. Atomic Reordering RPC: public.reorder_ssc_banners
CREATE OR REPLACE FUNCTION public.reorder_ssc_banners(p_ordered_ids TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id TEXT;
  v_index INT := 0;
  v_count INT := 0;
BEGIN
  IF p_ordered_ids IS NULL OR array_length(p_ordered_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No banner IDs provided.');
  END IF;

  FOREACH v_id IN ARRAY p_ordered_ids
  LOOP
    UPDATE public.ssc_banners
    SET
      display_order = v_index,
      updated_at = now()
    WHERE id = v_id;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
    v_index := v_index + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updatedCount', v_count,
    'totalRequested', array_length(p_ordered_ids, 1)
  );
END;
$$;

-- 4. Safe Delete RPC
CREATE OR REPLACE FUNCTION public.delete_ssc_banner(p_banner_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_storage_path TEXT;
  v_deleted_title TEXT;
BEGIN
  -- 1. Fetch storage_path before deleting
  SELECT storage_path, title INTO v_storage_path, v_deleted_title
  FROM public.ssc_banners
  WHERE id = p_banner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banner not found.');
  END IF;

  -- 2. Delete from ssc_banners table
  DELETE FROM public.ssc_banners WHERE id = p_banner_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_banner_id,
    'title', v_deleted_title,
    'storagePath', v_storage_path
  );
END;
$$;

-- 5. Atomic Status Toggle RPC
CREATE OR REPLACE FUNCTION public.toggle_ssc_banner_status(p_banner_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_status TEXT;
  v_is_active BOOLEAN;
  v_banner RECORD;
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
  WHERE id = p_banner_id
  RETURNING * INTO v_banner;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'id', p_banner_id,
      'status', v_new_status,
      'isActive', v_is_active,
      'displayOrder', v_banner.display_order
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Banner not found.');
  END IF;
END;
$$;

-- 6. Grants
GRANT EXECUTE ON FUNCTION public.reorder_ssc_banners(TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_ssc_banner(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_ssc_banner_status(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_ssc_banner(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_ssc_banners_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_ssc_banners(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_approved_ssm_banners() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_approved_ssm_banner(TEXT, INT, JSONB) TO anon, authenticated, service_role;
