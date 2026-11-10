-- ==============================================================================
-- SSM & SSA: Referral Code Validation, Attribution & Isolation Migration
-- Migration: 20261109_ssm_referral_validation_and_attribution.sql
-- ==============================================================================

-- 1. ADD REFERRAL OWNER & CAMPAIGN COLUMNS TO stores TABLE
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS referred_by_volunteer_id TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_campaign_id TEXT;

-- Index for fast campaign / volunteer referral attribution lookups
CREATE INDEX IF NOT EXISTS idx_stores_referred_by_code 
  ON public.stores (UPPER(TRIM(referred_by_code))) 
  WHERE referred_by_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_referred_by_volunteer_id 
  ON public.stores (referred_by_volunteer_id) 
  WHERE referred_by_volunteer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_referred_by_campaign_id 
  ON public.stores (referred_by_campaign_id) 
  WHERE referred_by_campaign_id IS NOT NULL;

-- 2. UPDATE TRIGGER FUNCTION TO ENFORCE IMMUTABLE REFERRAL ATTRIBUTION ON stores
CREATE OR REPLACE FUNCTION public.trg_stores_enforce_referral_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Generate unique merchant referral_code if missing
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
      NEW.referral_code := public.generate_merchant_referral_code();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Merchant Referral Code is permanent and immutable
    IF OLD.referral_code IS NOT NULL AND NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      RAISE EXCEPTION 'Merchant referral code is permanent and immutable.';
    END IF;
    -- Merchant referral attribution is permanent and immutable
    IF OLD.referred_by_store_id IS NOT NULL AND NEW.referred_by_store_id IS DISTINCT FROM OLD.referred_by_store_id THEN
      RAISE EXCEPTION 'Merchant referral attribution is permanent and immutable.';
    END IF;
    IF OLD.referred_by_code IS NOT NULL AND NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code THEN
      RAISE EXCEPTION 'Merchant referral attribution is permanent and immutable.';
    END IF;
    IF OLD.referred_by_volunteer_id IS NOT NULL AND NEW.referred_by_volunteer_id IS DISTINCT FROM OLD.referred_by_volunteer_id THEN
      RAISE EXCEPTION 'Merchant referral volunteer attribution is permanent and immutable.';
    END IF;
    IF OLD.referred_by_campaign_id IS NOT NULL AND NEW.referred_by_campaign_id IS DISTINCT FROM OLD.referred_by_campaign_id THEN
      RAISE EXCEPTION 'Merchant referral campaign attribution is permanent and immutable.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stores_referral_integrity ON public.stores;
CREATE TRIGGER trg_stores_referral_integrity
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_stores_enforce_referral_integrity();

-- 3. DROP OLD FUNCTION SIGNATURE IF NEEDED AND RECREATE validate_referral_code
DROP FUNCTION IF EXISTS public.validate_referral_code(text, text);

