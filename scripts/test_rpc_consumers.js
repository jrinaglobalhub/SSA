const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');
const { createClient } = require('@supabase/supabase-js');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

async function testRpcCreation() {
  const pgClient = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();
    console.log("Connected to PG!");

    // Create the get_admin_consumers function with SECURITY DEFINER
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION public.get_admin_consumers(
        p_search text DEFAULT '',
        p_status text DEFAULT 'all',
        p_limit int DEFAULT 50,
        p_offset int DEFAULT 0
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
        registration_date timestamptz,
        last_active_date timestamptz,
        account_status text,
        referral_code text,
        referred_by_code text,
        total_count bigint
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, auth, pg_temp
      AS $func$
      DECLARE
        v_total bigint;
      BEGIN
        -- Calculate total count matching search and filters
        SELECT COUNT(*) INTO v_total
        FROM auth.users u
        LEFT JOIN public.app_users a ON u.id::text = a.id
        WHERE (
          -- Consumer role identification
          (u.raw_user_meta_data->>'role' = 'consumer' OR a.role = 'consumer')
          OR (
            (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' NOT IN ('merchant_partner'))
            AND (a.role IS NULL OR a.role NOT IN ('merchant_partner'))
          )
        )
        AND (
          p_search IS NULL OR TRIM(p_search) = '' OR
          (u.email ILIKE '%' || TRIM(p_search) || '%') OR
          (COALESCE(a.full_name, u.raw_user_meta_data->>'full_name') ILIKE '%' || TRIM(p_search) || '%') OR
          (COALESCE(a.phone, u.raw_user_meta_data->>'phone', u.phone) ILIKE '%' || TRIM(p_search) || '%') OR
          (COALESCE(a.customer_id, '') ILIKE '%' || TRIM(p_search) || '%')
        )
        AND (
          p_status IS NULL OR p_status = 'all' OR
          (p_status = 'active' AND u.last_sign_in_at > now() - interval '30 days') OR
          (p_status = 'inactive' AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at <= now() - interval '30 days'))
        );

        RETURN QUERY
        SELECT 
          u.id::text as id,
          COALESCE(a.customer_id, 'Not assigned') as customer_id,
          COALESCE(
            NULLIF(TRIM(a.full_name), ''),
            NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(a.username), ''),
            split_part(u.email, '@', 1)
          ) as name,
          COALESCE(NULLIF(TRIM(a.username), ''), u.raw_user_meta_data->>'username', 'consumer') as username,
          COALESCE(
            NULLIF(TRIM(a.phone), ''),
            NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''),
            NULLIF(TRIM(u.phone), ''),
            'Not available'
          ) as phone,
          COALESCE(u.email, 'Not available') as email,
          COALESCE(
            NULLIF(TRIM(a.address->>'state'), ''),
            NULLIF(TRIM(u.raw_user_meta_data->'delivery_address'->>'state'), ''),
            'Kerala'
          ) as state,
          COALESCE(
            NULLIF(TRIM(a.address->>'city'), ''),
            NULLIF(TRIM(u.raw_user_meta_data->'delivery_address'->>'city'), ''),
            'Not available'
          ) as city,
          u.created_at as registration_date,
          u.last_sign_in_at as last_active_date,
          CASE 
            WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'banned'
            WHEN u.deleted_at IS NOT NULL THEN 'deleted'
            WHEN u.last_sign_in_at > now() - interval '30 days' THEN 'active'
            ELSE 'inactive'
          END as account_status,
          COALESCE(a.referral_code, 'None') as referral_code,
          COALESCE(a.referred_by_code, 'Direct') as referred_by_code,
          v_total as total_count
        FROM auth.users u
        LEFT JOIN public.app_users a ON u.id::text = a.id
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
          (COALESCE(a.full_name, u.raw_user_meta_data->>'full_name') ILIKE '%' || TRIM(p_search) || '%') OR
          (COALESCE(a.phone, u.raw_user_meta_data->>'phone', u.phone) ILIKE '%' || TRIM(p_search) || '%') OR
          (COALESCE(a.customer_id, '') ILIKE '%' || TRIM(p_search) || '%')
        )
        AND (
          p_status IS NULL OR p_status = 'all' OR
          (p_status = 'active' AND u.last_sign_in_at > now() - interval '30 days') OR
          (p_status = 'inactive' AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at <= now() - interval '30 days'))
        )
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET p_offset;
      END;
      $func$;

      GRANT EXECUTE ON FUNCTION public.get_admin_consumers(text, text, int, int) TO anon, authenticated, service_role;
    `;

    await pgClient.query(createFunctionSql);
    console.log("Function public.get_admin_consumers created and granted successfully!");

    // Also create get_admin_overview_counts so Overview shows real numbers instead of 1420!
    const createOverviewCountsSql = `
      CREATE OR REPLACE FUNCTION public.get_admin_overview_metrics()
      RETURNS TABLE (
        today_orders bigint,
        total_consumers bigint,
        total_merchants bigint,
        today_active_consumers bigint
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, auth, pg_temp
      AS $func$
      DECLARE
        v_today_orders bigint;
        v_total_consumers bigint;
        v_total_merchants bigint;
        v_active_today bigint;
      BEGIN
        -- Orders today
        SELECT COUNT(*) INTO v_today_orders
        FROM public.orders
        WHERE created_at >= CURRENT_DATE;

        -- Total real consumers
        SELECT COUNT(*) INTO v_total_consumers
        FROM auth.users u
        LEFT JOIN public.app_users a ON u.id::text = a.id
        WHERE (u.raw_user_meta_data->>'role' = 'consumer' OR a.role = 'consumer')
           OR ((u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' NOT IN ('merchant_partner')) AND (a.role IS NULL OR a.role NOT IN ('merchant_partner')));

        -- Total merchants
        SELECT COUNT(*) INTO v_total_merchants
        FROM public.stores;

        -- Active today consumers
        SELECT COUNT(*) INTO v_active_today
        FROM auth.users u
        WHERE last_sign_in_at >= CURRENT_DATE;

        RETURN QUERY
        SELECT v_today_orders, v_total_consumers, v_total_merchants, v_active_today;
      END;
      $func$;

      GRANT EXECUTE ON FUNCTION public.get_admin_overview_metrics() TO anon, authenticated, service_role;
    `;
    await pgClient.query(createOverviewCountsSql);
    console.log("Function public.get_admin_overview_metrics created and granted successfully!");

  } catch (err) {
    console.error("PG error:", err);
  } finally {
    await pgClient.end();
  }

  // 2. NOW TEST WITH SUPABASE CLIENT (as anon role!)
  console.log("\nTesting with Supabase JS client via public API...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: consumers, error: cErr } = await supabase.rpc("get_admin_consumers", {
    p_search: "",
    p_status: "all",
    p_limit: 10,
    p_offset: 0
  });

  if (cErr) {
    console.error("Supabase RPC error:", cErr);
  } else {
    console.log(`Supabase RPC SUCCESS! Retrieved ${consumers.length} consumers:`);
    console.log(consumers.slice(0, 3));
  }

  // Test search by name
  const { data: searchResults, error: sErr } = await supabase.rpc("get_admin_consumers", {
    p_search: "Aryajith",
    p_status: "all"
  });
  console.log("\nSearch for 'Aryajith':", searchResults);

  // Test overview metrics RPC
  const { data: metrics, error: mErr } = await supabase.rpc("get_admin_overview_metrics");
  console.log("\nOverview metrics RPC:", metrics);
}

testRpcCreation();
