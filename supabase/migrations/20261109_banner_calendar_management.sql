-- ==============================================================================
-- SSA – SSM Advertising Calendar & Date-Specific Slot Management Migration
-- ==============================================================================

-- 1. Date-specific slot controls table
CREATE TABLE IF NOT EXISTS public.banner_daily_slot_controls (
    slot_date DATE PRIMARY KEY,
    total_capacity INT NOT NULL DEFAULT 4,
    booked_slots INT NOT NULL DEFAULT 0 CHECK (booked_slots >= 0 AND booked_slots <= 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT DEFAULT 'SSA Administrator'
);

ALTER TABLE public.banner_daily_slot_controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read banner_daily_slot_controls" ON public.banner_daily_slot_controls;
CREATE POLICY "Allow authenticated read banner_daily_slot_controls"
    ON public.banner_daily_slot_controls FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow service and admin write banner_daily_slot_controls" ON public.banner_daily_slot_controls;
CREATE POLICY "Allow service and admin write banner_daily_slot_controls"
    ON public.banner_daily_slot_controls FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 2. RPC to get monthly slot information & active ads count for calendar view
CREATE OR REPLACE FUNCTION public.get_banner_month_slots(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH calendar_days AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS day_date
    ),
    day_slots AS (
        SELECT 
            cd.day_date,
            COALESCE(bd.total_capacity, 4) AS total_capacity,
            COALESCE(bd.booked_slots, 0) AS booked_slots,
            (COALESCE(bd.total_capacity, 4) - COALESCE(bd.booked_slots, 0)) AS available_slots,
            (
                SELECT COUNT(*)::int
                FROM public.spotlight_campaigns sc
                WHERE sc.payment_status = 'paid'
                  AND sc.status != 'rejected'
                  AND sc.status != 'cancelled'
                  AND sc.start_date::date <= cd.day_date
                  AND sc.end_date::date >= cd.day_date
            ) AS scheduled_apps_count
        FROM calendar_days cd
        LEFT JOIN public.banner_daily_slot_controls bd ON cd.day_date = bd.slot_date
        ORDER BY cd.day_date ASC
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', to_char(day_date, 'YYYY-MM-DD'),
            'totalCapacity', total_capacity,
            'bookedSlots', booked_slots,
            'availableSlots', available_slots,
            'scheduledAppsCount', scheduled_apps_count,
            'isFullyBooked', (booked_slots >= total_capacity),
            'isPartiallyBooked', (booked_slots > 0 AND booked_slots < total_capacity),
            'isFullyAvailable', (booked_slots = 0)
        )
    ) INTO v_result
    FROM day_slots;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 3. RPC to get single date slot details
CREATE OR REPLACE FUNCTION public.get_daily_banner_slot(
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row RECORD;
BEGIN
    SELECT 
        slot_date,
        total_capacity,
        booked_slots,
        (total_capacity - booked_slots) AS available_slots,
        updated_at,
        updated_by
    INTO v_row
    FROM public.banner_daily_slot_controls
    WHERE slot_date = p_date;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'slotDate', to_char(p_date, 'YYYY-MM-DD'),
            'totalCapacity', 4,
            'bookedSlots', 0,
            'availableSlots', 4,
            'updatedAt', now(),
            'updatedBy', 'Default'
        );
    ELSE
        RETURN jsonb_build_object(
            'slotDate', to_char(v_row.slot_date, 'YYYY-MM-DD'),
            'totalCapacity', v_row.total_capacity,
            'bookedSlots', v_row.booked_slots,
            'availableSlots', v_row.available_slots,
            'updatedAt', v_row.updated_at,
            'updatedBy', v_row.updated_by
        );
    END IF;
END;
$$;

-- 4. RPC to safely adjust booked slots for a specific date (+1 / -1) with strict boundary [0, 4]
CREATE OR REPLACE FUNCTION public.update_daily_banner_booked_slots(
    p_date DATE,
    p_delta INT,
    p_admin_id TEXT DEFAULT 'SSA Administrator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_booked INT := 0;
    v_new_booked INT;
    v_total_capacity INT := 4;
    v_result RECORD;
BEGIN
    IF p_delta NOT IN (-1, 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid delta. Must be +1 or -1.');
    END IF;

    -- Upsert with lock
    INSERT INTO public.banner_daily_slot_controls (slot_date, total_capacity, booked_slots, updated_at, updated_by)
    VALUES (p_date, 4, 0, now(), p_admin_id)
    ON CONFLICT (slot_date) DO NOTHING;

    SELECT booked_slots, total_capacity
    INTO v_current_booked, v_total_capacity
    FROM public.banner_daily_slot_controls
    WHERE slot_date = p_date
    FOR UPDATE;

    v_new_booked := v_current_booked + p_delta;

    IF v_new_booked < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Booked slots cannot be less than 0.'
        );
    END IF;

    IF v_new_booked > v_total_capacity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Booked slots cannot exceed total capacity of %s.', v_total_capacity)
        );
    END IF;

    UPDATE public.banner_daily_slot_controls
    SET booked_slots = v_new_booked,
        updated_at = now(),
        updated_by = p_admin_id
    WHERE slot_date = p_date
    RETURNING slot_date, total_capacity, booked_slots, updated_at, updated_by
    INTO v_result;

    RETURN jsonb_build_object(
        'success', true,
        'slotDate', to_char(v_result.slot_date, 'YYYY-MM-DD'),
        'totalCapacity', v_result.total_capacity,
        'bookedSlots', v_result.booked_slots,
        'availableSlots', (v_result.total_capacity - v_result.booked_slots),
        'updatedAt', v_result.updated_at
    );
