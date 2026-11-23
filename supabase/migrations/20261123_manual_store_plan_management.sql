-- ============================================================================
-- MIGRATION: 20261123_manual_store_plan_management.sql
-- DESCRIPTION: SSA Manual Store Plan Management (FREE, PRO, PREMIUM)
--              with duration and "sudo ssm confirm" command security
-- ============================================================================

-- 1. Ensure stores table supports PREMIUM plan alongside FREE and PRO
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS chk_stores_subscription_plan;
ALTER TABLE public.stores ADD CONSTRAINT chk_stores_subscription_plan 
  CHECK (subscription_plan = ANY (ARRAY['FREE'::text, 'PRO'::text, 'PREMIUM'::text, 'PRO_MONTHLY'::text, 'PRO_ANNUAL'::text, 'ENTERPRISE'::text]));

-- 2. Add subscription_expires_at column to stores if not exists
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 3. Expand admin_sudo_audit_logs action check to include plan_override
ALTER TABLE public.admin_sudo_audit_logs DROP CONSTRAINT IF EXISTS admin_sudo_audit_logs_action_check;
ALTER TABLE public.admin_sudo_audit_logs ADD CONSTRAINT admin_sudo_audit_logs_action_check 
  CHECK (action IN ('suspend', 'ban', 'delete', 'restore', 'unban', 'plan_override'));

-- 4. Create Master RPC for Manual Store Plan Override
CREATE OR REPLACE FUNCTION public.admin_override_store_plan(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_store_id_in TEXT;
  v_store_id TEXT;
  v_store_name TEXT;
  v_plan_in TEXT;
  v_plan_upper TEXT;
  v_duration_days INT;
  v_duration_label TEXT;
  v_command TEXT;
  v_reason TEXT;
  v_admin_id TEXT;
  v_admin_email TEXT;
  v_old_plan TEXT;
  v_old_status TEXT;
  v_old_expires_at TIMESTAMPTZ;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  -- Parse inputs
  v_store_id_in := TRIM(COALESCE(p_payload->>'storeId', p_payload->>'store_id', ''));
  v_plan_in := TRIM(COALESCE(p_payload->>'plan', ''));
  v_duration_days := COALESCE((p_payload->>'durationDays')::int, (p_payload->>'duration_days')::int, 0);
  v_duration_label := TRIM(COALESCE(p_payload->>'durationLabel', p_payload->>'duration_label', ''));
  v_command := LOWER(TRIM(REGEXP_REPLACE(COALESCE(p_payload->>'command', ''), '\s+', ' ', 'g')));
  v_reason := TRIM(COALESCE(p_payload->>'reason', ''));
  v_admin_id := TRIM(COALESCE(p_payload->>'adminId', p_payload->>'admin_id', 'founder_super_admin'));
  v_admin_email := TRIM(COALESCE(p_payload->>'adminEmail', p_payload->>'admin_email', 'founder@jrina.online'));

  -- Validate Target Store ID
  IF v_store_id_in = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Store identifier is required.');
  END IF;

  -- Validate Exact Confirmation Command
  IF v_command <> 'sudo ssm confirm' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Security command validation failed. You must enter "sudo ssm confirm" exactly to activate this plan.'
    );
  END IF;

  -- Validate Target Plan
  v_plan_upper := UPPER(v_plan_in);
  IF v_plan_upper NOT IN ('FREE', 'PRO', 'PREMIUM') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid plan: "' || v_plan_in || '". Allowed plans are: FREE, PRO, PREMIUM.'
    );
  END IF;

  -- Look up target store
  SELECT id, name, subscription_plan, subscription_status, subscription_expires_at
  INTO v_store_id, v_store_name, v_old_plan, v_old_status, v_old_expires_at
  FROM public.stores
  WHERE id = v_store_id_in OR id = 'store_' || v_store_id_in OR id = REPLACE(v_store_id_in, 'store_', '')
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Store with ID "' || v_store_id_in || '" not found.');
  END IF;

  -- Calculate new expiry timestamp
  IF v_plan_upper = 'FREE' OR v_duration_days <= 0 THEN
    -- Perpetual / Lifetime
    v_new_expires_at := NULL;
    IF v_duration_label = '' THEN
      v_duration_label := CASE WHEN v_plan_upper = 'FREE' THEN 'Standard' ELSE 'Lifetime' END;
    END IF;
  ELSE
    v_new_expires_at := now() + (v_duration_days || ' days')::interval;
    IF v_duration_label = '' THEN
      v_duration_label := v_duration_days || ' Days';
    END IF;
  END IF;

  -- Update store subscription
  UPDATE public.stores
  SET 
    subscription_plan = v_plan_upper,
    subscription_status = 'active',
    subscription_expires_at = v_new_expires_at,
    updated_at = now()
  WHERE id = v_store_id;

  -- Record in SUDO Audit Log
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
    v_store_id,
    'SSM',
    'plan_override',
    v_command,
    COALESCE(v_old_plan, 'FREE') || ' (' || COALESCE(v_old_status, 'active') || ')',
    v_plan_upper || ' (active, ' || v_duration_label || ')',
    COALESCE(NULLIF(v_reason, ''), 'Manual plan override to ' || v_plan_upper || ' (' || v_duration_label || ') via SSA Admin'),
    'SUCCESS',
    jsonb_build_object(
      'operation', 'MANUAL_STORE_PLAN_OVERRIDE',
      'store_id', v_store_id,
      'store_name', v_store_name,
      'plan', v_plan_upper,
      'duration_days', v_duration_days,
      'duration_label', v_duration_label,
      'expires_at', v_new_expires_at,
      'previous_plan', v_old_plan,
      'previous_status', v_old_status,
      'previous_expires_at', v_old_expires_at
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'storeId', v_store_id,
    'storeName', v_store_name,
    'subscriptionPlan', v_plan_upper,
    'subscriptionStatus', 'active',
    'subscriptionExpiresAt', v_new_expires_at,
    'durationLabel', v_duration_label,
    'message', 'Store "' || v_store_name || '" successfully upgraded to ' || v_plan_upper || ' plan (' || v_duration_label || ').'
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_override_store_plan(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_store_plan(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_override_store_plan(JSONB) TO service_role;
