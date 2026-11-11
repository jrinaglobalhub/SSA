-- ============================================================================
-- MIGRATION: 20261111_universal_sudo_user_management.sql
-- DESCRIPTION: SSA Universal SUDO Command-Based User Management System
-- SCOPE: SSC (Consumers - 'ss') and SSM (Merchants - 'ssm')
-- ACTIONS: suspend, ban, delete, restore, unban
-- ============================================================================

-- 1. Create Audit Log Table for SUDO operations
CREATE TABLE IF NOT EXISTS public.admin_sudo_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  admin_email TEXT,
  target_user_id TEXT NOT NULL,
  target_app TEXT NOT NULL CHECK (target_app IN ('SSC', 'SSM')),
  action TEXT NOT NULL CHECK (action IN ('suspend', 'ban', 'delete', 'restore', 'unban')),
  command TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  execution_result TEXT NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT,
  request_ip TEXT,
  client_user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expand CHECK constraints to support BANNED, SUSPENDED, DELETED statuses across all user tables
ALTER TABLE public.app_user_accounts DROP CONSTRAINT IF EXISTS app_user_accounts_status_check;
ALTER TABLE public.app_user_accounts ADD CONSTRAINT app_user_accounts_status_check 
  CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'BANNED'::text, 'PENDING'::text, 'DELETED'::text, 'REVOKED'::text]));

ALTER TABLE public.ssc_users DROP CONSTRAINT IF EXISTS ssc_users_status_check;
ALTER TABLE public.ssc_users ADD CONSTRAINT ssc_users_status_check 
  CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'BANNED'::text, 'DELETED'::text, 'PENDING'::text]));

