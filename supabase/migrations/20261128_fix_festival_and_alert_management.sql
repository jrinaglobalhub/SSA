-- ============================================================================
-- MIGRATION: Fix Festival Greetings and Alert Popup Management & Scheduling
-- Date: 2026-11-28
-- Description:
--   1. Ensures scheduled greetings and alerts automatically activate once start_at arrives.
--   2. Ensures get_active_festival_greeting and get_active_alert_popups properly query
--      published and scheduled items when current time >= start_at and <= end_at.
--   3. Auto-promotes 'scheduled' to 'published' and auto-expires past end_at.
--   4. Fixes admin_save_* and admin_toggle_* functions so is_active is true for
--      both 'published' and 'scheduled' statuses (is_active is only false for disabled/draft/expired).
--   5. Fixes the existing Christmas greeting so it is active and published immediately.
-- ============================================================================

-- 1. FIX RPC: admin_save_festival_greeting
CREATE OR REPLACE FUNCTION public.admin_save_festival_greeting(p_greeting JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_festival_name TEXT;
  v_title TEXT;
  v_subtitle TEXT;
  v_message TEXT;
  v_artwork_url TEXT;
  v_storage_path TEXT;
  v_sender_text TEXT;
  v_supported_languages JSONB;
  v_status TEXT;
  v_is_active BOOLEAN;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_button_text TEXT;
  v_created_by TEXT;
  v_result JSONB;
BEGIN
  v_id := NULLIF(TRIM(p_greeting->>'id'), '');
  v_festival_name := TRIM(COALESCE(p_greeting->>'festivalName', p_greeting->>'festival_name', ''));
  v_title := TRIM(COALESCE(p_greeting->>'title', ''));
  v_subtitle := TRIM(COALESCE(p_greeting->>'subtitle', ''));
  v_message := TRIM(COALESCE(p_greeting->>'message', p_greeting->>'message_body', ''));
  v_artwork_url := TRIM(COALESCE(p_greeting->>'artworkUrl', p_greeting->>'artwork_url', ''));
  v_storage_path := NULLIF(TRIM(COALESCE(p_greeting->>'storagePath', p_greeting->>'storage_path', '')), '');
  v_sender_text := TRIM(COALESCE(p_greeting->>'senderText', p_greeting->>'sender_text', 'SmartShopper by JRINA Private Limited'));
  
  IF (p_greeting->'supportedLanguages') IS NOT NULL THEN
    v_supported_languages := p_greeting->'supportedLanguages';
  ELSIF (p_greeting->'supported_languages') IS NOT NULL THEN
    v_supported_languages := p_greeting->'supported_languages';
  ELSE
    v_supported_languages := '["all"]'::jsonb;
  END IF;

  v_status := COALESCE(NULLIF(TRIM(p_greeting->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'scheduled', 'published', 'disabled', 'expired') THEN
    v_status := 'draft';
  END IF;

  IF (p_greeting->>'startAt') IS NOT NULL AND TRIM(p_greeting->>'startAt') <> '' THEN
    v_start_at := (p_greeting->>'startAt')::TIMESTAMPTZ;
  ELSIF (p_greeting->>'start_at') IS NOT NULL AND TRIM(p_greeting->>'start_at') <> '' THEN
    v_start_at := (p_greeting->>'start_at')::TIMESTAMPTZ;
  ELSE
    v_start_at := now();
  END IF;

  IF (p_greeting->>'endAt') IS NOT NULL AND TRIM(p_greeting->>'endAt') <> '' THEN
    v_end_at := (p_greeting->>'endAt')::TIMESTAMPTZ;
  ELSIF (p_greeting->>'end_at') IS NOT NULL AND TRIM(p_greeting->>'end_at') <> '' THEN
    v_end_at := (p_greeting->>'end_at')::TIMESTAMPTZ;
  ELSE
    v_end_at := NULL;
  END IF;

  v_button_text := TRIM(COALESCE(p_greeting->>'buttonText', p_greeting->>'button_text', 'Wish You The Same!'));
  v_created_by := TRIM(COALESCE(p_greeting->>'createdBy', p_greeting->>'created_by', 'SSA Administrator'));

  -- Validations
  IF v_festival_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Festival name is required.');
  END IF;
  IF v_title = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Greeting title is required.');
  END IF;
  IF v_message = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Greeting message is required.');
  END IF;
  IF v_artwork_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Artwork image is required.');
  END IF;
  IF v_end_at IS NOT NULL AND v_start_at > v_end_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Expiration date cannot be earlier than activation date.');
  END IF;

  -- Auto schedule/expire check
  IF v_status = 'published' OR v_status = 'scheduled' THEN
    IF now() < v_start_at THEN
      v_status := 'scheduled';
      v_is_active := true;
    ELSIF v_end_at IS NOT NULL AND now() > v_end_at THEN
      v_status := 'expired';
      v_is_active := false;
    ELSE
      v_status := 'published';
      v_is_active := true;
    END IF;
  ELSE
    v_is_active := false;
  END IF;

  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ssc_festival_greetings WHERE id = v_id) THEN
    UPDATE public.ssc_festival_greetings
    SET
      festival_name = v_festival_name,
      title = v_title,
      subtitle = v_subtitle,
      message = v_message,
      artwork_url = v_artwork_url,
      storage_path = v_storage_path,
      sender_text = v_sender_text,
      supported_languages = v_supported_languages,
      status = v_status,
      is_active = v_is_active,
      start_at = v_start_at,
      end_at = v_end_at,
      button_text = v_button_text,
      updated_at = now()
    WHERE id = v_id
    RETURNING to_jsonb(public.ssc_festival_greetings.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'greeting', v_result, 'action', 'updated');
  ELSE
    INSERT INTO public.ssc_festival_greetings (
      festival_name,
      title,
      subtitle,
      message,
      artwork_url,
      storage_path,
      sender_text,
      supported_languages,
      status,
      is_active,
      start_at,
      end_at,
      button_text,
      created_by
    ) VALUES (
      v_festival_name,
      v_title,
      v_subtitle,
      v_message,
      v_artwork_url,
      v_storage_path,
      v_sender_text,
      v_supported_languages,
      v_status,
      v_is_active,
      v_start_at,
      v_end_at,
      v_button_text,
      v_created_by
    )
    RETURNING to_jsonb(public.ssc_festival_greetings.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'greeting', v_result, 'action', 'created');
  END IF;
END;
$$;

-- 2. FIX RPC: admin_toggle_festival_greeting_status
CREATE OR REPLACE FUNCTION public.admin_toggle_festival_greeting_status(p_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_active BOOLEAN;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_real_status TEXT;
BEGIN
  IF p_status NOT IN ('draft', 'scheduled', 'published', 'disabled', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status.');
  END IF;

  SELECT start_at, end_at INTO v_start_at, v_end_at FROM public.ssc_festival_greetings WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Greeting not found.');
  END IF;

  v_real_status := p_status;
  IF p_status = 'published' OR p_status = 'scheduled' THEN
    IF now() < v_start_at THEN
      v_real_status := 'scheduled';
      v_is_active := true;
    ELSIF v_end_at IS NOT NULL AND now() > v_end_at THEN
      v_real_status := 'expired';
      v_is_active := false;
    ELSE
      v_real_status := 'published';
      v_is_active := true;
    END IF;
  ELSE
    v_is_active := false;
  END IF;

  UPDATE public.ssc_festival_greetings
  SET
    status = v_real_status,
    is_active = v_is_active,
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'id', p_id, 'status', v_real_status, 'isActive', v_is_active);
END;
$$;

-- 3. FIX RPC: get_active_festival_greeting
CREATE OR REPLACE FUNCTION public.get_active_festival_greeting()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Auto-promote scheduled greetings whose start_at has arrived
  UPDATE public.ssc_festival_greetings
  SET status = 'published', is_active = true, updated_at = now()
  WHERE status = 'scheduled' AND is_active = true AND now() >= start_at AND (end_at IS NULL OR now() <= end_at);

  -- Auto-expire greetings whose end_at has passed
  UPDATE public.ssc_festival_greetings
  SET status = 'expired', is_active = false, updated_at = now()
  WHERE end_at IS NOT NULL AND now() > end_at AND status NOT IN ('expired', 'draft');

  SELECT *
  INTO v_rec
  FROM public.ssc_festival_greetings
  WHERE (status = 'published' OR (status = 'scheduled' AND now() >= start_at))
    AND status NOT IN ('disabled', 'draft', 'expired')
    AND is_active = true
    AND now() >= start_at
    AND (end_at IS NULL OR now() <= end_at)
  ORDER BY start_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_rec);
END;
$$;

-- 4. FIX RPC: admin_save_alert_popup
CREATE OR REPLACE FUNCTION public.admin_save_alert_popup(p_alert JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_title TEXT;
  v_message TEXT;
  v_image_url TEXT;
  v_storage_path TEXT;
  v_popup_type TEXT;
  v_priority TEXT;
  v_target_audience TEXT;
  v_status TEXT;
  v_is_active BOOLEAN;
  v_is_dismissible BOOLEAN;
  v_display_frequency TEXT;
  v_button_text TEXT;
  v_button_action_type TEXT;
  v_button_action_target TEXT;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_created_by TEXT;
  v_result JSONB;
BEGIN
  v_id := NULLIF(TRIM(p_alert->>'id'), '');
  v_title := TRIM(COALESCE(p_alert->>'title', ''));
  v_message := TRIM(COALESCE(p_alert->>'message', p_alert->>'message_body', ''));
  v_image_url := NULLIF(TRIM(COALESCE(p_alert->>'imageUrl', p_alert->>'image_url', '')), '');
  v_storage_path := NULLIF(TRIM(COALESCE(p_alert->>'storagePath', p_alert->>'storage_path', '')), '');
  
  v_popup_type := COALESCE(NULLIF(TRIM(p_alert->>'popupType'), ''), NULLIF(TRIM(p_alert->>'popup_type'), ''), 'general');
  IF v_popup_type NOT IN ('general', 'important', 'service', 'promotional', 'emergency', 'custom') THEN
    v_popup_type := 'general';
  END IF;

  v_priority := COALESCE(NULLIF(TRIM(p_alert->>'priority'), ''), 'normal');
  IF v_priority NOT IN ('normal', 'high', 'critical') THEN
    v_priority := 'normal';
  END IF;

  v_target_audience := COALESCE(NULLIF(TRIM(p_alert->>'targetAudience'), ''), NULLIF(TRIM(p_alert->>'target_audience'), ''), 'all');

  v_status := COALESCE(NULLIF(TRIM(p_alert->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'scheduled', 'published', 'disabled', 'expired') THEN
    v_status := 'draft';
  END IF;

  v_is_dismissible := COALESCE((p_alert->>'isDismissible')::BOOLEAN, (p_alert->>'is_dismissible')::BOOLEAN, true);
  
  v_display_frequency := COALESCE(NULLIF(TRIM(p_alert->>'displayFrequency'), ''), NULLIF(TRIM(p_alert->>'display_frequency'), ''), 'once');
  IF v_display_frequency NOT IN ('once', 'until_acknowledged', 'every_session') THEN
    v_display_frequency := 'once';
  END IF;

  v_button_text := TRIM(COALESCE(p_alert->>'buttonText', p_alert->>'button_text', 'Dismiss'));
  v_button_action_type := COALESCE(NULLIF(TRIM(p_alert->>'buttonActionType'), ''), NULLIF(TRIM(p_alert->>'button_action_type'), ''), 'none');
  IF v_button_action_type NOT IN ('none', 'screen', 'url') THEN
    v_button_action_type := 'none';
  END IF;

  v_button_action_target := TRIM(COALESCE(p_alert->>'buttonActionTarget', p_alert->>'button_action_target', ''));

  IF (p_alert->>'startAt') IS NOT NULL AND TRIM(p_alert->>'startAt') <> '' THEN
    v_start_at := (p_alert->>'startAt')::TIMESTAMPTZ;
  ELSIF (p_alert->>'start_at') IS NOT NULL AND TRIM(p_alert->>'start_at') <> '' THEN
    v_start_at := (p_alert->>'start_at')::TIMESTAMPTZ;
  ELSE
    v_start_at := now();
  END IF;

  IF (p_alert->>'endAt') IS NOT NULL AND TRIM(p_alert->>'endAt') <> '' THEN
    v_end_at := (p_alert->>'endAt')::TIMESTAMPTZ;
  ELSIF (p_alert->>'end_at') IS NOT NULL AND TRIM(p_alert->>'end_at') <> '' THEN
    v_end_at := (p_alert->>'end_at')::TIMESTAMPTZ;
  ELSE
    v_end_at := NULL;
  END IF;

  v_created_by := TRIM(COALESCE(p_alert->>'createdBy', p_alert->>'created_by', 'SSA Administrator'));

  -- Validations
  IF v_title = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alert title is required.');
  END IF;
  IF v_message = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message body is required.');
  END IF;
  IF v_end_at IS NOT NULL AND v_start_at > v_end_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Expiration date cannot be earlier than start date.');
  END IF;

  -- Auto schedule/expire check
  IF v_status = 'published' OR v_status = 'scheduled' THEN
    IF now() < v_start_at THEN
      v_status := 'scheduled';
      v_is_active := true;
    ELSIF v_end_at IS NOT NULL AND now() > v_end_at THEN
      v_status := 'expired';
      v_is_active := false;
    ELSE
      v_status := 'published';
      v_is_active := true;
    END IF;
  ELSE
    v_is_active := false;
  END IF;

  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ssc_alert_popups WHERE id = v_id) THEN
    UPDATE public.ssc_alert_popups
    SET
      title = v_title,
      message = v_message,
      image_url = v_image_url,
      storage_path = v_storage_path,
      popup_type = v_popup_type,
      priority = v_priority,
      target_audience = v_target_audience,
      status = v_status,
      is_active = v_is_active,
      is_dismissible = v_is_dismissible,
      display_frequency = v_display_frequency,
      button_text = v_button_text,
      button_action_type = v_button_action_type,
      button_action_target = v_button_action_target,
      start_at = v_start_at,
      end_at = v_end_at,
      updated_at = now()
    WHERE id = v_id
    RETURNING to_jsonb(public.ssc_alert_popups.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'alert', v_result, 'action', 'updated');
  ELSE
    INSERT INTO public.ssc_alert_popups (
      title,
      message,
      image_url,
      storage_path,
      popup_type,
      priority,
      target_audience,
      status,
      is_active,
      is_dismissible,
      display_frequency,
      button_text,
      button_action_type,
      button_action_target,
      start_at,
      end_at,
      created_by
    ) VALUES (
      v_title,
      v_message,
      v_image_url,
      v_storage_path,
      v_popup_type,
      v_priority,
      v_target_audience,
      v_status,
      v_is_active,
      v_is_dismissible,
      v_display_frequency,
      v_button_text,
      v_button_action_type,
      v_button_action_target,
      v_start_at,
      v_end_at,
      v_created_by
    )
    RETURNING to_jsonb(public.ssc_alert_popups.*) INTO v_result;

    RETURN jsonb_build_object('success', true, 'alert', v_result, 'action', 'created');
  END IF;
END;
$$;

-- 5. FIX RPC: admin_toggle_alert_popup_status
CREATE OR REPLACE FUNCTION public.admin_toggle_alert_popup_status(p_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_active BOOLEAN;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_real_status TEXT;
BEGIN
  IF p_status NOT IN ('draft', 'scheduled', 'published', 'disabled', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status.');
  END IF;

  SELECT start_at, end_at INTO v_start_at, v_end_at FROM public.ssc_alert_popups WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alert not found.');
  END IF;

  v_real_status := p_status;
  IF p_status = 'published' OR p_status = 'scheduled' THEN
    IF now() < v_start_at THEN
      v_real_status := 'scheduled';
      v_is_active := true;
    ELSIF v_end_at IS NOT NULL AND now() > v_end_at THEN
      v_real_status := 'expired';
      v_is_active := false;
    ELSE
      v_real_status := 'published';
      v_is_active := true;
    END IF;
  ELSE
    v_is_active := false;
  END IF;

  UPDATE public.ssc_alert_popups
  SET
    status = v_real_status,
    is_active = v_is_active,
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'id', p_id, 'status', v_real_status, 'isActive', v_is_active);
END;
$$;

-- 6. FIX RPC: get_active_alert_popups
CREATE OR REPLACE FUNCTION public.get_active_alert_popups()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Auto-promote scheduled alerts whose start_at has arrived
  UPDATE public.ssc_alert_popups
  SET status = 'published', is_active = true, updated_at = now()
  WHERE status = 'scheduled' AND is_active = true AND now() >= start_at AND (end_at IS NULL OR now() <= end_at);

  -- Auto-expire alerts whose end_at has passed
  UPDATE public.ssc_alert_popups
  SET status = 'expired', is_active = false, updated_at = now()
  WHERE end_at IS NOT NULL AND now() > end_at AND status NOT IN ('expired', 'draft');

  SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT *
    FROM public.ssc_alert_popups
    WHERE (status = 'published' OR (status = 'scheduled' AND now() >= start_at))
      AND status NOT IN ('disabled', 'draft', 'expired')
      AND is_active = true
      AND now() >= start_at
      AND (end_at IS NULL OR now() <= end_at)
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        ELSE 3
      END ASC,
      start_at DESC
  ) t;

  RETURN v_result;
END;
$$;

-- 7. RE-GRANT EXECUTE ON ALL FUNCTIONS
GRANT EXECUTE ON FUNCTION public.admin_save_festival_greeting(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_festival_greeting(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_festival_greeting_status(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_festival_greeting() TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_save_alert_popup(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_alert_popup(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_alert_popup_status(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_alert_popups() TO anon, authenticated, service_role;
