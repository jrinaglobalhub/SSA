-- ==============================================================================
-- SSA – Referral Campaign Management System Migration
-- ==============================================================================

-- 1. Create referral_campaigns table
CREATE TABLE IF NOT EXISTS public.referral_campaigns (
    id TEXT PRIMARY KEY DEFAULT ('camp_' || lower(SUBSTRING(md5(random()::text) FROM 1 FOR 12))),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    start_time TEXT NOT NULL DEFAULT '09:00',
    end_date DATE NOT NULL,
    end_time TEXT NOT NULL DEFAULT '18:00',
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ NOT NULL,
    volunteer_count INT NOT NULL DEFAULT 0 CHECK (volunteer_count >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_by TEXT DEFAULT 'SSA Administrator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create referral_campaign_volunteers table
CREATE TABLE IF NOT EXISTS public.referral_campaign_volunteers (
    id TEXT PRIMARY KEY DEFAULT ('vol_' || lower(SUBSTRING(md5(random()::text) FROM 1 FOR 12))),
    campaign_id TEXT NOT NULL REFERENCES public.referral_campaigns(id) ON DELETE CASCADE,
    serial_number INT NOT NULL,
    volunteer_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    referral_code TEXT NOT NULL UNIQUE,
    assigned_date DATE,
    assigned_start_time TEXT,
    assigned_end_time TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for speedy code lookups
CREATE INDEX IF NOT EXISTS idx_volunteers_campaign_id ON public.referral_campaign_volunteers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_referral_code ON public.referral_campaign_volunteers(referral_code);

-- 3. Create referral_campaign_archives table (for deleted campaigns)
CREATE TABLE IF NOT EXISTS public.referral_campaign_archives (
    id TEXT PRIMARY KEY DEFAULT ('arch_' || lower(SUBSTRING(md5(random()::text) FROM 1 FOR 12))),
    original_campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    campaign_description TEXT,
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ NOT NULL,
    volunteer_count INT NOT NULL,
    volunteer_data JSONB NOT NULL,
    original_created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_by TEXT DEFAULT 'SSA Administrator'
);

-- Enable RLS
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_campaign_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_campaign_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for referral_campaigns" ON public.referral_campaigns;
CREATE POLICY "Allow all for referral_campaigns" ON public.referral_campaigns FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for referral_campaign_volunteers" ON public.referral_campaign_volunteers;
CREATE POLICY "Allow all for referral_campaign_volunteers" ON public.referral_campaign_volunteers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for referral_campaign_archives" ON public.referral_campaign_archives;
CREATE POLICY "Allow all for referral_campaign_archives" ON public.referral_campaign_archives FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 4. RPC: Generate Random Referral Codes with Guaranteed Global Uniqueness
CREATE OR REPLACE FUNCTION public.generate_unique_campaign_referral_codes(
    p_count INT,
    p_prefix TEXT DEFAULT 'CMP'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_codes TEXT[] := ARRAY[]::TEXT[];
    v_cand TEXT;
    v_chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- Exclude ambiguous chars 0, 1, I, O
    v_rand_part TEXT;
    v_i INT;
    v_exists BOOLEAN;
    v_attempts INT;
BEGIN
    IF p_count <= 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    WHILE array_length(v_codes, 1) IS NULL OR array_length(v_codes, 1) < p_count LOOP
        v_attempts := 0;
        LOOP
            v_attempts := v_attempts + 1;
            IF v_attempts > 200 THEN
                RAISE EXCEPTION 'Failed to generate unique referral code after 200 attempts.';
            END IF;

            -- Generate 6 random alphanumeric characters
            v_rand_part := '';
            FOR v_i IN 1..6 LOOP
                v_rand_part := v_rand_part || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
            END LOOP;

            v_cand := UPPER(p_prefix) || '-' || v_rand_part;

            -- Check if already in current batch
            IF v_cand = ANY(v_codes) THEN
                CONTINUE;
            END IF;

            -- Check against stores, app_users and existing volunteers
            SELECT EXISTS (
                SELECT 1 FROM public.stores WHERE referral_code = v_cand
                UNION ALL
                SELECT 1 FROM public.app_users WHERE referral_code = v_cand
                UNION ALL
                SELECT 1 FROM public.referral_campaign_volunteers WHERE referral_code = v_cand
            ) INTO v_exists;

            IF NOT v_exists THEN
                v_codes := array_append(v_codes, v_cand);
                EXIT;
            END IF;
        END LOOP;
    END LOOP;

    RETURN to_jsonb(v_codes);
END;
$$;

-- 5. RPC: Transactional Save Campaign and Volunteers
CREATE OR REPLACE FUNCTION public.save_referral_campaign(
    p_campaign JSONB,
    p_volunteers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id TEXT;
    v_vol JSONB;
    v_idx INT := 1;
    v_start_ts TIMESTAMPTZ;
    v_end_ts TIMESTAMPTZ;
    v_vol_count INT;
BEGIN
    -- Parse and validate timestamps
    v_start_ts := COALESCE(
        NULLIF(p_campaign->>'start_timestamp', '')::timestamptz,
        ((p_campaign->>'start_date') || ' ' || COALESCE(NULLIF(p_campaign->>'start_time', ''), '00:00:00') || '+05:30')::timestamptz
    );
    v_end_ts := COALESCE(
        NULLIF(p_campaign->>'end_timestamp', '')::timestamptz,
        ((p_campaign->>'end_date') || ' ' || COALESCE(NULLIF(p_campaign->>'end_time', ''), '23:59:59') || '+05:30')::timestamptz
    );
    v_vol_count := (p_campaign->>'volunteer_count')::int;

    IF v_end_ts <= v_start_ts THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign end date & time must be later than start date & time.');
    END IF;

    IF v_vol_count <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Number of volunteers must be a positive integer.');
    END IF;

    v_campaign_id := p_campaign->>'id';

    IF v_campaign_id IS NULL OR v_campaign_id = '' THEN
        v_campaign_id := 'camp_' || lower(SUBSTRING(md5(random()::text) FROM 1 FOR 12));
        
        INSERT INTO public.referral_campaigns (
            id, name, description, start_date, start_time, end_date, end_time,
            start_timestamp, end_timestamp, volunteer_count, status, created_by
        ) VALUES (
            v_campaign_id,
            p_campaign->>'name',
            p_campaign->>'description',
            (p_campaign->>'start_date')::date,
            COALESCE(p_campaign->>'start_time', '09:00'),
            (p_campaign->>'end_date')::date,
            COALESCE(p_campaign->>'end_time', '18:00'),
            v_start_ts,
            v_end_ts,
            v_vol_count,
            COALESCE(p_campaign->>'status', 'active'),
            COALESCE(p_campaign->>'created_by', 'SSA Administrator')
        );
    ELSE
        UPDATE public.referral_campaigns
        SET name = p_campaign->>'name',
            description = p_campaign->>'description',
            start_date = (p_campaign->>'start_date')::date,
            start_time = COALESCE(p_campaign->>'start_time', '09:00'),
            end_date = (p_campaign->>'end_date')::date,
            end_time = COALESCE(p_campaign->>'end_time', '18:00'),
            start_timestamp = v_start_ts,
            end_timestamp = v_end_ts,
            volunteer_count = v_vol_count,
            status = COALESCE(p_campaign->>'status', 'active'),
            updated_at = now()
        WHERE id = v_campaign_id;

        -- Remove existing volunteers to replace atomically
        DELETE FROM public.referral_campaign_volunteers WHERE campaign_id = v_campaign_id;
    END IF;

    -- Insert volunteer detail rows
    FOR v_vol IN SELECT * FROM jsonb_array_elements(p_volunteers) LOOP
        INSERT INTO public.referral_campaign_volunteers (
            id, campaign_id, serial_number, volunteer_name, mobile_number, referral_code,
            assigned_date, assigned_start_time, assigned_end_time
        ) VALUES (
            COALESCE(v_vol->>'id', 'vol_' || lower(SUBSTRING(md5(random()::text) FROM 1 FOR 12))),
            v_campaign_id,
            COALESCE((v_vol->>'serial_number')::int, v_idx),
            TRIM(v_vol->>'volunteer_name'),
            TRIM(v_vol->>'mobile_number'),
            UPPER(TRIM(v_vol->>'referral_code')),
            CASE WHEN (v_vol->>'assigned_date') IS NOT NULL AND (v_vol->>'assigned_date') != '' THEN (v_vol->>'assigned_date')::date ELSE NULL END,
            NULLIF(TRIM(v_vol->>'assigned_start_time'), ''),
            NULLIF(TRIM(v_vol->>'assigned_end_time'), '')
        );
        v_idx := v_idx + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'campaignId', v_campaign_id,
        'message', 'Campaign and volunteer details successfully saved.'
    );
END;
$$;

-- 6. RPC: Get All Campaigns with Volunteers Summary
CREATE OR REPLACE FUNCTION public.get_all_referral_campaigns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', rc.id,
            'name', rc.name,
            'description', COALESCE(rc.description, ''),
            'startDate', rc.start_date,
            'startTime', rc.start_time,
            'endDate', rc.end_date,
            'endTime', rc.end_time,
            'startTimestamp', rc.start_timestamp,
            'endTimestamp', rc.end_timestamp,
            'volunteerCount', rc.volunteer_count,
            'generatedCodesCount', (
                SELECT COUNT(*)::int
                FROM public.referral_campaign_volunteers rcv
                WHERE rcv.campaign_id = rc.id
            ),
            'status', rc.status,
            'createdAt', rc.created_at,
            'updatedAt', rc.updated_at
        )
        ORDER BY rc.created_at DESC
    ) INTO v_result
    FROM public.referral_campaigns rc;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 7. RPC: Get Single Campaign Details with All Volunteers
CREATE OR REPLACE FUNCTION public.get_referral_campaign_details(
    p_campaign_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_camp RECORD;
    v_vols JSONB;
BEGIN
    SELECT * INTO v_camp
    FROM public.referral_campaigns
    WHERE id = p_campaign_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign not found.');
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', rcv.id,
            'campaignId', rcv.campaign_id,
            'serialNumber', rcv.serial_number,
            'volunteerName', rcv.volunteer_name,
            'mobileNumber', rcv.mobile_number,
            'referralCode', rcv.referral_code,
            'assignedDate', rcv.assigned_date,
            'assignedStartTime', rcv.assigned_start_time,
            'assignedEndTime', rcv.assigned_end_time,
            'createdAt', rcv.created_at
        )
        ORDER BY rcv.serial_number ASC
    ) INTO v_vols
    FROM public.referral_campaign_volunteers rcv
    WHERE rcv.campaign_id = p_campaign_id;

    RETURN jsonb_build_object(
        'success', true,
        'campaign', jsonb_build_object(
            'id', v_camp.id,
            'name', v_camp.name,
            'description', COALESCE(v_camp.description, ''),
            'startDate', v_camp.start_date,
            'startTime', v_camp.start_time,
            'endDate', v_camp.end_date,
            'endTime', v_camp.end_time,
            'startTimestamp', v_camp.start_timestamp,
            'endTimestamp', v_camp.end_timestamp,
            'volunteerCount', v_camp.volunteer_count,
            'status', v_camp.status,
            'createdAt', v_camp.created_at
        ),
        'volunteers', COALESCE(v_vols, '[]'::jsonb)
    );
END;
$$;

-- 8. RPC: Archive and Permanently Delete Campaign
CREATE OR REPLACE FUNCTION public.archive_and_delete_referral_campaign(
    p_campaign_id TEXT,
    p_admin_id TEXT DEFAULT 'SSA Administrator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_camp RECORD;
    v_vols JSONB;
    v_archive_id TEXT;
BEGIN
    SELECT * INTO v_camp
    FROM public.referral_campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign not found.');
    END IF;

    -- Collect all volunteer records for persistent archival
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', rcv.id,
            'serialNumber', rcv.serial_number,
            'volunteerName', rcv.volunteer_name,
            'mobileNumber', rcv.mobile_number,
            'referralCode', rcv.referral_code,
            'assignedDate', rcv.assigned_date,
            'assignedStartTime', rcv.assigned_start_time,
            'assignedEndTime', rcv.assigned_end_time
        )
        ORDER BY rcv.serial_number ASC
    ) INTO v_vols
    FROM public.referral_campaign_volunteers rcv
    WHERE rcv.campaign_id = p_campaign_id;

    v_archive_id := 'arch_' || lower(SUBSTRING(md5(random()::text) FROM 1 FOR 12));

    -- Insert snapshot into archive table
    INSERT INTO public.referral_campaign_archives (
        id, original_campaign_id, campaign_name, campaign_description,
        start_timestamp, end_timestamp, volunteer_count, volunteer_data,
        original_created_at, archived_at, archived_by
    ) VALUES (
        v_archive_id,
        v_camp.id,
        v_camp.name,
        v_camp.description,
        v_camp.start_timestamp,
        v_camp.end_timestamp,
        v_camp.volunteer_count,
        COALESCE(v_vols, '[]'::jsonb),
        v_camp.created_at,
        now(),
        p_admin_id
    );

    -- Permanently delete from active tables
    DELETE FROM public.referral_campaigns WHERE id = p_campaign_id;

    RETURN jsonb_build_object(
        'success', true,
        'archiveId', v_archive_id,
        'message', 'Campaign archived and permanently deleted successfully.'
    );
END;
$$;

-- 9. RPC: Get Archived (Deleted) Campaigns List
CREATE OR REPLACE FUNCTION public.get_referral_campaign_archives()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', rca.id,
            'originalCampaignId', rca.original_campaign_id,
            'name', rca.campaign_name,
            'description', COALESCE(rca.campaign_description, ''),
            'startTimestamp', rca.start_timestamp,
            'endTimestamp', rca.end_timestamp,
            'volunteerCount', rca.volunteer_count,
            'volunteerData', rca.volunteer_data,
            'originalCreatedAt', rca.original_created_at,
            'archivedAt', rca.archived_at,
            'archivedBy', rca.archived_by
        )
        ORDER BY rca.archived_at DESC
    ) INTO v_result
    FROM public.referral_campaign_archives rca;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
