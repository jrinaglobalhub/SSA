-- ============================================================================
-- MIGRATION: 20261125_seasonal_theme_override.sql
-- DESCRIPTION: SSA Founder / Super Admin Manual Seasonal Theme Override
--              Configures global seasonal theme override with server-side
--              RBAC enforcement, realtime client sync, and audit logging.
-- ============================================================================

-- 1. Create Seasonal Theme Configuration Table
CREATE TABLE IF NOT EXISTS public.app_seasonal_theme_config (
  id TEXT PRIMARY KEY DEFAULT 'current',
  mode TEXT NOT NULL CHECK (mode IN ('automatic', 'manual')) DEFAULT 'automatic',
  manual_theme_id TEXT CHECK (manual_theme_id IN ('normal', 'sunny', 'monsoon', 'ice', 'christmas_ice', 'new_year', 'ramadan')),
  applied_theme_id TEXT NOT NULL DEFAULT 'normal',
  updated_by TEXT NOT NULL DEFAULT 'System',
  updated_by_role TEXT NOT NULL DEFAULT 'super_admin',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_seasonal_theme_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access (SmartShopper Consumer App and Admin can fetch & listen)
DROP POLICY IF EXISTS "Allow public read access to seasonal theme config" ON public.app_seasonal_theme_config;
CREATE POLICY "Allow public read access to seasonal theme config"
  ON public.app_seasonal_theme_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Deny all direct write operations from clients (must go through authorized RPC)
DROP POLICY IF EXISTS "Deny direct public write on seasonal theme config" ON public.app_seasonal_theme_config;
CREATE POLICY "Deny direct public write on seasonal theme config"
  ON public.app_seasonal_theme_config
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 3. Expand admin_sudo_audit_logs action & target_app check
ALTER TABLE public.admin_sudo_audit_logs DROP CONSTRAINT IF EXISTS admin_sudo_audit_logs_action_check;
ALTER TABLE public.admin_sudo_audit_logs ADD CONSTRAINT admin_sudo_audit_logs_action_check 
  CHECK (action IN ('suspend', 'ban', 'delete', 'restore', 'unban', 'plan_override', 'theme_override'));

ALTER TABLE public.admin_sudo_audit_logs DROP CONSTRAINT IF EXISTS admin_sudo_audit_logs_target_app_check;
ALTER TABLE public.admin_sudo_audit_logs ADD CONSTRAINT admin_sudo_audit_logs_target_app_check 
  CHECK (target_app IN ('SSC', 'SSM', 'GLOBAL', 'GLOBAL_THEME'));

-- 4. Helper Function: Calculate date-based automatic theme using Asia/Kolkata
CREATE OR REPLACE FUNCTION public.resolve_automatic_seasonal_theme()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_now_kolkata TIMESTAMPTZ;
  v_month INT;
  v_day INT;
  v_iso_date TEXT;
  v_is_ramadan BOOLEAN := false;
BEGIN
  v_now_kolkata := timezone('Asia/Kolkata', now());
  v_month := EXTRACT(MONTH FROM v_now_kolkata)::INT;
  v_day := EXTRACT(DAY FROM v_now_kolkata)::INT;
  v_iso_date := TO_CHAR(v_now_kolkata, 'YYYY-MM-DD');

  -- 1. Ramadan Calendar (Asia/Kolkata local dates)
  IF (v_iso_date >= '2025-03-02' AND v_iso_date <= '2025-03-31') OR
     (v_iso_date >= '2026-02-19' AND v_iso_date <= '2026-03-20') OR
     (v_iso_date >= '2027-02-09' AND v_iso_date <= '2027-03-10') OR
     (v_iso_date >= '2028-01-29' AND v_iso_date <= '2028-02-27') OR
     (v_iso_date >= '2029-01-17' AND v_iso_date <= '2029-02-15') OR
     (v_iso_date >= '2030-01-06' AND v_iso_date <= '2030-02-04') OR
     (v_iso_date >= '2030-12-26' AND v_iso_date <= '2031-01-24') OR
     (v_iso_date >= '2031-12-16' AND v_iso_date <= '2032-01-14') OR
     (v_iso_date >= '2032-12-05' AND v_iso_date <= '2033-01-02') THEN
    v_is_ramadan := true;
  END IF;

  IF v_is_ramadan THEN
    RETURN 'ramadan';
  END IF;

  -- 2. Christmas + Ice: Dec 24 - Dec 26
  IF v_month = 12 AND v_day >= 24 AND v_day <= 26 THEN
    RETURN 'christmas_ice';
  END IF;

  -- 3. New Year: Dec 31 - Jan 5
  IF (v_month = 12 AND v_day = 31) OR (v_month = 1 AND v_day >= 1 AND v_day <= 5) THEN
    RETURN 'new_year';
  END IF;

  -- 4. Ice: Nov 20 - Dec 30
  IF (v_month = 11 AND v_day >= 20) OR (v_month = 12 AND v_day >= 1 AND v_day <= 30) THEN
    RETURN 'ice';
  END IF;

  -- 5. Monsoon + School Reopening: June 1 - June 30
  IF v_month = 6 AND v_day >= 1 AND v_day <= 30 THEN
    RETURN 'monsoon';
  END IF;

  -- 6. Sunny: March 1 - May 31
  IF v_month >= 3 AND v_month <= 5 THEN
    RETURN 'sunny';
  END IF;

  -- 7. Normal
  RETURN 'normal';
END;
$$;

-- 5. Helper Function: Validate Founder / Super Admin authorization
-- Strictly blocks all non-super-admin roles (including regular staff or non-founder accounts)
CREATE OR REPLACE FUNCTION public.is_founder_super_admin(p_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_jwt_role TEXT;
  v_app_role TEXT;
  v_user_email TEXT;
  v_db_role TEXT;
BEGIN
  -- Service role is always authorized
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_jwt_role = 'service_role' THEN
    RETURN true;
  END IF;

  -- Check app_metadata
  v_app_role := COALESCE((auth.jwt() -> 'app_metadata') ->> 'role', '');
  IF v_app_role IN ('super_admin', 'founder') THEN
    RETURN true;
  END IF;

  -- Check authenticated session
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
    IF LOWER(v_user_email) IN ('founder@jrina.online', 'info@jrina.online', 'jrinaglobalhub@gmail.com')
       OR LOWER(v_user_email) ILIKE '%founder%' THEN
      RETURN true;
    END IF;

    SELECT role INTO v_db_role FROM public.app_users WHERE id = (auth.uid())::text;
    IF v_db_role IN ('super_admin', 'founder') THEN
      RETURN true;
    END IF;
  END IF;

  -- Check passed administrative email (for desktop clearance fallback)
  -- Strictly requires founder email or verified super_admin role in app_users
  IF p_email IS NOT NULL AND p_email <> '' THEN
    IF LOWER(p_email) IN ('founder@jrina.online', 'info@jrina.online', 'jrinaglobalhub@gmail.com')
       OR LOWER(p_email) ILIKE '%founder%' THEN
      RETURN true;
    END IF;

    -- Look up role via auth.users joined to app_users
    SELECT u.role INTO v_db_role 
    FROM auth.users a
    JOIN public.app_users u ON u.id = a.id::text
    WHERE LOWER(a.email) = LOWER(p_email)
    LIMIT 1;

    IF v_db_role IN ('super_admin', 'founder') THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- 6. Seed initial row if not existing
INSERT INTO public.app_seasonal_theme_config (
  id,
  mode,
  manual_theme_id,
  applied_theme_id,
  updated_by,
  updated_by_role,
  updated_at
) VALUES (
  'current',
  'automatic',
  NULL,
  public.resolve_automatic_seasonal_theme(),
  'System Initialization',
  'super_admin',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  applied_theme_id = CASE 
    WHEN public.app_seasonal_theme_config.mode = 'manual' AND public.app_seasonal_theme_config.manual_theme_id IS NOT NULL 
    THEN public.app_seasonal_theme_config.manual_theme_id 
    ELSE public.resolve_automatic_seasonal_theme() 
  END;

-- 7. Master Secure RPC: Set Seasonal Theme Override (Founder / Super Admin ONLY)
CREATE OR REPLACE FUNCTION public.admin_set_seasonal_theme_override(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_mode TEXT;
  v_theme_id TEXT;
  v_admin_email TEXT;
  v_admin_id TEXT;
  v_reason TEXT;
  v_old_mode TEXT;
  v_old_applied TEXT;
  v_old_manual TEXT;
  v_new_applied TEXT;
  v_new_manual TEXT;
  v_auto_detected TEXT;
  v_is_authorized BOOLEAN;
BEGIN
  -- Parse inputs
  v_mode := LOWER(TRIM(COALESCE(p_payload->>'mode', '')));
  v_theme_id := LOWER(TRIM(COALESCE(p_payload->>'themeId', p_payload->>'theme_id', '')));
  v_admin_email := TRIM(COALESCE(p_payload->>'adminEmail', p_payload->>'admin_email', ''));
  v_admin_id := TRIM(COALESCE(p_payload->>'adminId', p_payload->>'admin_id', 'founder_super_admin'));
  v_reason := TRIM(COALESCE(p_payload->>'reason', ''));

  -- 1. STRICT ACCESS CONTROL: Founder / Super Admin ONLY
  -- Prevent any other admin roles or unauthorized callers from executing this RPC
  v_is_authorized := public.is_founder_super_admin(v_admin_email);
  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Seasonal theme override is strictly restricted to Founder / Super Admin.'
    );
  END IF;

  -- 2. Validate Mode
  IF v_mode NOT IN ('automatic', 'manual') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid mode "' || v_mode || '". Allowed modes are "automatic" or "manual".'
    );
  END IF;

  -- 3. Calculate current automatic theme
  v_auto_detected := public.resolve_automatic_seasonal_theme();

  -- 4. Validate Theme Selection for Manual Mode
  IF v_mode = 'manual' THEN
    IF v_theme_id NOT IN ('normal', 'sunny', 'monsoon', 'ice', 'christmas_ice', 'new_year', 'ramadan') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid theme ID "' || v_theme_id || '". Must be one of: normal, sunny, monsoon, ice, christmas_ice, new_year, ramadan.'
      );
    END IF;
    v_new_manual := v_theme_id;
    v_new_applied := v_theme_id;
  ELSE
    -- Automatic mode: clear manual theme, immediately resolve date-based theme
    v_new_manual := NULL;
    v_new_applied := v_auto_detected;
  END IF;

  -- 5. Fetch previous state for audit trail
  SELECT mode, applied_theme_id, manual_theme_id
  INTO v_old_mode, v_old_applied, v_old_manual
  FROM public.app_seasonal_theme_config
  WHERE id = 'current'
  LIMIT 1;

  -- 6. Atomic Update
  INSERT INTO public.app_seasonal_theme_config (
    id,
    mode,
    manual_theme_id,
    applied_theme_id,
    updated_by,
    updated_by_role,
    updated_at
  ) VALUES (
    'current',
    v_mode,
    v_new_manual,
    v_new_applied,
    COALESCE(NULLIF(v_admin_email, ''), 'Founder / Super Admin'),
    'super_admin',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    mode = EXCLUDED.mode,
    manual_theme_id = EXCLUDED.manual_theme_id,
    applied_theme_id = EXCLUDED.applied_theme_id,
    updated_by = EXCLUDED.updated_by,
    updated_by_role = EXCLUDED.updated_by_role,
    updated_at = now();

  -- 7. Record in SUDO Audit Log
  INSERT INTO public.admin_sudo_audit_logs (
    admin_id,
    admin_email,
    target_user_id,
    target_app,
    action,
    command,
    previous_status,
    new_status,
    reason,
    execution_result,
    metadata
  ) VALUES (
    v_admin_id,
    COALESCE(NULLIF(v_admin_email, ''), 'founder@jrina.online'),
    'GLOBAL_THEME',
    'GLOBAL_THEME',
    'theme_override',
    CASE WHEN v_mode = 'manual' THEN 'theme override --theme ' || v_new_applied || ' --confirm' ELSE 'theme override --auto --confirm' END,
    COALESCE(v_old_mode, 'automatic') || ' [' || COALESCE(v_old_applied, 'normal') || ']',
    v_mode || ' [' || v_new_applied || ']',
    COALESCE(NULLIF(v_reason, ''), CASE WHEN v_mode = 'manual' THEN 'Founder manual theme override to ' || v_new_applied ELSE 'Restored automatic seasonal schedule' END),
    'SUCCESS',
    jsonb_build_object(
      'operation', 'SEASONAL_THEME_OVERRIDE',
      'mode', v_mode,
      'theme_id', v_new_applied,
      'manual_theme_id', v_new_manual,
      'auto_detected', v_auto_detected,
      'previous_mode', v_old_mode,
      'previous_applied', v_old_applied,
      'previous_manual', v_old_manual
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'mode', v_mode,
    'activeTheme', v_new_applied,
    'manualTheme', v_new_manual,
    'autoDetectedTheme', v_auto_detected,
    'updatedAt', now(),
    'updatedBy', COALESCE(NULLIF(v_admin_email, ''), 'founder@jrina.online')
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 8. Query RPC: Fetch current seasonal theme config and auto detected season
CREATE OR REPLACE FUNCTION public.get_seasonal_theme_config()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row RECORD;
  v_auto_detected TEXT;
BEGIN
  v_auto_detected := public.resolve_automatic_seasonal_theme();

  SELECT * INTO v_row
  FROM public.app_seasonal_theme_config
  WHERE id = 'current'
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object(
      'mode', 'automatic',
      'manualThemeId', NULL,
      'appliedThemeId', v_auto_detected,
      'autoDetectedTheme', v_auto_detected,
      'updatedBy', 'System',
      'updatedAt', now()
    );
  END IF;

  RETURN jsonb_build_object(
    'mode', v_row.mode,
    'manualThemeId', v_row.manual_theme_id,
    'appliedThemeId', v_row.applied_theme_id,
    'autoDetectedTheme', v_auto_detected,
    'updatedBy', v_row.updated_by,
    'updatedByRole', v_row.updated_by_role,
    'updatedAt', v_row.updated_at
  );
END;
$$;

-- 9. Add app_seasonal_theme_config to Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_seasonal_theme_config;
  EXCEPTION WHEN duplicate_object THEN
    -- Already in publication
    NULL;
  END;
END;
$$;
