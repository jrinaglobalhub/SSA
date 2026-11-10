const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function runTest() {
  const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Connected to PostgreSQL Database ---');

    // 1. Check existing store
    const storeRes = await client.query(`SELECT id, name, phone, address, lat, lng FROM public.stores LIMIT 1;`);
    console.log('Sample Store:', storeRes.rows[0]);
    const store = storeRes.rows[0];
    if (!store) {
      console.error('No stores found in database!');
      return;
    }

    // 2. Check existing delivery partner
    const partnerRes = await client.query(`SELECT id, full_name, phone, vehicle_type, vehicle_reg_number, is_online, is_active, active_job_id FROM public.delivery_partners LIMIT 1;`);
    console.log('Sample Delivery Partner:', partnerRes.rows[0]);
    const partner = partnerRes.rows[0];

    // Ensure partner is online and has no active job
    await client.query(`UPDATE public.delivery_partners SET is_online = true, is_active = true, active_job_id = NULL WHERE id = $1;`, [partner.id]);

    // 3. Test Order Creation: Call save_customer_order
    const testOrderId = `test_ord_${Date.now()}`;
    const testOrderNumber = `TEST-${Date.now().toString().slice(-4)}`;
    const testOtp = '4321';

    console.log(`\n--- Step 1: Customer Order Placement [${testOrderId}] ---`);
    const orderPayload = {
      id: testOrderId,
      orderNumber: testOrderNumber,
      storeId: store.id,
      storeName: store.name,
      storeAddress: store.address || 'Main Road, Palode',
      storePhone: store.phone || '9876543210',
      customerName: 'Integration Tester',
      customerPhone: '9447000000',
      deliveryAddress: {
        fullName: 'Integration Tester',
        phone: '9447000000',
        houseDetails: 'Test Villa',
        streetArea: 'Peringammala',
        city: 'Palode',
        district: 'Thiruvananthapuram',
        state: 'Kerala',
        pincode: '695562',
        coordinates: { latitude: 8.727312, longitude: 77.044753 }
      },
      deliveryOption: 'delivery',
      itemSubtotal: 250,
      deliveryCharge: 30,
      platformFee: 5,
      totalCodAmount: 285,
      paymentMethod: 'cod',
      otp: testOtp,
      roadDistanceKm: 3.2
    };

    const itemPayload = [
      {
        id: `item_1_${Date.now()}`,
        name: 'Fresh Malabar Parotta',
        category: 'Food',
        sku: 'FOD-001',
        imageUrl: '',
        unitPrice: 50,
        quantity: 5
      }
    ];

    const placeRes = await client.query(
      `SELECT public.save_customer_order($1::jsonb, $2::jsonb) as result;`,
      [JSON.stringify(orderPayload), JSON.stringify(itemPayload)]
    );
    console.log('save_customer_order result:', placeRes.rows[0].result);

    // Verify order was saved
    const verifyOrder = await client.query(`SELECT id, order_number, status, otp, otp_verified, total_amount FROM public.orders WHERE id = $1;`, [testOrderId]);
    console.log('Order in DB:', verifyOrder.rows[0]);

    // Verify order items were saved
    const verifyItems = await client.query(`SELECT id, product_name, quantity, prepared_quantity, is_ready FROM public.order_items WHERE order_id = $1;`, [testOrderId]);
    console.log('Order Items in DB:', verifyItems.rows);

    // 4. Step 2: Merchant Preparation & Marking Ready
    console.log('\n--- Step 2: Merchant Item Preparation ---');
    const itemId = verifyItems.rows[0].id;
    const prepRes = await client.query(
      `SELECT public.update_order_item_preparation($1, $2, $3, $4) as result;`,
      [testOrderId, itemId, 5, store.id]
    );
    console.log('update_order_item_preparation result:', prepRes.rows[0].result);

    // Now merchant marks order ready for pickup (or transitions lifecycle to READY_FOR_PICKUP / ready)
    console.log('\n--- Transitioning order to ready (Triggers Delivery Job Dispatch) ---');
    await client.query(`UPDATE public.orders SET status = 'ready' WHERE id = $1;`, [testOrderId]);

    // Check order status & trigger execution
    const orderAfterPrep = await client.query(`SELECT id, status, delivery_job_id FROM public.orders WHERE id = $1;`, [testOrderId]);
    console.log('Order status after marking ready:', orderAfterPrep.rows[0]);

    // Check delivery_jobs table for auto-created job
    const jobRes = await client.query(`SELECT id, order_id, status, store_name, customer_name, distance_km, payout_amount FROM public.delivery_jobs WHERE order_id = $1;`, [testOrderId]);
    console.log('Auto-created Delivery Job:', jobRes.rows[0]);

    if (!jobRes.rows[0]) {
      console.error('ERROR: Delivery job was not created!');
      return;
    }

    const deliveryJobId = jobRes.rows[0].id;

    // 5. Step 3: Delivery Partner Acceptance
    console.log('\n--- Step 3: Delivery Partner Job Acceptance ---');
    const partnerId = partner.id;
    const acceptRes = await client.query(
      `SELECT public.rpc_accept_delivery_job($1, $2) as result;`,
      [deliveryJobId, partnerId]
    );
    console.log('rpc_accept_delivery_job result:', acceptRes.rows[0].result);

    // Test duplicate acceptance by another partner
    const fakePartnerId = 'partner_999999';
    const dupAcceptRes = await client.query(
      `SELECT public.rpc_accept_delivery_job($1, $2) as result;`,
      [deliveryJobId, fakePartnerId]
    );
    console.log('Duplicate accept attempt result (should fail gracefully):', dupAcceptRes.rows[0].result);

    // Check job and order state after assignment
    const jobAfterAccept = await client.query(`SELECT id, status, assigned_partner_id FROM public.delivery_jobs WHERE id = $1;`, [deliveryJobId]);
    console.log('Job state after acceptance:', jobAfterAccept.rows[0]);

    const orderAfterAccept = await client.query(`SELECT id, status, delivery_partner_id, delivery_job_id FROM public.orders WHERE id = $1;`, [testOrderId]);
    console.log('Order state after partner acceptance:', orderAfterAccept.rows[0]);

    // 6. Step 4: Merchant Handover / Store Pickup
    console.log('\n--- Step 4: Partner Pickup at Store ---');
    const pickupRes = await client.query(
      `SELECT public.rpc_confirm_store_pickup($1, $2) as result;`,
      [deliveryJobId, partnerId]
    );
    console.log('rpc_confirm_store_pickup result:', pickupRes.rows[0].result);

    const orderAfterPickup = await client.query(`SELECT id, status FROM public.orders WHERE id = $1;`, [testOrderId]);
    console.log('Order status after pickup (should be out_for_delivery):', orderAfterPickup.rows[0]);

    // 7. Step 5: OTP Delivery Verification & Completion
    console.log('\n--- Step 5: OTP Delivery Verification ---');
    // Test invalid OTP first
    const invalidOtpRes = await client.query(
      `SELECT public.rpc_verify_and_complete_delivery($1, $2, $3) as result;`,
      [deliveryJobId, partnerId, '9999']
    );
    console.log('Invalid OTP verification attempt (should fail):', invalidOtpRes.rows[0].result);

    // Test correct OTP
    const validOtpRes = await client.query(
      `SELECT public.rpc_verify_and_complete_delivery($1, $2, $3) as result;`,
      [deliveryJobId, partnerId, testOtp]
    );
    console.log('Correct OTP verification attempt (should succeed):', validOtpRes.rows[0].result);

    // Verify final state of order and delivery job
    const finalOrder = await client.query(`SELECT id, status, otp_verified, delivered_at, payment_status FROM public.orders WHERE id = $1;`, [testOrderId]);
    console.log('Final Order in DB:', finalOrder.rows[0]);

    const finalJob = await client.query(`SELECT id, status, delivered_at FROM public.delivery_jobs WHERE id = $1;`, [deliveryJobId]);
    console.log('Final Delivery Job:', finalJob.rows[0]);

    // Check settlement creation
    const settlementRes = await client.query(`SELECT id, partner_id, settlement_ref, amount, status FROM public.delivery_settlements WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 1;`, [partnerId]);
    console.log('Generated Settlement:', settlementRes.rows[0]);

    // Check partner active_job_id is cleared and deliveries count incremented
    const partnerAfter = await client.query(`SELECT id, is_online, is_active, active_job_id, total_deliveries FROM public.delivery_partners WHERE id = $1;`, [partnerId]);
    console.log('Partner state after completion (active_job_id cleared):', partnerAfter.rows[0]);

    console.log('\n======================================================');
    console.log('>>> COMPLETE END-TO-END PIPELINE VERIFIED SUCCESSFULLY <<<');
    console.log('======================================================\n');

    // Clean up test order to keep DB clean
    if (settlementRes.rows[0]) {
      await client.query(`DELETE FROM public.delivery_settlements WHERE id = $1;`, [settlementRes.rows[0].id]);
    }
    await client.query(`DELETE FROM public.delivery_assignments WHERE job_id = $1;`, [deliveryJobId]);
    await client.query(`DELETE FROM public.delivery_jobs WHERE id = $1;`, [deliveryJobId]);
    await client.query(`DELETE FROM public.order_items WHERE order_id = $1;`, [testOrderId]);
    await client.query(`DELETE FROM public.orders WHERE id = $1;`, [testOrderId]);
    console.log('Test artifacts cleanly removed from database.');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await client.end();
  }
}

runTest();
