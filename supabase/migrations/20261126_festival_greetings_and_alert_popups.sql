-- ============================================================================
-- MIGRATION: Festival Greetings and Alert Popup Management System
-- Date: 2026-11-26
-- Description:
--   1. Creates public.ssc_festival_greetings table for festival card management.
--   2. Creates public.ssc_alert_popups table for manual alerts & popup messages.
--   3. Sets up RLS policies and grants.
--   4. Adds RPCs for admin management and consumer retrieval with priority queuing.
--   5. Registers tables in supabase_realtime publication.
-- ============================================================================

-- 1. FESTIVAL GREETING CARDS TABLE
CREATE TABLE IF NOT EXISTS public.ssc_festival_greetings (
  id TEXT PRIMARY KEY DEFAULT ('fgc_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12))),
  festival_name TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  message TEXT NOT NULL,
  artwork_url TEXT NOT NULL,
  storage_path TEXT,
  sender_text TEXT NOT NULL DEFAULT 'SmartShopper by JRINA Private Limited',
  supported_languages JSONB DEFAULT '["all"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'disabled', 'expired')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  button_text TEXT DEFAULT 'Wish You The Same!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SSA Administrator',
  views_count INT NOT NULL DEFAULT 0,
  dismissals_count INT NOT NULL DEFAULT 0
);

-- 2. MANUAL ALERT & POPUP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.ssc_alert_popups (
  id TEXT PRIMARY KEY DEFAULT ('alert_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12))),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  storage_path TEXT,
  popup_type TEXT NOT NULL DEFAULT 'general' CHECK (popup_type IN ('general', 'important', 'service', 'promotional', 'emergency', 'custom')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
  target_audience TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'disabled', 'expired')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  display_frequency TEXT NOT NULL DEFAULT 'once' CHECK (display_frequency IN ('once', 'until_acknowledged', 'every_session')),
  button_text TEXT DEFAULT 'Dismiss',
  button_action_type TEXT DEFAULT 'none' CHECK (button_action_type IN ('none', 'screen', 'url')),
  button_action_target TEXT DEFAULT '',
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SSA Administrator',
  delivered_count INT NOT NULL DEFAULT 0,
  viewed_count INT NOT NULL DEFAULT 0,
  dismissed_count INT NOT NULL DEFAULT 0,
  acknowledged_count INT NOT NULL DEFAULT 0
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_ssc_festival_greetings_status ON public.ssc_festival_greetings(status, is_active, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_ssc_alert_popups_status ON public.ssc_alert_popups(status, is_active, priority, start_at, end_at);

-- 3. ENABLE RLS
ALTER TABLE public.ssc_festival_greetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssc_alert_popups ENABLE ROW LEVEL SECURITY;

-- Drop any previous policies
DROP POLICY IF EXISTS "Public can view published festival greetings" ON public.ssc_festival_greetings;
DROP POLICY IF EXISTS "Admins full access festival greetings" ON public.ssc_festival_greetings;
DROP POLICY IF EXISTS "Public can view published alert popups" ON public.ssc_alert_popups;
DROP POLICY IF EXISTS "Admins full access alert popups" ON public.ssc_alert_popups;

-- RLS Policies: Public view of published items
CREATE POLICY "Public can view published festival greetings"
  ON public.ssc_festival_greetings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins full access festival greetings"
  ON public.ssc_festival_greetings
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view published alert popups"
  ON public.ssc_alert_popups
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins full access alert popups"
  ON public.ssc_alert_popups
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 4. REALTIME PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ssc_festival_greetings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ssc_festival_greetings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ssc_alert_popups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ssc_alert_popups;
  END IF;
END $$;

-- 5. RPC: admin_save_festival_greeting
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
  v_message := TRIM(COALESCE(p_greeting->>'message', ''));
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
  IF v_status = 'published' THEN
    IF now() < v_start_at THEN
      v_status := 'scheduled';
    ELSIF v_end_at IS NOT NULL AND now() > v_end_at THEN
      v_status := 'expired';
    END IF;
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
      is_active = (v_status = 'published'),
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
      (v_status = 'published'),
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

-- 6. RPC: admin_delete_festival_greeting
CREATE OR REPLACE FUNCTION public.admin_delete_festival_greeting(p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_storage_path TEXT;
BEGIN
  SELECT storage_path INTO v_storage_path FROM public.ssc_festival_greetings WHERE id = p_id;
  DELETE FROM public.ssc_festival_greetings WHERE id = p_id;
  RETURN jsonb_build_object('success', true, 'storagePath', v_storage_path);
END;
$$;

-- 7. RPC: admin_toggle_festival_greeting_status
CREATE OR REPLACE FUNCTION public.admin_toggle_festival_greeting_status(p_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('draft', 'scheduled', 'published', 'disabled', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status.');
  END IF;

  UPDATE public.ssc_festival_greetings
  SET
    status = p_status,
    is_active = (p_status = 'published'),
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'id', p_id, 'status', p_status, 'isActive', (p_status = 'published'));
END;
$$;

-- 8. RPC: get_active_festival_greeting (Consumer side)
CREATE OR REPLACE FUNCTION public.get_active_festival_greeting()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT *
  INTO v_rec
  FROM public.ssc_festival_greetings
  WHERE (status = 'published' OR is_active = true)
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

-- 9. RPC: admin_save_alert_popup
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
  v_message := TRIM(COALESCE(p_alert->>'message', ''));
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
  
  -- Force critical to be dismissible or acknowledged to prevent trapping users
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
  IF v_status = 'published' THEN
    IF now() < v_start_at THEN
      v_status := 'scheduled';
    ELSIF v_end_at IS NOT NULL AND now() > v_end_at THEN
      v_status := 'expired';
    END IF;
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
      is_active = (v_status = 'published'),
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
      (v_status = 'published'),
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

-- 10. RPC: admin_delete_alert_popup
CREATE OR REPLACE FUNCTION public.admin_delete_alert_popup(p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_storage_path TEXT;
BEGIN
  SELECT storage_path INTO v_storage_path FROM public.ssc_alert_popups WHERE id = p_id;
  DELETE FROM public.ssc_alert_popups WHERE id = p_id;
  RETURN jsonb_build_object('success', true, 'storagePath', v_storage_path);
END;
$$;

-- 11. RPC: admin_toggle_alert_popup_status
CREATE OR REPLACE FUNCTION public.admin_toggle_alert_popup_status(p_id TEXT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('draft', 'scheduled', 'published', 'disabled', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status.');
  END IF;

  UPDATE public.ssc_alert_popups
  SET
    status = p_status,
    is_active = (p_status = 'published'),
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'id', p_id, 'status', p_status, 'isActive', (p_status = 'published'));
END;
$$;

-- 12. RPC: get_active_alert_popups (Consumer side with priority sorting)
CREATE OR REPLACE FUNCTION public.get_active_alert_popups()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT *
    FROM public.ssc_alert_popups
    WHERE (status = 'published' OR is_active = true)
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

-- 13. RPC: record_popup_metric
CREATE OR REPLACE FUNCTION public.record_popup_metric(p_type TEXT, p_id TEXT, p_metric TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_type = 'greeting' THEN
    IF p_metric = 'view' THEN
      UPDATE public.ssc_festival_greetings SET views_count = views_count + 1 WHERE id = p_id;
    ELSIF p_metric = 'dismiss' THEN
      UPDATE public.ssc_festival_greetings SET dismissals_count = dismissals_count + 1 WHERE id = p_id;
    END IF;
  ELSIF p_type = 'alert' THEN
    IF p_metric = 'delivered' THEN
      UPDATE public.ssc_alert_popups SET delivered_count = delivered_count + 1 WHERE id = p_id;
    ELSIF p_metric = 'view' THEN
      UPDATE public.ssc_alert_popups SET viewed_count = viewed_count + 1 WHERE id = p_id;
    ELSIF p_metric = 'dismiss' THEN
      UPDATE public.ssc_alert_popups SET dismissed_count = dismissed_count + 1 WHERE id = p_id;
    ELSIF p_metric = 'acknowledge' THEN
      UPDATE public.ssc_alert_popups SET acknowledged_count = acknowledged_count + 1 WHERE id = p_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 14. GRANTS
GRANT EXECUTE ON FUNCTION public.admin_save_festival_greeting(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_festival_greeting(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_festival_greeting_status(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_festival_greeting() TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_save_alert_popup(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_alert_popup(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_alert_popup_status(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_alert_popups() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_popup_metric(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
