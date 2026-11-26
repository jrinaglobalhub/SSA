-- ============================================================================
-- MIGRATION: Update save_ssc_banner RPC to Make Title Optional
-- Date: 2026-11-26
-- Description:
--   Removes mandatory title check so pure graphic banners save successfully.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_ssc_banner(p_banner jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Validations (Image is required, title is optional)
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
$function$;

GRANT EXECUTE ON FUNCTION public.save_ssc_banner(jsonb) TO anon, authenticated, service_role;