CREATE OR REPLACE FUNCTION public.validate_referral_code(
  p_code TEXT,
  p_role TEXT DEFAULT 'consumer'
)
RETURNS TABLE (
  is_valid BOOLEAN,
  referrer_id TEXT,
  referrer_name TEXT,
  normalized_code TEXT,
  message TEXT,
  referrer_type TEXT,
  campaign_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean TEXT;
  v_id TEXT;
  v_name TEXT;
  v_norm TEXT;
  v_camp_id TEXT;
  v_camp_name TEXT;
  v_camp_status TEXT;
  v_camp_start TIMESTAMPTZ;
  v_camp_end TIMESTAMPTZ;
  v_is_archived BOOLEAN := false;
BEGIN
  v_clean := UPPER(TRIM(COALESCE(p_code, '')));

  IF v_clean = '' THEN
    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::text, 
      NULL::text, 
      'Referral code cannot be empty.'::text,
      NULL::text,
      NULL::text;
    RETURN;
  END IF;

  IF p_role = 'merchant_partner' THEN
    -- 1. Check referral_campaign_volunteers (Campaign / Volunteer codes created in SSA)
    SELECT 
      rcv.id, 
      rcv.volunteer_name, 
      rcv.referral_code, 
      rc.id, 
      rc.name, 
      rc.status, 
      rc.start_timestamp, 
      rc.end_timestamp
    INTO 
      v_id, 
      v_name, 
      v_norm, 
      v_camp_id, 
      v_camp_name, 
      v_camp_status, 
      v_camp_start, 
      v_camp_end
    FROM public.referral_campaign_volunteers rcv
    JOIN public.referral_campaigns rc ON rc.id = rcv.campaign_id
    WHERE UPPER(TRIM(rcv.referral_code)) = v_clean
    LIMIT 1;

    -- If not found in active campaigns, check archives to provide informative message
    IF v_id IS NULL THEN
      SELECT EXISTS (
        SELECT 1 
        FROM public.referral_campaign_archives rca,
        jsonb_array_elements(rca.volunteer_data) AS vol
        WHERE UPPER(TRIM(COALESCE(vol->>'referralCode', vol->>'referral_code', ''))) = v_clean
      ) INTO v_is_archived;

      IF v_is_archived THEN
        RETURN QUERY SELECT 
          false, 
          NULL::text, 
          NULL::text, 
          v_clean, 
          'This referral campaign has been archived and is no longer active.'::text,
          'campaign_volunteer'::text,
          NULL::text;
        RETURN;
      END IF;
    END IF;

    IF v_id IS NOT NULL THEN
      -- Validate campaign status & time window
      IF v_camp_status = 'archived' THEN
        RETURN QUERY SELECT 
          false, 
          NULL::text, 
          NULL::text, 
          v_norm, 
          'This referral campaign has been archived and is no longer active.'::text,
          'campaign_volunteer'::text,
          v_camp_id;
        RETURN;
      ELSIF v_camp_status <> 'active' THEN
        RETURN QUERY SELECT 
          false, 
          NULL::text, 
          NULL::text, 
          v_norm, 
          'This referral campaign is inactive or has closed.'::text,
          'campaign_volunteer'::text,
          v_camp_id;
        RETURN;
      ELSIF NOW() > v_camp_end THEN
        RETURN QUERY SELECT 
          false, 
          NULL::text, 
          NULL::text, 
          v_norm, 
          'This referral campaign code has expired.'::text,
          'campaign_volunteer'::text,
          v_camp_id;
        RETURN;
      ELSIF NOW() < v_camp_start THEN
        RETURN QUERY SELECT 
          false, 
          NULL::text, 
          NULL::text, 
          v_norm, 
          'This referral campaign has not started yet.'::text,
          'campaign_volunteer'::text,
          v_camp_id;
        RETURN;
      ELSE
        RETURN QUERY SELECT 
          true, 
          v_id, 
          COALESCE(v_name, 'Campaign Volunteer')::text, 
          v_norm, 
          ('Valid campaign referral code from ' || COALESCE(v_name, 'Campaign Volunteer'))::text,
          'campaign_volunteer'::text,
          v_camp_id;
        RETURN;
      END IF;
    END IF;

    -- 2. Check partner store referral codes in public.stores
    SELECT s.id, s.name, s.referral_code
    INTO v_id, v_name, v_norm
    FROM public.stores s
    WHERE (
      UPPER(TRIM(s.referral_code)) = v_clean
      OR UPPER(TRIM(s.referral_code)) = UPPER('SSM-' || v_clean)
      OR (v_clean ILIKE 'SSM-%' AND UPPER(TRIM(s.referral_code)) = UPPER(SUBSTRING(v_clean FROM 5)))
    )
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT 
        true, 
        v_id, 
        COALESCE(v_name, 'Partner Store')::text, 
        v_norm, 
        ('Valid partner store code from ' || COALESCE(v_name, 'Partner Store'))::text,
        'store_partner'::text,
        NULL::text;
      RETURN;
    END IF;

    -- 3. Check if user attempted to use an SSC Consumer code
    IF v_clean ILIKE 'SSC-%' OR EXISTS (
      SELECT 1 FROM public.app_users u 
      WHERE (
        UPPER(TRIM(u.referral_code)) = v_clean 
        OR UPPER(TRIM(u.referral_code)) = UPPER('SSC-' || v_clean)
        OR (v_clean ILIKE 'SSC-%' AND UPPER(TRIM(u.referral_code)) = UPPER(SUBSTRING(v_clean FROM 5)))
      )
      AND (u.role IN ('consumer', 'shopper', 'user') OR u.role IS NULL)
    ) THEN
      RETURN QUERY SELECT 
        false, 
        NULL::text, 
        NULL::text, 
        v_clean, 
        'This is a consumer shopper code and cannot be used for merchant partner registration.'::text,
        'consumer'::text,
        NULL::text;
      RETURN;
    END IF;

    -- 4. Not recognized
    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::text, 
      v_clean, 
      'Invalid referral code. Please check and try again.'::text,
      NULL::text,
      NULL::text;
    RETURN;

  ELSE
    -- Consumer validation
    -- Check campaign volunteers first
    SELECT 
      rcv.id, 
      rcv.volunteer_name, 
      rcv.referral_code, 
      rc.id, 
      rc.name, 
      rc.status, 
      rc.start_timestamp, 
      rc.end_timestamp
    INTO 
      v_id, 
      v_name, 
      v_norm, 
      v_camp_id, 
      v_camp_name, 
      v_camp_status, 
      v_camp_start, 
      v_camp_end
    FROM public.referral_campaign_volunteers rcv
    JOIN public.referral_campaigns rc ON rc.id = rcv.campaign_id
    WHERE UPPER(TRIM(rcv.referral_code)) = v_clean
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      IF v_camp_status = 'archived' THEN
        RETURN QUERY SELECT false, NULL::text, NULL::text, v_norm, 'This referral campaign has been archived.'::text, 'campaign_volunteer'::text, v_camp_id;
        RETURN;
      ELSIF v_camp_status <> 'active' THEN
        RETURN QUERY SELECT false, NULL::text, NULL::text, v_norm, 'This referral campaign is inactive or has closed.'::text, 'campaign_volunteer'::text, v_camp_id;
        RETURN;
      ELSIF NOW() > v_camp_end THEN
        RETURN QUERY SELECT false, NULL::text, NULL::text, v_norm, 'This referral campaign code has expired.'::text, 'campaign_volunteer'::text, v_camp_id;
        RETURN;
      ELSIF NOW() < v_camp_start THEN
        RETURN QUERY SELECT false, NULL::text, NULL::text, v_norm, 'This referral campaign has not started yet.'::text, 'campaign_volunteer'::text, v_camp_id;
        RETURN;
      ELSE
        RETURN QUERY SELECT true, v_id, COALESCE(v_name, 'Campaign Volunteer')::text, v_norm, ('Valid campaign referral code from ' || COALESCE(v_name, 'Campaign Volunteer'))::text, 'campaign_volunteer'::text, v_camp_id;
        RETURN;
      END IF;
    END IF;

    -- Consumer validation: Look up in public.app_users
    SELECT u.id, COALESCE(u.full_name, u.display_username, u.username, 'SmartShopper User'), u.referral_code
    INTO v_id, v_name, v_norm
    FROM public.app_users u
    WHERE (
      UPPER(TRIM(u.referral_code)) = v_clean
      OR UPPER(TRIM(u.referral_code)) = UPPER('SSC-' || v_clean)
      OR (v_clean ILIKE 'SSC-%' AND UPPER(TRIM(u.referral_code)) = UPPER(SUBSTRING(v_clean FROM 5)))
    )
    AND (u.role IN ('consumer', 'shopper', 'user') OR u.role IS NULL)
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT 
        true, 
        v_id, 
        v_name, 
        v_norm, 
        ('Valid referral code from ' || v_name)::text,
        'consumer'::text,
        NULL::text;
      RETURN;
    END IF;

    -- Check if user entered an SSM partner code
    IF v_clean ILIKE 'SSM-%' OR EXISTS (SELECT 1 FROM public.stores s WHERE UPPER(TRIM(s.referral_code)) = v_clean) THEN
      RETURN QUERY SELECT 
        false, 
        NULL::text, 
        NULL::text, 
        v_clean, 
        'This is a merchant partner code and cannot be used for consumer shopper registration.'::text,
        'store_partner'::text,
        NULL::text;
      RETURN;
    END IF;

    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::text, 
      v_clean, 
      'Invalid referral code. Please check and try again.'::text,
      NULL::text,
      NULL::text;
  END IF;
END;
$$;

-- 4. UPDATE rpc_register_app_account TO HANDLE REFERRAL ATTRIBUTION SAFELY
CREATE OR REPLACE FUNCTION public.rpc_register_app_account(p_app_code text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_norm_app TEXT := UPPER(TRIM(p_app_code));
  v_account_type TEXT;
  v_auth_user RECORD;
  v_existing RECORD;
  v_email TEXT;
  v_mobile TEXT;
  v_full_name TEXT;
  v_username TEXT;
  v_store_id TEXT;
  v_store_name TEXT;
  v_store_cat TEXT;
  v_cust_id TEXT;
  v_referral_code TEXT;
  v_app_ref TEXT;
  v_metadata JSONB := '{}'::jsonb;
  v_referred_code TEXT;
  v_ref_store_id TEXT;
  v_ref_vol_id TEXT;
  v_ref_camp_id TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'UNAUTHENTICATED',
      'message', 'Valid user session required.'
    );
  END IF;

  IF v_norm_app NOT IN ('SSC', 'SSM', 'SSD') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_APP_CODE',
      'message', 'Invalid application code. Must be SSC, SSM, or SSD.'
    );
  END IF;

  SELECT * INTO v_auth_user FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'AUTH_USER_NOT_FOUND',
      'message', 'Authenticated user identity not found.'
    );
  END IF;

  v_email := COALESCE(NULLIF(p_payload->>'email', ''), v_auth_user.email);
  v_mobile := COALESCE(NULLIF(p_payload->>'phone', ''), NULLIF(p_payload->>'mobile', ''), v_auth_user.phone, v_auth_user.raw_user_meta_data->>'phone');
  v_full_name := COALESCE(NULLIF(p_payload->>'fullName', ''), NULLIF(p_payload->>'full_name', ''), v_auth_user.raw_user_meta_data->>'full_name', split_part(COALESCE(v_email, ''), '@', 1));

  IF v_norm_app = 'SSC' THEN
    v_account_type := 'CONSUMER';
  ELSIF v_norm_app = 'SSM' THEN
    v_account_type := 'MERCHANT';
  ELSIF v_norm_app = 'SSD' THEN
    v_account_type := 'DELIVERY_PARTNER';
  END IF;

  -- Check if already registered in this app
  SELECT * INTO v_existing
  FROM public.app_user_accounts
  WHERE auth_user_id = v_uid AND app_code = v_norm_app;

  IF FOUND THEN
    IF v_existing.status = 'ACTIVE' THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Account already active for ' || v_norm_app,
        'app_code', v_norm_app,
        'account_type', v_existing.account_type,
        'account_id', v_existing.id
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ACCOUNT_' || v_existing.status,
        'message', 'Your ' || v_norm_app || ' account is currently ' || LOWER(v_existing.status) || '.'
      );
    END IF;
  END IF;

  -- App-specific record provisioning
  IF v_norm_app = 'SSC' THEN
    v_username := COALESCE(NULLIF(p_payload->>'username', ''), split_part(COALESCE(v_email, ''), '@', 1));
    v_cust_id := public.generate_customer_id();
    v_referral_code := public.generate_consumer_referral_code();
    v_referred_code := NULLIF(UPPER(TRIM(COALESCE(p_payload->>'referred_by_code', p_payload->>'referralCode', ''))), '');
    v_metadata := jsonb_build_object(
      'customer_id', v_cust_id,
      'full_name', v_full_name,
      'username', v_username,
      'referral_code', v_referral_code
    );

    -- Also link into app_users table with consumer role
    INSERT INTO public.app_users (
      id,
      username,
      display_username,
      full_name,
      phone,
      role,
      customer_id,
      referral_code,
      referred_by_code,
      referred_at,
      created_at
    ) VALUES (
      v_uid::text,
      LOWER(v_username),
      v_username,
      v_full_name,
      v_mobile,
      'consumer',
      v_cust_id,
      v_referral_code,
      v_referred_code,
      CASE WHEN v_referred_code IS NOT NULL THEN NOW() ELSE NULL END,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      customer_id = COALESCE(public.app_users.customer_id, EXCLUDED.customer_id),
      referral_code = COALESCE(public.app_users.referral_code, EXCLUDED.referral_code),
      full_name = COALESCE(public.app_users.full_name, EXCLUDED.full_name);

  ELSIF v_norm_app = 'SSM' THEN
    v_store_name := COALESCE(NULLIF(p_payload->>'storeName', ''), NULLIF(p_payload->>'store_name', ''), v_full_name || '''s Store');
    v_store_cat := COALESCE(NULLIF(p_payload->>'category', ''), NULLIF(p_payload->>'store_category', ''), 'General Retail');
    v_store_id := 'store_' || SUBSTRING(REPLACE(v_uid::text, '-', '') FROM 1 FOR 12);
    v_referred_code := NULLIF(UPPER(TRIM(COALESCE(p_payload->>'referred_by_code', p_payload->>'referralCode', ''))), '');
    v_ref_store_id := NULLIF(p_payload->>'referred_by_store_id', '');
    v_ref_vol_id := NULLIF(p_payload->>'referred_by_volunteer_id', '');
    v_ref_camp_id := NULLIF(p_payload->>'referred_by_campaign_id', '');

    -- Create store in stores table if not already existing
    INSERT INTO public.stores (
      id,
      owner_id,
      name,
      category,
      phone,
      address,
      operating_hours,
      radar_radius_meters,
      price_fairness_score,
      verified_bills_count,
      subscription_plan,
      subscription_status,
      verification_status,
      referred_by_code,
      referred_by_store_id,
      referred_by_volunteer_id,
      referred_by_campaign_id,
      referred_at,
      created_at,
      updated_at
    ) VALUES (
      v_store_id,
      v_uid::text,
      v_store_name,
      v_store_cat,
      v_mobile,
      'Kochi, Kerala',
      '09:00 AM - 09:00 PM',
      2000,
      5.0,
      0,
      'FREE',
      'active',
      'PENDING',
      v_referred_code,
      v_ref_store_id,
      v_ref_vol_id,
      v_ref_camp_id,
      CASE WHEN v_referred_code IS NOT NULL THEN NOW() ELSE NULL END,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    v_metadata := jsonb_build_object(
      'store_id', v_store_id,
      'store_name', v_store_name,
      'full_name', v_full_name,
      'verification_status', 'PENDING'
    );

  ELSIF v_norm_app = 'SSD' THEN
    v_app_ref := COALESCE(NULLIF(p_payload->>'applicationRef', ''), 'SSD-APP-' || (100000 + FLOOR(RANDOM() * 900000))::text);
    v_metadata := jsonb_build_object(
      'application_ref', v_app_ref,
      'full_name', v_full_name,
      'vehicle_type', COALESCE(p_payload->>'vehicleType', 'BIKE'),
      'vehicle_reg_number', COALESCE(p_payload->>'vehicleRegNumber', ''),
      'approval_status', 'PENDING'
    );
  END IF;

  -- Insert into app_user_accounts (Strict Application Account Boundary)
  INSERT INTO public.app_user_accounts (
    auth_user_id,
    app_code,
    account_type,
    email,
    mobile,
    status,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_uid,
    v_norm_app,
    v_account_type,
    v_email,
    v_mobile,
    CASE WHEN v_norm_app = 'SSD' THEN 'PENDING' ELSE 'ACTIVE' END,
    v_metadata,
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully registered for ' || v_norm_app,
    'app_code', v_norm_app,
    'account_type', v_account_type,
    'metadata', v_metadata
  );
END;
$function$;