ALTER TABLE public.ssm_users DROP CONSTRAINT IF EXISTS ssm_users_status_check;
ALTER TABLE public.ssm_users ADD CONSTRAINT ssm_users_status_check 
  CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'BANNED'::text, 'DELETED'::text, 'PENDING'::text]));

ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS chk_stores_subscription_status;
ALTER TABLE public.stores ADD CONSTRAINT chk_stores_subscription_status 
  CHECK (subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'cancelled'::text, 'expired'::text, 'suspended'::text, 'banned'::text, 'deleted'::text]));

ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_verification_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_verification_status_check 
  CHECK (verification_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUSPENDED'::text, 'BANNED'::text, 'DELETED'::text]));

-- Indices for rapid audit querying
CREATE INDEX IF NOT EXISTS idx_sudo_audit_target ON public.admin_sudo_audit_logs (target_user_id, target_app);
CREATE INDEX IF NOT EXISTS idx_sudo_audit_admin ON public.admin_sudo_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_sudo_audit_action ON public.admin_sudo_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_sudo_audit_created ON public.admin_sudo_audit_logs (created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE public.admin_sudo_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin role / superusers to view audit logs
DROP POLICY IF EXISTS "Admins can view sudo audit logs" ON public.admin_sudo_audit_logs;
CREATE POLICY "Admins can view sudo audit logs"
ON public.admin_sudo_audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Deny UPDATE and DELETE to ensure append-only audit trail
DROP POLICY IF EXISTS "Deny update on sudo audit logs" ON public.admin_sudo_audit_logs;
CREATE POLICY "Deny update on sudo audit logs"
ON public.admin_sudo_audit_logs
FOR UPDATE
TO public
USING (false);

DROP POLICY IF EXISTS "Deny delete on sudo audit logs" ON public.admin_sudo_audit_logs;
CREATE POLICY "Deny delete on sudo audit logs"
ON public.admin_sudo_audit_logs
FOR DELETE
TO public
USING (false);

-- 2. Master SUDO User Action Execution RPC
CREATE OR REPLACE FUNCTION public.execute_sudo_user_action(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_action TEXT;
  v_scope TEXT;
  v_command TEXT;
  v_target_id TEXT;
  v_reason TEXT;
  v_admin_id TEXT;
  v_admin_email TEXT;
  v_expected_command TEXT;
  v_app_code TEXT;
  v_auth_user_id UUID;
  v_store_id TEXT;
  v_previous_status TEXT := 'UNKNOWN';
  v_new_status TEXT;
  v_new_status_upper TEXT;
  v_other_active_count INT := 0;
  v_audit_id UUID;
  v_store_name TEXT := '';
BEGIN
  -- 1. Parse inputs
  v_action := LOWER(TRIM(COALESCE(p_payload->>'action', '')));
  v_scope := LOWER(TRIM(COALESCE(p_payload->>'scope', '')));
  v_command := LOWER(TRIM(REGEXP_REPLACE(COALESCE(p_payload->>'command', ''), '\s+', ' ', 'g')));
  v_target_id := TRIM(COALESCE(p_payload->>'targetId', p_payload->>'target_id', ''));
  v_reason := TRIM(COALESCE(p_payload->>'reason', ''));
  v_admin_id := TRIM(COALESCE(p_payload->>'adminId', p_payload->>'admin_id', 'admin'));
  v_admin_email := TRIM(COALESCE(p_payload->>'adminEmail', p_payload->>'admin_email', 'founder@jrina.online'));

  -- 2. Validate Action
  IF v_action NOT IN ('suspend', 'ban', 'delete', 'restore', 'unban') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || v_action);
  END IF;

  -- 3. Validate Scope
  IF v_scope NOT IN ('ss', 'ssm') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid scope: ' || v_scope || '. Allowed scopes: ss (SSC) or ssm (SSM)');
  END IF;

  v_app_code := CASE WHEN v_scope = 'ss' THEN 'SSC' ELSE 'SSM' END;

  -- 4. Validate Exact SUDO Command Structure
  v_expected_command := 'sudo ' || v_action || ' ' || v_scope || ' --admin confirm';
  IF v_command <> v_expected_command THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Command validation failed. Expected: "' || v_expected_command || '", received: "' || v_command || '"'
    );
  END IF;

  -- 5. Validate Target ID
  IF v_target_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user identifier is required.');
  END IF;

  -- 6. Validate Reason for destructive / administrative actions
  IF v_action IN ('suspend', 'ban', 'delete') AND v_reason = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid reason is required for ' || UPPER(v_action) || ' action.');
  END IF;

  -- 7. Scope Resolution & Target Validation
  IF v_scope = 'ss' THEN
    -- Resolve SSC consumer
    -- Try to find in ssc_users first, then app_user_accounts, then auth.users / app_users
    SELECT 
      su.auth_user_id,
      COALESCE(aua.status, su.status, 'ACTIVE')
    INTO v_auth_user_id, v_previous_status
    FROM public.ssc_users su
    LEFT JOIN public.app_user_accounts aua ON aua.auth_user_id = su.auth_user_id AND aua.app_code = 'SSC'
    WHERE su.auth_user_id::text = v_target_id 
       OR su.customer_id = v_target_id 
       OR su.id::text = v_target_id
       OR su.phone = v_target_id
       OR su.email = v_target_id
    LIMIT 1;

    IF v_auth_user_id IS NULL THEN
      -- Fallback to app_user_accounts directly
      SELECT 
        auth_user_id, status 
      INTO v_auth_user_id, v_previous_status
      FROM public.app_user_accounts 
      WHERE (auth_user_id::text = v_target_id OR mobile = v_target_id OR email = v_target_id)
        AND app_code = 'SSC'
      LIMIT 1;
    END IF;

    IF v_auth_user_id IS NULL THEN
      -- Fallback to auth.users / app_users
      SELECT 
        u.id,
        CASE 
          WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'BANNED'
          WHEN u.deleted_at IS NOT NULL THEN 'DELETED'
          ELSE 'ACTIVE'
        END
      INTO v_auth_user_id, v_previous_status
      FROM auth.users u
      WHERE u.id::text = v_target_id;
    END IF;

    IF v_auth_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Target consumer account not found in SSC.');
    END IF;

  ELSIF v_scope = 'ssm' THEN
    -- Resolve SSM merchant
    -- Can match store id (e.g. 'store_ff4d1e764bd7') or owner_id
    SELECT 
      s.id,
      s.owner_id::uuid,
      s.name,
      COALESCE(aua.status, s.subscription_status, 'ACTIVE')
    INTO v_store_id, v_auth_user_id, v_store_name, v_previous_status
    FROM public.stores s
    LEFT JOIN public.app_user_accounts aua ON aua.auth_user_id::text = s.owner_id AND aua.app_code = 'SSM'
    WHERE s.id = v_target_id 
       OR s.owner_id = v_target_id
       OR s.id = 'store_' || REPLACE(v_target_id, 'store_', '')
    LIMIT 1;

    IF v_store_id IS NULL THEN
      -- Try ssm_users directly
      SELECT 
        mu.store_id,
        mu.auth_user_id,
        COALESCE(mu.status, 'ACTIVE')
      INTO v_store_id, v_auth_user_id, v_previous_status
      FROM public.ssm_users mu
      WHERE mu.store_id = v_target_id 
         OR mu.auth_user_id::text = v_target_id
         OR mu.id::text = v_target_id
         OR mu.phone = v_target_id
      LIMIT 1;
    END IF;

    IF v_auth_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Target merchant store / account not found in SSM.');
    END IF;
  END IF;

  -- Normalize previous status
  v_previous_status := UPPER(TRIM(COALESCE(v_previous_status, 'ACTIVE')));

  -- 8. Status Transition Validations
  IF v_action = 'suspend' THEN
    IF v_previous_status = 'SUSPENDED' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Account is already suspended.');
    ELSIF v_previous_status = 'BANNED' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot suspend an account that is already banned.');
    ELSIF v_previous_status = 'DELETED' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot suspend a deleted account.');
    END IF;
    v_new_status := 'suspended';
    v_new_status_upper := 'SUSPENDED';

  ELSIF v_action = 'ban' THEN
    IF v_previous_status = 'BANNED' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Account is already banned.');
    ELSIF v_previous_status = 'DELETED' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot ban a deleted account.');
    END IF;
    v_new_status := 'banned';
    v_new_status_upper := 'BANNED';

  ELSIF v_action = 'delete' THEN
    IF v_previous_status = 'DELETED' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Account is already deleted.');
    END IF;
    v_new_status := 'deleted';
    v_new_status_upper := 'DELETED';

  ELSIF v_action = 'restore' THEN
    -- Restore is strictly for SUSPENDED accounts
    IF v_previous_status <> 'SUSPENDED' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot restore account with status "' || v_previous_status || '". Only SUSPENDED accounts can be restored. Use unban for banned accounts.'
      );
    END IF;
    v_new_status := 'active';
    v_new_status_upper := 'ACTIVE';

  ELSIF v_action = 'unban' THEN
    -- Unban is strictly for BANNED accounts
    IF v_previous_status <> 'BANNED' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot unban account with status "' || v_previous_status || '". Account is not currently banned.'
      );
    END IF;
    v_new_status := 'active';
    v_new_status_upper := 'ACTIVE';
  END IF;

  -- 9. Execute Updates Atomically
  IF v_scope = 'ss' THEN
    -- Update app_user_accounts for SSC
    UPDATE public.app_user_accounts
    SET 
      status = v_new_status_upper,
      updated_at = now()
    WHERE auth_user_id = v_auth_user_id AND app_code = 'SSC';

    -- Update ssc_users table
    UPDATE public.ssc_users
    SET 
      status = v_new_status_upper,
      updated_at = now()
    WHERE auth_user_id = v_auth_user_id;

    -- Update app_users table
    UPDATE public.app_users
    SET
      address = jsonb_set(COALESCE(address, '{}'::jsonb), '{account_status}', to_jsonb(v_new_status))
    WHERE id = v_auth_user_id::text;

  ELSIF v_scope = 'ssm' THEN
    -- Update app_user_accounts for SSM
    UPDATE public.app_user_accounts
    SET 
      status = v_new_status_upper,
      updated_at = now()
    WHERE auth_user_id = v_auth_user_id AND app_code = 'SSM';

    -- Update ssm_users
    UPDATE public.ssm_users
    SET 
      status = v_new_status_upper,
      verification_status = CASE 
        WHEN v_action IN ('ban', 'delete') THEN 'REJECTED'
        WHEN v_action = 'suspend' THEN 'SUSPENDED'
        ELSE 'APPROVED'
      END,
      updated_at = now()
    WHERE auth_user_id = v_auth_user_id OR store_id = v_store_id;

    -- Update stores table
    IF v_store_id IS NOT NULL THEN
      UPDATE public.stores
      SET 
        subscription_status = v_new_status,
        verification_status = CASE 
          WHEN v_action IN ('ban', 'delete') THEN 'REJECTED'
          WHEN v_action = 'suspend' THEN 'SUSPENDED'
          ELSE 'APPROVED'
        END,
        rejection_reason = CASE 
          WHEN v_action IN ('suspend', 'ban', 'delete') THEN v_reason 
          ELSE NULL 
        END,
        updated_at = now()
      WHERE id = v_store_id;
    END IF;
  END IF;

  -- 10. Session Revocation on Privileged Disabling Actions
  IF v_action IN ('suspend', 'ban', 'delete') THEN
    DELETE FROM auth.sessions WHERE user_id = v_auth_user_id;
  END IF;

  -- 11. Auth Level Banning/Deletion (with application isolation safeguards)
  -- Count if this user has any other ACTIVE accounts in the ecosystem
  SELECT COUNT(*) INTO v_other_active_count
  FROM public.app_user_accounts
  WHERE auth_user_id = v_auth_user_id 
    AND app_code <> v_app_code 
    AND status = 'ACTIVE';

  IF v_action = 'ban' THEN
    -- If user has other active accounts in other apps (e.g. is an active merchant but banned consumer),
    -- we do NOT lock auth.users globally to respect application isolation.
    IF v_other_active_count = 0 THEN
      UPDATE auth.users 
      SET banned_until = '3000-01-01 00:00:00+00'::timestamptz 
      WHERE id = v_auth_user_id;
    END IF;

  ELSIF v_action = 'delete' THEN
    IF v_other_active_count = 0 THEN
      UPDATE auth.users 
      SET deleted_at = now(), banned_until = '3000-01-01 00:00:00+00'::timestamptz 
      WHERE id = v_auth_user_id;
    END IF;

  ELSIF v_action IN ('restore', 'unban') THEN
    -- Lift auth ban
    UPDATE auth.users 
    SET banned_until = NULL, deleted_at = NULL 
    WHERE id = v_auth_user_id;
  END IF;

  -- 12. Write to Audit Trail
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
    v_admin_email,
    COALESCE(v_store_id, v_auth_user_id::text),
    v_app_code,
    v_action,
    v_expected_command,
    v_previous_status,
    v_new_status_upper,
    v_reason,
    'SUCCESS',
    jsonb_build_object(
      'auth_user_id', v_auth_user_id,
      'store_id', v_store_id,
      'store_name', v_store_name,
      'app_code', v_app_code,
      'timestamp', now()
    )
  )
  RETURNING id INTO v_audit_id;

  -- 13. Return server-confirmed success result
  RETURN jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'action', v_action,
    'scope', v_scope,
    'target_app', v_app_code,
    'target_id', COALESCE(v_store_id, v_auth_user_id::text),
    'auth_user_id', v_auth_user_id,
    'previous_status', v_previous_status,
    'new_status', v_new_status_upper,
    'command', v_expected_command,
    'reason', v_reason,
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Log failure in audit table
  BEGIN
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
      error_message
    ) VALUES (
      COALESCE(v_admin_id, 'admin'),
      v_admin_email,
      COALESCE(v_target_id, 'UNKNOWN'),
      COALESCE(v_app_code, 'SSC'),
      COALESCE(v_action, 'UNKNOWN'),
      COALESCE(v_command, ''),
      COALESCE(v_previous_status, 'UNKNOWN'),
      'ERROR',
      v_reason,
      'FAILED',
      SQLERRM
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Database execution failure: ' || SQLERRM
  );
