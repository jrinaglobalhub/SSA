const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');
const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function fix() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const sql = `
CREATE OR REPLACE FUNCTION public.fn_auto_create_delivery_job_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_store RECORD;
  v_existing_job RECORD;
  v_addr JSONB;
  v_customer_lat NUMERIC;
  v_customer_lng NUMERIC;
  v_distance NUMERIC;
  v_payout NUMERIC;
  v_items JSONB;
  v_items_count INT;
  v_job_id TEXT;
BEGIN
  -- Trigger condition: Order becomes 'ready' or 'ready_for_pickup'
  IF (NEW.status IN ('ready', 'ready_for_pickup') AND (OLD.status IS NULL OR OLD.status NOT IN ('ready', 'ready_for_pickup'))) THEN

    -- Prevent duplicate delivery job creation
    SELECT * INTO v_existing_job
    FROM public.delivery_jobs
    WHERE order_id = NEW.id OR order_number = NEW.order_number;

    IF FOUND THEN
      RETURN NEW;
    END IF;

    -- Fetch store details with canonical store ID lookup
    SELECT * INTO v_store
    FROM public.stores
    WHERE id = NEW.store_id 
       OR id = ('store_' || NEW.store_id)
       OR id = REPLACE(NEW.store_id, 'store_', '')
    LIMIT 1;

    v_addr := NEW.delivery_address;
    v_customer_lat := COALESCE(
      (v_addr->>'lat')::NUMERIC,
      (v_addr->'coordinates'->>'latitude')::NUMERIC,
      (v_addr->>'latitude')::NUMERIC,
      COALESCE(v_store.lat, 8.727312)
    );
    v_customer_lng := COALESCE(
      (v_addr->>'lng')::NUMERIC,
      (v_addr->'coordinates'->>'longitude')::NUMERIC,
      (v_addr->>'longitude')::NUMERIC,
      COALESCE(v_store.lng, 77.044753)
    );
    v_distance := COALESCE(NEW.road_distance_km, 3.0);
    
    -- Calculate partner payout: base ₹50 + ₹10 per km beyond 2km
    v_payout := GREATEST(50.0, 50.0 + (GREATEST(0, v_distance - 2.0) * 10.0));

    -- Snapshot order items
    SELECT 
      COALESCE(jsonb_agg(jsonb_build_object('id', oi.id, 'name', oi.product_name, 'quantity', oi.quantity, 'unitPrice', oi.unit_price)), '[]'::jsonb),
      COALESCE(SUM(oi.quantity), 1)
    INTO v_items, v_items_count
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id;

    v_job_id := 'job_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.delivery_jobs (
      id,
      order_id,
      order_number,
      store_id,
      store_name,
      store_address,
      store_phone,
      store_lat,
      store_lng,
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      customer_lat,
      customer_lng,
      status,
      items,
      items_count,
      total_amount,
      payout_amount,
      distance_km,
      estimated_minutes,
      created_at
    ) VALUES (
      v_job_id,
      NEW.id,
      NEW.order_number,
      COALESCE(v_store.id, NEW.store_id),
      COALESCE(v_store.name, NEW.store_name, 'Partner Merchant'),
      COALESCE(v_store.address, NEW.store_address, 'Store Address'),
      COALESCE(v_store.phone, NEW.store_phone, ''),
      COALESCE(v_store.lat, 8.727312),
      COALESCE(v_store.lng, 77.044753),
      NEW.customer_id,
      COALESCE(NEW.customer_name, v_addr->>'fullName', 'Customer'),
      COALESCE(NEW.customer_phone, v_addr->>'phone', ''),
      COALESCE(
        CONCAT_WS(', ', v_addr->>'houseDetails', v_addr->>'streetArea', v_addr->>'city', v_addr->>'district', v_addr->>'pincode'),
        'Customer Delivery Address'
      ),
      v_customer_lat,
      v_customer_lng,
      'PENDING_ACCEPTANCE',
      COALESCE(v_items, '[]'::jsonb),
      COALESCE(v_items_count, 1),
      COALESCE(NEW.total_amount, 0),
      v_payout,
      v_distance,
      LEAST(60, GREATEST(10, ROUND(v_distance * 4)::INT)),
      NOW()
    );

    NEW.delivery_job_id := v_job_id;
  END IF;

  RETURN NEW;
END;
$function$;
`;

  await client.query(sql);
  console.log('fn_auto_create_delivery_job_from_order updated successfully!');
  await client.end();
}

fix();