END;
$$;

-- 5. RPC to fetch applications running on a specific date
CREATE OR REPLACE FUNCTION public.get_admin_banner_applications_by_date(
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_apps JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sc.id,
            'storeId', sc.store_id,
            'storeName', COALESCE(s.name, 'Unknown Store'),
            'ownerName', COALESCE(u.full_name, 'Unknown Owner'),
            'ownerPhone', COALESCE(u.phone, ''),
            'bannerUrl', COALESCE(sc.banner_url, ''),
            'startDate', sc.start_date,
            'endDate', sc.end_date,
            'rawStartDate', sc.start_date,
            'rawEndDate', sc.end_date,
            'durationDays', GREATEST(1, ROUND(EXTRACT(EPOCH FROM (sc.end_date - sc.start_date)) / 86400)),
            'totalAmount', COALESCE(sc.total_amount, 0),
            'currency', COALESCE(sc.currency, 'INR'),
            'status', sc.status,
            'paymentStatus', sc.payment_status,
            'createdAt', sc.created_at
        )
        ORDER BY sc.created_at ASC
    ) INTO v_apps
    FROM public.spotlight_campaigns sc
    LEFT JOIN public.stores s ON sc.store_id = s.id
    LEFT JOIN public.app_users u ON s.owner_id = u.id
    WHERE sc.payment_status = 'paid'
      AND sc.start_date::date <= p_date
      AND sc.end_date::date >= p_date;

    RETURN COALESCE(v_apps, '[]'::jsonb);
END;
$$;

-- 6. RPC to review (Approve / Reject / Under Review) with full date range capacity validation
CREATE OR REPLACE FUNCTION public.ssa_admin_review_ad_application_range(
    p_campaign_id TEXT,
    p_action TEXT,
    p_admin_id TEXT DEFAULT 'SSA Administrator',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign RECORD;
    v_new_status TEXT;
    v_cur_day DATE;
    v_day_booked INT;
    v_day_capacity INT;
BEGIN
    SELECT * INTO v_campaign
    FROM public.spotlight_campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
    END IF;

    IF p_action = 'approve' THEN
        IF v_campaign.status = 'approved' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Application is already approved.');
        END IF;

        -- Validate capacity for EVERY date in the requested advertising range [start_date::date, end_date::date]
        FOR v_cur_day IN 
            SELECT generate_series(v_campaign.start_date::date, v_campaign.end_date::date, '1 day'::interval)::date
        LOOP
            SELECT COALESCE(booked_slots, 0), COALESCE(total_capacity, 4)
            INTO v_day_booked, v_day_capacity
            FROM public.banner_daily_slot_controls
            WHERE slot_date = v_cur_day;

            IF v_day_booked >= v_day_capacity THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Cannot approve: Date %s is fully booked (%s/%s slots).', to_char(v_cur_day, 'YYYY-MM-DD'), v_day_booked, v_day_capacity)
                );
            END IF;
        END LOOP;

        v_new_status := 'approved';

    ELSIF p_action = 'reject' THEN
        IF v_campaign.status = 'rejected' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Application is already rejected.');
        END IF;
        v_new_status := 'rejected';

    ELSIF p_action = 'under_review' THEN
        v_new_status := 'review_started';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Must be approve, reject, or under_review.');
    END IF;

    -- Update application status without altering payment_status
    UPDATE public.spotlight_campaigns
    SET status = v_new_status,
        updated_at = now()
    WHERE id = p_campaign_id;

    -- Log to audit trail
    INSERT INTO public.spotlight_status_history (
        id,
        campaign_id,
        from_status,
        to_status,
        changed_by,
        notes,
        created_at
    ) VALUES (
        'hist_' || lower(SUBSTRING(md5(random()::text) FROM 1 FOR 12)),
        p_campaign_id,
        v_campaign.status,
        v_new_status,
        p_admin_id,
        COALESCE(p_notes, format('Application %s by %s', v_new_status, p_admin_id)),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'campaignId', p_campaign_id,
        'status', v_new_status,
        'message', format('Application successfully %s.', v_new_status)
    );
END;
$$;