END;
$$;

-- 3. Audit Retrieval RPC for Administrative Dashboard
CREATE OR REPLACE FUNCTION public.get_sudo_audit_logs(
  p_target_id TEXT DEFAULT NULL,
  p_scope TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  admin_id TEXT,
  admin_email TEXT,
  target_user_id TEXT,
  target_app TEXT,
  action TEXT,
  command TEXT,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  execution_result TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    l.id,
    l.admin_id,
    l.admin_email,
    l.target_user_id,
    l.target_app,
    l.action,
    l.command,
    l.previous_status,
    l.new_status,
    l.reason,
    l.execution_result,
    l.error_message,
    l.created_at
  FROM public.admin_sudo_audit_logs l
  WHERE (p_target_id IS NULL OR l.target_user_id = p_target_id)
    AND (p_scope IS NULL OR l.target_app = UPPER(p_scope))
  ORDER BY l.created_at DESC
  LIMIT p_limit;
$$;

-- 4. Update get_admin_consumers RPC to join app_user_accounts for accurate live status
CREATE OR REPLACE FUNCTION public.get_admin_consumers(
  p_search text DEFAULT ''::text,
  p_status text DEFAULT 'all'::text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id text,
  customer_id text,
  name text,
  username text,
  phone text,
  email text,
  state text,
  city text,
  registration_date timestamp with time zone,
  last_active_date timestamp with time zone,
  account_status text,
  referral_code text,
  referred_by_code text,
  total_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_total bigint;
BEGIN
  -- Calculate total count matching search and filters
  SELECT COUNT(*) INTO v_total
  FROM auth.users u
  LEFT JOIN public.app_users a ON u.id::text = a.id
  LEFT JOIN public.app_user_accounts aua ON aua.auth_user_id = u.id AND aua.app_code = 'SSC'
  WHERE (
    (u.raw_user_meta_data->>'role' = 'consumer' OR a.role = 'consumer')
    OR (
      (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' NOT IN ('merchant_partner'))
      AND (a.role IS NULL OR a.role NOT IN ('merchant_partner'))
    )
  )
  AND (
    p_search IS NULL OR TRIM(p_search) = '' OR
    (u.email ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(aua.email, '') ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(a.full_name, u.raw_user_meta_data->>'full_name', aua.metadata->>'full_name') ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(aua.mobile, a.phone, u.raw_user_meta_data->>'phone', u.phone) ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(a.customer_id, aua.metadata->>'customer_id', '') ILIKE '%' || TRIM(p_search) || '%')
  )
  AND (
    p_status IS NULL OR p_status = 'all' OR
    (p_status = 'active' AND (aua.status = 'ACTIVE' OR (aua.status IS NULL AND u.last_sign_in_at > now() - interval '30 days'))) OR
    (p_status = 'suspended' AND aua.status = 'SUSPENDED') OR
    (p_status = 'banned' AND (aua.status = 'BANNED' OR (u.banned_until IS NOT NULL AND u.banned_until > now()))) OR
    (p_status = 'deleted' AND (aua.status = 'DELETED' OR u.deleted_at IS NOT NULL)) OR
    (p_status = 'inactive' AND (aua.status IS NULL AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at <= now() - interval '30 days')))
  );

  RETURN QUERY
  SELECT 
    u.id::text as id,
    COALESCE(a.customer_id, aua.metadata->>'customer_id', 'Not assigned')::text as customer_id,
    COALESCE(
      NULLIF(TRIM(a.full_name), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(aua.metadata->>'full_name'), ''),
      NULLIF(TRIM(a.username), ''),
      split_part(u.email::text, '@', 1)
    )::text as name,
    COALESCE(NULLIF(TRIM(a.username), ''), u.raw_user_meta_data->>'username', aua.metadata->>'username', 'consumer')::text as username,
    COALESCE(
      NULLIF(TRIM(aua.mobile), ''),
      NULLIF(TRIM(a.phone), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''),
      NULLIF(TRIM(u.phone::text), ''),
      'Not available'
    )::text as phone,
    COALESCE(u.email::text, 'Not available')::text as email,
    COALESCE(
      NULLIF(TRIM(a.address->>'state'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->'delivery_address'->>'state'), ''),
      'Kerala'
    )::text as state,
    COALESCE(
      NULLIF(TRIM(a.address->>'city'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->'delivery_address'->>'city'), ''),
      'Not available'
    )::text as city,
    u.created_at as registration_date,
    u.last_sign_in_at as last_active_date,
    (CASE 
      WHEN aua.status = 'SUSPENDED' THEN 'suspended'
      WHEN aua.status = 'BANNED' OR (u.banned_until IS NOT NULL AND u.banned_until > now()) THEN 'banned'
      WHEN aua.status = 'DELETED' OR u.deleted_at IS NOT NULL THEN 'deleted'
      WHEN u.last_sign_in_at > now() - interval '30 days' THEN 'active'
      ELSE 'inactive'
    END)::text as account_status,
    COALESCE(a.referral_code, 'None')::text as referral_code,
    COALESCE(a.referred_by_code, 'Direct')::text as referred_by_code,
    v_total::bigint as total_count
  FROM auth.users u
  LEFT JOIN public.app_users a ON u.id::text = a.id
  LEFT JOIN public.app_user_accounts aua ON aua.auth_user_id = u.id AND aua.app_code = 'SSC'
  WHERE (
    (u.raw_user_meta_data->>'role' = 'consumer' OR a.role = 'consumer')
    OR (
      (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' NOT IN ('merchant_partner'))
      AND (a.role IS NULL OR a.role NOT IN ('merchant_partner'))
    )
  )
  AND (
    p_search IS NULL OR TRIM(p_search) = '' OR
    (u.email ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(aua.email, '') ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(a.full_name, u.raw_user_meta_data->>'full_name', aua.metadata->>'full_name') ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(aua.mobile, a.phone, u.raw_user_meta_data->>'phone', u.phone) ILIKE '%' || TRIM(p_search) || '%') OR
    (COALESCE(a.customer_id, aua.metadata->>'customer_id', '') ILIKE '%' || TRIM(p_search) || '%')
  )
  AND (
    p_status IS NULL OR p_status = 'all' OR
    (p_status = 'active' AND (aua.status = 'ACTIVE' OR (aua.status IS NULL AND u.last_sign_in_at > now() - interval '30 days'))) OR
    (p_status = 'suspended' AND aua.status = 'SUSPENDED') OR
    (p_status = 'banned' AND (aua.status = 'BANNED' OR (u.banned_until IS NOT NULL AND u.banned_until > now()))) OR
    (p_status = 'deleted' AND (aua.status = 'DELETED' OR u.deleted_at IS NOT NULL)) OR
    (p_status = 'inactive' AND (aua.status IS NULL AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at <= now() - interval '30 days')))
  )
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
