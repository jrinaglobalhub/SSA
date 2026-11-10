-- ============================================================================
-- SMART SHOPPER ADMIN (SSA)
-- Migration: 20261109_banner_ad_management_system.sql
-- Description:
-- 1. Persistent Home Banner Slot Management table (banner_slot_controls)
-- 2. Atomic Slot Increment / Decrement RPC with 0..4 validation
-- 3. Dedicated Admin Ad Applications query RPC with start_date ASC sorting
-- 4. Single & Bulk Ad Application review RPCs
-- ============================================================================

-- 1. CREATE HOME BANNER SLOT CONTROLS TABLE
CREATE TABLE IF NOT EXISTS public.banner_slot_controls (
  id TEXT PRIMARY KEY DEFAULT 'current',
  total_capacity INT NOT NULL DEFAULT 4,
  booked_slots INT NOT NULL DEFAULT 0 CHECK (booked_slots >= 0 AND booked_slots <= 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT DEFAULT 'SSA Administrator'
);

-- Seed row with id 'current'
INSERT INTO public.banner_slot_controls (id, total_capacity, booked_slots, updated_at)
VALUES ('current', 4, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.banner_slot_controls ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for all
DROP POLICY IF EXISTS "p_banner_slot_controls_select" ON public.banner_slot_controls;
CREATE POLICY "p_banner_slot_controls_select" ON public.banner_slot_controls
  FOR SELECT USING (true);

-- Allow UPDATE for authenticated and service_role
DROP POLICY IF EXISTS "p_banner_slot_controls_update" ON public.banner_slot_controls;
CREATE POLICY "p_banner_slot_controls_update" ON public.banner_slot_controls
  FOR UPDATE USING (true) WITH CHECK (booked_slots >= 0 AND booked_slots <= 4);


-- 2. ATOMIC RPC: UPDATE BANNER BOOKED SLOTS (+ / - / direct)
CREATE OR REPLACE FUNCTION public.update_banner_booked_slots(
  p_delta INT,
  p_is_absolute BOOLEAN DEFAULT false,
  p_new_value INT DEFAULT NULL,
  p_updated_by TEXT DEFAULT 'SSA Administrator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current RECORD;
  v_new_booked INT;
BEGIN
  -- Row lock
  SELECT * INTO v_current
  FROM public.banner_slot_controls
  WHERE id = 'current'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.banner_slot_controls (id, total_capacity, booked_slots, updated_at, updated_by)
    VALUES ('current', 4, 0, NOW(), p_updated_by)
    RETURNING * INTO v_current;
  END IF;

  IF p_is_absolute AND p_new_value IS NOT NULL THEN
    v_new_booked := p_new_value;
  ELSE
    v_new_booked := v_current.booked_slots + p_delta;
  END IF;

  IF v_new_booked < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booked slots cannot be less than 0.');
  END IF;

  IF v_new_booked > v_current.total_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booked slots cannot exceed total capacity of ' || v_current.total_capacity || '.');
  END IF;

  UPDATE public.banner_slot_controls
  SET
    booked_slots = v_new_booked,
    updated_at = NOW(),
    updated_by = p_updated_by
  WHERE id = 'current';

  RETURN jsonb_build_object(
    'success', true,
    'total_capacity', v_current.total_capacity,
    'booked_slots', v_new_booked,
    'available_slots', v_current.total_capacity - v_new_booked,
    'updated_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_banner_booked_slots(INT, BOOLEAN, INT, TEXT) TO anon, authenticated, service_role;


-- 3. DEDICATED FETCH RPC: GET BANNER APPLICATIONS WITH JOINED STORE & OWNER METADATA
-- Sorted chronologically by requested From Date (start_date ASC)
CREATE OR REPLACE FUNCTION public.get_admin_banner_applications(
  p_status_filter TEXT DEFAULT 'all',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_total INT;
BEGIN
  -- Total matching count
  SELECT COUNT(*) INTO v_total
  FROM public.spotlight_campaigns c
  JOIN public.stores s ON s.id = c.store_id
  WHERE c.payment_status = 'paid'
    AND c.banner_url IS NOT NULL
    AND c.banner_url <> ''
    AND c.status NOT IN ('draft', 'payment_pending', 'cancelled', 'refund_pending', 'refunded', 'refund_failed')
    AND (
      p_status_filter = 'all'
      OR (p_status_filter = 'pending' AND c.status = 'pending_review')
      OR (p_status_filter = 'under_review' AND c.status = 'review_started')
      OR (p_status_filter = 'approved' AND c.status IN ('approved', 'scheduled', 'active', 'completed'))
      OR (p_status_filter = 'rejected' AND c.status = 'rejected')
    );

  -- Fetch applications with nearest upcoming start_date first
  SELECT jsonb_build_object(
    'total', v_total,
    'applications', COALESCE(jsonb_agg(sub.app), '[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'storeId', c.store_id,
      'storeName', s.name,
      'ownerName', COALESCE(u.full_name, 'Merchant Partner'),
      'phone', COALESCE(s.phone, '—'),
      'state', s.address,
      'title', c.title,
      'description', c.description,
      'bannerUrl', c.banner_url,
      'ctaText', c.cta_text,
      'ctaLink', c.cta_link,
      'startDate', c.start_date,
      'endDate', c.end_date,
      'durationDays', c.duration_days,
      'totalAmount', c.total_amount,
      'currency', c.currency,
      'status', c.status,
      'paymentStatus', c.payment_status,
      'paymentOrderId', c.payment_order_id,
      'paymentReferenceId', c.payment_reference_id,
      'adminNotes', c.admin_notes,
      'rejectionReason', c.rejection_reason,
      'reviewedBy', c.reviewed_by,
      'reviewedAt', c.reviewed_at,
      'createdAt', c.created_at,
      'dimensions', CASE
        WHEN jsonb_array_length(c.additional_images) > 0 THEN c.additional_images->0
        ELSE NULL
      END
    ) AS app
    FROM public.spotlight_campaigns c
    JOIN public.stores s ON s.id = c.store_id
    LEFT JOIN public.app_users u ON (u.id::text = s.owner_id OR u.id::text = c.merchant_id)
    WHERE c.payment_status = 'paid'
      AND c.banner_url IS NOT NULL
      AND c.banner_url <> ''
      AND c.status NOT IN ('draft', 'payment_pending', 'cancelled', 'refund_pending', 'refunded', 'refund_failed')
      AND (
        p_status_filter = 'all'
        OR (p_status_filter = 'pending' AND c.status = 'pending_review')
        OR (p_status_filter = 'under_review' AND c.status = 'review_started')
        OR (p_status_filter = 'approved' AND c.status IN ('approved', 'scheduled', 'active', 'completed'))
        OR (p_status_filter = 'rejected' AND c.status = 'rejected')
      )
    ORDER BY
      CASE
        WHEN c.start_date IS NULL THEN 3
        WHEN c.start_date::date >= CURRENT_DATE THEN 1
        ELSE 2
      END,
      CASE
        WHEN c.start_date::date >= CURRENT_DATE THEN c.start_date
        ELSE NULL
      END ASC,
      CASE
        WHEN c.start_date::date < CURRENT_DATE THEN c.start_date
        ELSE NULL
      END DESC,
      c.created_at ASC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_banner_applications(TEXT, INT, INT) TO anon, authenticated, service_role;


-- 4. INDIVIDUAL APPLICATION REVIEW RPC (APPROVE / REJECT / UNDER_REVIEW)
CREATE OR REPLACE FUNCTION public.ssa_admin_review_ad_application(
  p_campaign_id TEXT,
  p_action TEXT, -- 'approve', 'reject', 'under_review'
  p_admin_id TEXT DEFAULT 'SSA Administrator',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_slot_ctrl RECORD;
  v_new_status TEXT;
  v_avail_slots INT;
BEGIN
  -- Row lock campaign
  SELECT * INTO v_campaign
  FROM public.spotlight_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign record not found.');
  END IF;

  -- ACTION: APPROVE
  IF p_action = 'approve' THEN
    -- Prevent duplicate approval
    IF v_campaign.status IN ('approved', 'scheduled', 'active') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Application is already approved.');
    END IF;

    -- Validate Slot Capacity
    SELECT * INTO v_slot_ctrl FROM public.banner_slot_controls WHERE id = 'current';
    IF FOUND THEN
      v_avail_slots := v_slot_ctrl.total_capacity - v_slot_ctrl.booked_slots;
      IF v_avail_slots <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot approve: All ' || v_slot_ctrl.total_capacity || ' slots are currently booked. Increase capacity before approving.');
      END IF;
    END IF;

    -- Set status to approved or scheduled/active
    IF NOW() >= v_campaign.start_date AND NOW() <= v_campaign.end_date THEN
      v_new_status := 'active';
    ELSE
      v_new_status := 'approved';
    END IF;

    UPDATE public.spotlight_campaigns
    SET
      status = v_new_status,
      reviewed_at = NOW(),
      reviewed_by = p_admin_id,
      admin_notes = COALESCE(p_notes, admin_notes, 'Approved by SSA Administrator'),
      updated_at = NOW()
    WHERE id = p_campaign_id;

    -- Audit history
    INSERT INTO public.spotlight_status_history (
      id, campaign_id, from_status, to_status, changed_by, notes, created_at
    ) VALUES (
      'hist_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12),
      p_campaign_id,
      v_campaign.status,
      v_new_status,
      p_admin_id,
      COALESCE(p_notes, 'Approved by SSA Administrator'),
      NOW()
    );

    RETURN jsonb_build_object('success', true, 'status', v_new_status, 'message', 'Application approved successfully.');

  -- ACTION: REJECT
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';

    UPDATE public.spotlight_campaigns
    SET
      status = 'rejected',
      rejection_reason = COALESCE(p_notes, rejection_reason, 'Declined by SSA Administrator'),
      admin_notes = COALESCE(p_notes, admin_notes, 'Declined by SSA Administrator'),
      reviewed_at = NOW(),
      reviewed_by = p_admin_id,
      updated_at = NOW()
    WHERE id = p_campaign_id;

    -- Audit history
    INSERT INTO public.spotlight_status_history (
      id, campaign_id, from_status, to_status, changed_by, notes, created_at
    ) VALUES (
      'hist_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12),
      p_campaign_id,
      v_campaign.status,
      'rejected',
      p_admin_id,
      COALESCE(p_notes, 'Declined by SSA Administrator'),
      NOW()
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'message', 'Application rejected.');

  -- ACTION: UNDER REVIEW
  ELSIF p_action = 'under_review' THEN
    IF v_campaign.status NOT IN ('pending_review', 'payment_completed') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only Pending applications can be moved to Under Review.');
    END IF;

    UPDATE public.spotlight_campaigns
    SET
      status = 'review_started',
      review_started_at = COALESCE(review_started_at, NOW()),
      reviewed_by = p_admin_id,
      admin_notes = COALESCE(p_notes, admin_notes, 'Application moved to Under Review'),
      updated_at = NOW()
    WHERE id = p_campaign_id;

    -- Audit history
    INSERT INTO public.spotlight_status_history (
      id, campaign_id, from_status, to_status, changed_by, notes, created_at
    ) VALUES (
      'hist_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12),
      p_campaign_id,
      v_campaign.status,
      'review_started',
      p_admin_id,
      'Application moved to Under Review',
      NOW()
    );

    RETURN jsonb_build_object('success', true, 'status', 'review_started', 'message', 'Application moved to Under Review.');

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || p_action);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ssa_admin_review_ad_application(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;


-- 5. BULK REVIEW RPC: MOVE PENDING APPLICATIONS TO UNDER REVIEW
CREATE OR REPLACE FUNCTION public.ssa_admin_bulk_review_under_review(
  p_campaign_ids TEXT[],
  p_admin_id TEXT DEFAULT 'SSA Administrator',
  p_select_all_pending BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  IF p_select_all_pending THEN
    -- Update all eligible Pending applications across all pages
    WITH updated AS (
      UPDATE public.spotlight_campaigns
      SET
        status = 'review_started',
        review_started_at = COALESCE(review_started_at, NOW()),
        reviewed_by = p_admin_id,
        admin_notes = 'Moved to Under Review via Bulk Action',
        updated_at = NOW()
      WHERE status IN ('pending_review', 'payment_completed')
        AND payment_status = 'paid'
      RETURNING id, status
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;

  ELSE
    -- Update only explicitly selected IDs that are strictly in Pending status
    IF p_campaign_ids IS NULL OR array_length(p_campaign_ids, 1) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'No applications selected for bulk review.');
    END IF;

    WITH updated AS (
      UPDATE public.spotlight_campaigns
      SET
        status = 'review_started',
        review_started_at = COALESCE(review_started_at, NOW()),
        reviewed_by = p_admin_id,
        admin_notes = 'Moved to Under Review via Bulk Action',
        updated_at = NOW()
      WHERE id = ANY(p_campaign_ids)
        AND status IN ('pending_review', 'payment_completed')
        AND payment_status = 'paid'
      RETURNING id, status
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;

  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', v_updated_count || ' applications moved to Under Review successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ssa_admin_bulk_review_under_review(TEXT[], TEXT, BOOLEAN) TO anon, authenticated, service_role;
