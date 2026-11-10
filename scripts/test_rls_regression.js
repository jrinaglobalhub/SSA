const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function runRegression() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- Setting up Test Fixtures for Regression Testing ---');

  // Consumer A: ae01e272-d135-4c2a-99d2-ffe730361735 (testuser1, phone: 6238724428)
  const consumerA_id = 'ae01e272-d135-4c2a-99d2-ffe730361735';
  // Consumer B: f1d4113b-314f-4aad-bd87-1899501e1b08 (RithishaC, phone: 7337845296)
  const consumerB_id = 'f1d4113b-314f-4aad-bd87-1899501e1b08';

  // Partner A user from auth.users: aa6492db-2a57-4880-ab2f-66a9a20fd18d
  const partnerA_userId = 'aa6492db-2a57-4880-ab2f-66a9a20fd18d';
  // Partner B user from auth.users: 8fac197f-7873-49e9-9318-51a78f6468b6
  const partnerB_userId = '8fac197f-7873-49e9-9318-51a78f6468b6';

  // Admin user: Muhammad J R (beee4208-67ee-4f60-a004-1477bad41759)
  const admin_id = 'beee4208-67ee-4f60-a004-1477bad41759';

  // Find two distinct stores
  const storesRes = await client.query(`SELECT id, owner_id, name FROM public.stores LIMIT 2;`);
  const storeA = storesRes.rows[0];
  const storeB = storesRes.rows[1];

  // Set up Partner A and Partner B with real auth.users foreign keys
  await client.query(`
    INSERT INTO public.delivery_partners (id, auth_user_id, full_name, phone, email, vehicle_type, vehicle_reg_number, is_online, is_active)
    VALUES ('partner_reg_test_a', $1, 'Partner A Test', '9447000001', 'binduhasini1520@gmail.com', 'BIKE', 'KL21A0001', true, true)
    ON CONFLICT (id) DO UPDATE SET auth_user_id = $1, email = 'binduhasini1520@gmail.com';
  `, [partnerA_userId]);

  await client.query(`
    INSERT INTO public.delivery_partners (id, auth_user_id, full_name, phone, email, vehicle_type, vehicle_reg_number, is_online, is_active)
    VALUES ('partner_reg_test_b', $1, 'Partner B Test', '9447000002', 'shanshanuzz70@gmail.com', 'BIKE', 'KL21B0002', true, true)
    ON CONFLICT (id) DO UPDATE SET auth_user_id = $1, email = 'shanshanuzz70@gmail.com';
  `, [partnerB_userId]);

  const partnerA_id = 'partner_reg_test_a';
  const partnerB_id = 'partner_reg_test_b';

  // Seed two distinct orders:
  // Order A: For Consumer A at Store A, assigned to Partner A
  const orderA_id = `reg_ord_a_${Date.now()}`;
  await client.query(`
    INSERT INTO public.orders (
      id, order_number, store_id, customer_id, customer_name, customer_phone, total_amount, status, delivery_partner_id, otp
    ) VALUES (
      $1, 'REG-A', $2, $3, 'Consumer A', '6238724428', 100, 'received', $4, '1111'
    );
  `, [orderA_id, storeA.id, consumerA_id, partnerA_id]);

  await client.query(`
    INSERT INTO public.order_items (id, order_id, product_name, quantity, unit_price)
    VALUES ($1, $2, 'Item for Order A', 1, 100);
  `, [`reg_item_a_${Date.now()}`, orderA_id]);

  // Order B: For Consumer B at Store B, assigned to Partner B
  const orderB_id = `reg_ord_b_${Date.now()}`;
  await client.query(`
    INSERT INTO public.orders (
      id, order_number, store_id, customer_id, customer_name, customer_phone, total_amount, status, delivery_partner_id, otp
    ) VALUES (
      $1, 'REG-B', $2, $3, 'Consumer B', '7337845296', 200, 'received', $4, '2222'
    );
  `, [orderB_id, storeB.id, consumerB_id, partnerB_id]);

  await client.query(`
    INSERT INTO public.order_items (id, order_id, product_name, quantity, unit_price)
    VALUES ($1, $2, 'Item for Order B', 2, 100);
  `, [`reg_item_b_${Date.now()}`, orderB_id]);

  console.log(`Created Order A (${orderA_id}) and Order B (${orderB_id})`);

  // Helper function to execute query as a specific role and auth.uid()
  async function queryAs(role, authUid, sql, params = []) {
    await client.query('BEGIN;');
    try {
      await client.query(`SET LOCAL ROLE ${role};`);
      if (authUid) {
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [authUid]);
        await client.query(`SELECT set_config('request.jwt.claims', $1, true);`, [
          JSON.stringify({ sub: authUid, role: role })
        ]);
      } else {
        await client.query(`SELECT set_config('request.jwt.claim.sub', '', true);`);
        await client.query(`SELECT set_config('request.jwt.claims', '', true);`);
      }
      const res = await client.query(sql, params);
      await client.query('COMMIT;');
      return { success: true, rows: res.rows, rowCount: res.rowCount };
    } catch (err) {
      await client.query('ROLLBACK;');
      return { success: false, error: err.message };
    }
  }

  const results = [];

  // =========================================================================
  // TEST 1: Anonymous access to orders (Must be BLOCKED with 0 rows or permission denied)
  // =========================================================================
  const t1 = await queryAs('anon', null, `SELECT id FROM public.orders WHERE id = $1;`, [orderA_id]);
  const t1_pass = !t1.success || (t1.rows && t1.rows.length === 0);
  results.push({ test: 'Anonymous cannot read orders', pass: t1_pass, detail: t1.error || `${t1.rows?.length} rows` });

  // =========================================================================
  // TEST 2: Anonymous access to order_items (Must be BLOCKED)
  // =========================================================================
  const t2 = await queryAs('anon', null, `SELECT id FROM public.order_items WHERE order_id = $1;`, [orderA_id]);
  const t2_pass = !t2.success || (t2.rows && t2.rows.length === 0);
  results.push({ test: 'Anonymous cannot read order_items', pass: t2_pass, detail: t2.error || `${t2.rows?.length} rows` });

  // =========================================================================
  // TEST 3: Anonymous access to delivery_jobs (Must be BLOCKED)
  // =========================================================================
  const t3 = await queryAs('anon', null, `SELECT id FROM public.delivery_jobs LIMIT 5;`, []);
  const t3_pass = !t3.success || (t3.rows && t3.rows.length === 0);
  results.push({ test: 'Anonymous cannot read delivery_jobs', pass: t3_pass, detail: t3.error || `${t3.rows?.length} rows` });

  // =========================================================================
  // TEST 4: Anonymous access to delivery_partners (Must be BLOCKED)
  // =========================================================================
  const t4 = await queryAs('anon', null, `SELECT id FROM public.delivery_partners LIMIT 5;`, []);
  const t4_pass = !t4.success || (t4.rows && t4.rows.length === 0);
  results.push({ test: 'Anonymous cannot read delivery_partners', pass: t4_pass, detail: t4.error || `${t4.rows?.length} rows` });

  // =========================================================================
  // TEST 5: Consumer A CAN read own order A
  // =========================================================================
  const t5 = await queryAs('authenticated', consumerA_id, `SELECT id, order_number FROM public.orders WHERE id = $1;`, [orderA_id]);
  const t5_pass = t5.success && t5.rows.length === 1 && t5.rows[0].id === orderA_id;
  results.push({ test: 'Consumer A can read own order A', pass: t5_pass, detail: t5.error || `${t5.rows?.length} row(s)` });

  // =========================================================================
  // TEST 6: Consumer A CANNOT read Consumer B order B (0 rows returned)
  // =========================================================================
  const t6 = await queryAs('authenticated', consumerA_id, `SELECT id, order_number FROM public.orders WHERE id = $1;`, [orderB_id]);
  const t6_pass = t6.success && t6.rows.length === 0;
  results.push({ test: 'Consumer A cannot read Consumer B order B', pass: t6_pass, detail: t6.error || `${t6.rows?.length} row(s)` });

  // =========================================================================
  // TEST 7: Consumer A CANNOT modify Consumer B order B (0 rows updated)
  // =========================================================================
  const t7 = await queryAs('authenticated', consumerA_id, `UPDATE public.orders SET status = 'cancelled' WHERE id = $1;`, [orderB_id]);
  const t7_pass = t7.success && t7.rowCount === 0;
  results.push({ test: 'Consumer A cannot modify Consumer B order B', pass: t7_pass, detail: t7.error || `${t7.rowCount} row(s) updated` });

  // =========================================================================
  // TEST 8: Merchant A CAN read orders for Store A
  // =========================================================================
  const t8 = await queryAs('authenticated', storeA.owner_id, `SELECT id, order_number FROM public.orders WHERE id = $1;`, [orderA_id]);
  const t8_pass = t8.success && t8.rows.length === 1;
  results.push({ test: 'Merchant A can read orders for Store A', pass: t8_pass, detail: t8.error || `${t8.rows?.length} row(s)` });

  // =========================================================================
  // TEST 9: Merchant A CANNOT read orders for Store B (0 rows returned)
  // =========================================================================
  const t9 = await queryAs('authenticated', storeA.owner_id, `SELECT id, order_number FROM public.orders WHERE id = $1;`, [orderB_id]);
  const t9_pass = t9.success && t9.rows.length === 0;
  results.push({ test: 'Merchant A cannot read orders for Store B', pass: t9_pass, detail: t9.error || `${t9.rows?.length} row(s)` });

  // =========================================================================
  // TEST 10: Merchant A CANNOT update orders for Store B (0 rows updated)
  // =========================================================================
  const t10 = await queryAs('authenticated', storeA.owner_id, `UPDATE public.orders SET status = 'MERCHANT_ACCEPTED' WHERE id = $1;`, [orderB_id]);
  const t10_pass = t10.success && t10.rowCount === 0;
  results.push({ test: 'Merchant A cannot update orders for Store B', pass: t10_pass, detail: t10.error || `${t10.rowCount} row(s) updated` });

  // =========================================================================
  // TEST 11: Delivery Partner A CAN read assigned Order A
  // =========================================================================
  const t11 = await queryAs('authenticated', partnerA_userId, `SELECT id, order_number FROM public.orders WHERE id = $1;`, [orderA_id]);
  const t11_pass = t11.success && t11.rows.length === 1;
  results.push({ test: 'Delivery Partner A can read assigned Order A', pass: t11_pass, detail: t11.error || `${t11.rows?.length} row(s)` });

  // =========================================================================
  // TEST 12: Delivery Partner A CANNOT read unassigned Order B (0 rows returned)
  // =========================================================================
  const t12 = await queryAs('authenticated', partnerA_userId, `SELECT id, order_number FROM public.orders WHERE id = $1;`, [orderB_id]);
  const t12_pass = t12.success && t12.rows.length === 0;
  results.push({ test: 'Delivery Partner A cannot read unassigned Order B', pass: t12_pass, detail: t12.error || `${t12.rows?.length} row(s)` });

  // =========================================================================
  // TEST 13: Super Admin CAN access all orders
  // =========================================================================
  const t13 = await queryAs('authenticated', admin_id, `SELECT COUNT(*) FROM public.orders WHERE id IN ($1, $2);`, [orderA_id, orderB_id]);
  const t13_pass = t13.success && Number(t13.rows[0].count) === 2;
  results.push({ test: 'Super Admin can access all orders', pass: t13_pass, detail: t13.error || `${t13.rows?.[0]?.count} order(s)` });

  // =========================================================================
  // TEST 14: Consumer A CANNOT read order items of Order B
  // =========================================================================
  const t14 = await queryAs('authenticated', consumerA_id, `SELECT id FROM public.order_items WHERE order_id = $1;`, [orderB_id]);
  const t14_pass = t14.success && t14.rows.length === 0;
  results.push({ test: 'Consumer A cannot read order items of Order B', pass: t14_pass, detail: t14.error || `${t14.rows?.length} item(s)` });

  // =========================================================================
  // TEST 15: Consumer A CAN read order items of Order A
  // =========================================================================
  const t15 = await queryAs('authenticated', consumerA_id, `SELECT id FROM public.order_items WHERE order_id = $1;`, [orderA_id]);
  const t15_pass = t15.success && t15.rows.length === 1;
  results.push({ test: 'Consumer A can read order items of Order A', pass: t15_pass, detail: t15.error || `${t15.rows?.length} item(s)` });

  // =========================================================================
  // TEST 16: Ownership ID Spoofing Check (Consumer A trying to insert order claiming Consumer B's ID)
  // =========================================================================
  const fakeOrderId = `fake_ord_${Date.now()}`;
  const t16 = await queryAs(
    'authenticated',
    consumerA_id,
    `INSERT INTO public.orders (id, order_number, store_id, customer_id, customer_phone, total_amount, status) VALUES ($1, 'SPOOF-1', $2, $3, '9999999999', 50, 'received');`,
    [fakeOrderId, storeA.id, consumerB_id]
  );
  const t16_pass = !t16.success || t16.rowCount === 0;
  results.push({ test: 'Consumer cannot spoof ownership ID on insert', pass: t16_pass, detail: t16.error || 'Blocked by RLS' });

  console.log('\n=============================================================');
  console.log('>>> RLS REGRESSION TEST RESULTS MATRIX <<<');
  console.log('=============================================================');
  console.table(results);

  // Clean up test orders & test partners
  await client.query(`DELETE FROM public.order_items WHERE order_id IN ($1, $2, $3);`, [orderA_id, orderB_id, fakeOrderId]);
  await client.query(`DELETE FROM public.orders WHERE id IN ($1, $2, $3);`, [orderA_id, orderB_id, fakeOrderId]);
  await client.query(`DELETE FROM public.delivery_partners WHERE id IN ($1, $2);`, [partnerA_id, partnerB_id]);
  console.log('Test fixtures cleanly removed.');

  await client.end();
}

runRegression().catch(console.error);
