-- ==============================================================================
-- Migration: 20261109_referral_campaign_tracking.sql
-- Description: Live Referral Attribution & Campaign Performance Tracking System
-- ==============================================================================

-- 1. RPC: Get Live Referral Tracking for a Campaign
CREATE OR REPLACE FUNCTION public.get_referral_campaign_tracking(
    p_campaign_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_camp RECORD;
    v_vols JSONB;
    v_summary JSONB;
    v_total_volunteers INT := 0;
    v_total_merchants INT := 0;
    v_total_consumers INT := 0;
    v_total_onboarded INT := 0;
BEGIN
    -- Verify campaign exists
    SELECT * INTO v_camp
    FROM public.referral_campaigns
    WHERE id = p_campaign_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign not found.');
    END IF;

    -- Aggregate volunteer-level performance with accurate attribution
    -- SSM Merchants: distinct stores where UPPER(TRIM(referred_by_code)) = volunteer referral code
    -- SSC Consumers: distinct consumers in app_users where UPPER(TRIM(referred_by_code)) = volunteer referral code
    -- Excludes SSD delivery partners and non-consumer accounts
    WITH vol_perf AS (
        SELECT 
            rcv.id,
            rcv.campaign_id,
            rcv.serial_number,
            rcv.volunteer_name,
            rcv.mobile_number,
            rcv.referral_code,
            rcv.assigned_date,
            rcv.assigned_start_time,
            rcv.assigned_end_time,
            rcv.created_at,
            COALESCE((
                SELECT COUNT(DISTINCT s.id)::int
                FROM public.stores s
                WHERE UPPER(TRIM(s.referred_by_code)) = UPPER(TRIM(rcv.referral_code))
            ), 0) AS ssm_merchants,
            COALESCE((
                SELECT COUNT(DISTINCT u.id)::int
                FROM public.app_users u
                WHERE UPPER(TRIM(u.referred_by_code)) = UPPER(TRIM(rcv.referral_code))
                  AND (u.role = 'consumer' OR u.role IS NULL)
            ), 0) AS ssc_consumers
        FROM public.referral_campaign_volunteers rcv
        WHERE rcv.campaign_id = p_campaign_id
        ORDER BY rcv.serial_number ASC
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', vp.id,
                'serialNumber', vp.serial_number,
                'volunteerName', vp.volunteer_name,
                'mobileNumber', vp.mobile_number,
                'referralCode', vp.referral_code,
                'assignedDate', vp.assigned_date,
                'assignedStartTime', vp.assigned_start_time,
                'assignedEndTime', vp.assigned_end_time,
                'ssmMerchants', vp.ssm_merchants,
                'sscConsumers', vp.ssc_consumers,
                'totalOnboarded', (vp.ssm_merchants + vp.ssc_consumers),
                'createdAt', vp.created_at
            )
            ORDER BY vp.serial_number ASC
        ),
        COUNT(*)::int,
        COALESCE(SUM(vp.ssm_merchants)::int, 0),
        COALESCE(SUM(vp.ssc_consumers)::int, 0),
        COALESCE(SUM(vp.ssm_merchants + vp.ssc_consumers)::int, 0)
    INTO 
        v_vols,
        v_total_volunteers,
        v_total_merchants,
        v_total_consumers,
        v_total_onboarded
    FROM vol_perf vp;

    v_summary := jsonb_build_object(
        'totalVolunteers', v_total_volunteers,
        'totalMerchants', v_total_merchants,
        'totalConsumers', v_total_consumers,
        'totalOnboarded', v_total_onboarded
    );

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
            'createdAt', v_camp.created_at,
            'updatedAt', v_camp.updated_at
        ),
        'summary', v_summary,
        'volunteers', COALESCE(v_vols, '[]'::jsonb)
    );
END;
$$;

-- 2. RPC: Get Live Referral Tracking for an Archived Campaign
CREATE OR REPLACE FUNCTION public.get_referral_campaign_archive_tracking(
    p_archive_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_arch RECORD;
    v_vol JSONB;
    v_vols JSONB := '[]'::jsonb;
    v_total_volunteers INT := 0;
    v_total_merchants INT := 0;
    v_total_consumers INT := 0;
    v_total_onboarded INT := 0;
    v_code TEXT;
    v_ssm INT;
    v_ssc INT;
BEGIN
    SELECT * INTO v_arch
    FROM public.referral_campaign_archives
    WHERE id = p_archive_id OR original_campaign_id = p_archive_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Archived campaign not found.');
    END IF;

    FOR v_vol IN SELECT * FROM jsonb_array_elements(COALESCE(v_arch.volunteer_data, '[]'::jsonb)) LOOP
        v_code := UPPER(TRIM(COALESCE(v_vol->>'referralCode', v_vol->>'referral_code', '')));
        
        -- SSM Merchants
        SELECT COUNT(DISTINCT s.id)::int INTO v_ssm
        FROM public.stores s
        WHERE UPPER(TRIM(s.referred_by_code)) = v_code;

        -- SSC Consumers
        SELECT COUNT(DISTINCT u.id)::int INTO v_ssc
        FROM public.app_users u
        WHERE UPPER(TRIM(u.referred_by_code)) = v_code
          AND (u.role = 'consumer' OR u.role IS NULL);

        v_total_volunteers := v_total_volunteers + 1;
        v_total_merchants := v_total_merchants + COALESCE(v_ssm, 0);
        v_total_consumers := v_total_consumers + COALESCE(v_ssc, 0);
        v_total_onboarded := v_total_onboarded + COALESCE(v_ssm, 0) + COALESCE(v_ssc, 0);

        v_vols := v_vols || jsonb_build_array(
            jsonb_build_object(
                'id', v_vol->>'id',
                'serialNumber', COALESCE((v_vol->>'serialNumber')::int, (v_vol->>'serial_number')::int, v_total_volunteers),
                'volunteerName', COALESCE(v_vol->>'volunteerName', v_vol->>'volunteer_name', 'Volunteer'),
                'mobileNumber', COALESCE(v_vol->>'mobileNumber', v_vol->>'mobile_number', '—'),
                'referralCode', v_code,
                'assignedDate', COALESCE(v_vol->>'assignedDate', v_vol->>'assigned_date'),
                'assignedStartTime', COALESCE(v_vol->>'assignedStartTime', v_vol->>'assigned_start_time'),
                'assignedEndTime', COALESCE(v_vol->>'assignedEndTime', v_vol->>'assigned_end_time'),
                'ssmMerchants', COALESCE(v_ssm, 0),
                'sscConsumers', COALESCE(v_ssc, 0),
                'totalOnboarded', COALESCE(v_ssm, 0) + COALESCE(v_ssc, 0)
            )
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'campaign', jsonb_build_object(
            'id', v_arch.original_campaign_id,
            'name', v_arch.campaign_name,
            'description', COALESCE(v_arch.campaign_description, ''),
            'startTimestamp', v_arch.start_timestamp,
            'endTimestamp', v_arch.end_timestamp,
            'volunteerCount', v_arch.volunteer_count,
            'status', 'archived',
            'createdAt', v_arch.original_created_at
        ),
        'summary', jsonb_build_object(
            'totalVolunteers', v_total_volunteers,
            'totalMerchants', v_total_merchants,
            'totalConsumers', v_total_consumers,
            'totalOnboarded', v_total_onboarded
        ),
        'volunteers', v_vols
    );
END;
$$;

-- Grant permissions to public/authenticated/anon
GRANT EXECUTE ON FUNCTION public.get_referral_campaign_tracking(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_referral_campaign_archive_tracking(TEXT) TO anon, authenticated, service_role;
