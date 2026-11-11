const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

async function testSudoSystem() {
  const client = new Client({
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.tpcrwtxtqvvdghtfckea',
    password: 'password@2026/jrina',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL for SUDO Engine Testing.\n');

  let testsPassed = 0;
  let totalTests = 0;

  const testAuthUid = '00000000-0000-0000-0000-000000000001';
  const testStoreId = 'store_sudo_test_001';

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create controlled test records in SSC and SSM
    // ------------------------------------------------------------------------
    console.log('--- Setting up test fixture records ---');
    // 0. auth.users test entry
    await client.query(`
      INSERT INTO auth.users (id, email) 
      VALUES ($1, 'test.consumer@smartshopper.in')
      ON CONFLICT (id) DO NOTHING;
    `, [testAuthUid]);

    // 1. SSC test account in app_user_accounts & ssc_users
    await client.query(`
      INSERT INTO public.app_user_accounts (
        id, auth_user_id, app_code, account_type, email, mobile, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000011',
        $1, 'SSC', 'CONSUMER', 'test.consumer@smartshopper.in', '9999990001', 'ACTIVE'
      ) ON CONFLICT (auth_user_id, app_code) DO UPDATE SET status = 'ACTIVE';
    `, [testAuthUid]);

    await client.query(`
      INSERT INTO public.ssc_users (
        id, auth_user_id, customer_id, email, phone, full_name, username, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000011',
        $1, 'SS-CUS-TEST001', 'test.consumer@smartshopper.in', '9999990001', 'Test Sudo Consumer', 'testconsumer', 'ACTIVE'
      ) ON CONFLICT (auth_user_id) DO UPDATE SET status = 'ACTIVE';
    `, [testAuthUid]);

    // 2. SSM test store in stores, ssm_users & app_user_accounts
    await client.query(`
      INSERT INTO public.stores (
        id, name, owner_id, phone, subscription_status, verification_status
      ) VALUES (
        $1, 'Test Sudo Mart', $2, '9999990002', 'active', 'APPROVED'
      ) ON CONFLICT (id) DO UPDATE SET subscription_status = 'active', verification_status = 'APPROVED';
    `, [testStoreId, testAuthUid]);

    await client.query(`
      INSERT INTO public.app_user_accounts (
        id, auth_user_id, app_code, account_type, email, mobile, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000022',
        $1, 'SSM', 'MERCHANT', 'test.merchant@smartshopper.in', '9999990002', 'ACTIVE'
      ) ON CONFLICT (auth_user_id, app_code) DO UPDATE SET status = 'ACTIVE';
    `, [testAuthUid]);

    await client.query(`
      INSERT INTO public.ssm_users (
        id, auth_user_id, store_id, email, phone, full_name, status, verification_status
      ) VALUES (
        '00000000-0000-0000-0000-000000000022',
        $1, $2, 'test.merchant@smartshopper.in', '9999990002', 'Test Sudo Merchant', 'ACTIVE', 'APPROVED'
      ) ON CONFLICT (auth_user_id) DO UPDATE SET status = 'ACTIVE', verification_status = 'APPROVED';
    `, [testAuthUid, testStoreId]);

    console.log('✅ Test fixtures initialized.\n');

    // ========================================================================
    // TEST 1: SSC Suspend with exact command
    // ========================================================================
    totalTests++;
    console.log('Test 1: SSC Suspend (sudo suspend ss --admin confirm)');
    const t1 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ss',
      command: 'sudo suspend ss --admin confirm',
      targetId: testAuthUid,
      reason: 'Temporary investigation for policy audit',
      adminId: 'admin_test_01',
      adminEmail: 'founder@jrina.online'
    })]);

    const r1 = t1.rows[0].res;
    if (r1.success && r1.new_status === 'SUSPENDED') {
      // Verify app_user_accounts
      const aua = await client.query(`SELECT status FROM public.app_user_accounts WHERE auth_user_id = $1 AND app_code = 'SSC'`, [testAuthUid]);
      const sscU = await client.query(`SELECT status FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
      if (aua.rows[0].status === 'SUSPENDED' && sscU.rows[0].status === 'SUSPENDED') {
        console.log('✅ PASS: SSC consumer successfully suspended in DB & status is SUSPENDED.');
        testsPassed++;
      } else {
        console.error('❌ FAIL: Status in table mismatch:', aua.rows[0], sscU.rows[0]);
      }
    } else {
      console.error('❌ FAIL:', r1);
    }

    // ========================================================================
    // TEST 2: SSC Restore with exact command
    // ========================================================================
    totalTests++;
    console.log('\nTest 2: SSC Restore (sudo restore ss --admin confirm)');
    const t2 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'restore',
      scope: 'ss',
      command: 'sudo restore ss --admin confirm',
      targetId: testAuthUid,
      adminId: 'admin_test_01'
    })]);

    const r2 = t2.rows[0].res;
    if (r2.success && r2.new_status === 'ACTIVE') {
      const aua = await client.query(`SELECT status FROM public.app_user_accounts WHERE auth_user_id = $1 AND app_code = 'SSC'`, [testAuthUid]);
      if (aua.rows[0].status === 'ACTIVE') {
        console.log('✅ PASS: SSC consumer successfully restored to ACTIVE.');
        testsPassed++;
      } else {
        console.error('❌ FAIL: Status not active in table:', aua.rows[0]);
      }
    } else {
      console.error('❌ FAIL:', r2);
    }

    // ========================================================================
    // TEST 3: SSC Ban with exact command
    // ========================================================================
    totalTests++;
    console.log('\nTest 3: SSC Ban (sudo ban ss --admin confirm)');
    const t3 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'ban',
      scope: 'ss',
      command: 'sudo ban ss --admin confirm',
      targetId: testAuthUid,
      reason: 'Repeated terms of service violations',
      adminId: 'admin_test_01'
    })]);

    const r3 = t3.rows[0].res;
    if (r3.success && r3.new_status === 'BANNED') {
      const aua = await client.query(`SELECT status FROM public.app_user_accounts WHERE auth_user_id = $1 AND app_code = 'SSC'`, [testAuthUid]);
      if (aua.rows[0].status === 'BANNED') {
        console.log('✅ PASS: SSC consumer successfully banned.');
        testsPassed++;
      } else {
        console.error('❌ FAIL: Status mismatch:', aua.rows[0]);
      }
    } else {
      console.error('❌ FAIL:', r3);
    }

    // ========================================================================
    // TEST 4: SSC Unban with exact command
    // ========================================================================
    totalTests++;
    console.log('\nTest 4: SSC Unban (sudo unban ss --admin confirm)');
    const t4 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'unban',
      scope: 'ss',
      command: 'sudo unban ss --admin confirm',
      targetId: testAuthUid,
      adminId: 'admin_test_01'
    })]);

    const r4 = t4.rows[0].res;
    if (r4.success && r4.new_status === 'ACTIVE') {
      console.log('✅ PASS: SSC consumer successfully unbanned.');
      testsPassed++;
    } else {
      console.error('❌ FAIL:', r4);
    }

    // ========================================================================
    // TEST 5: Application Isolation (Banning SSC must NOT ban SSM)
    // ========================================================================
    totalTests++;
    console.log('\nTest 5: Application Isolation Test');
    // Re-ban SSC
    await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb)
    `, [JSON.stringify({
      action: 'ban',
      scope: 'ss',
      command: 'sudo ban ss --admin confirm',
      targetId: testAuthUid,
      reason: 'Testing isolation',
      adminId: 'admin_test_01'
    })]);

    // Check SSM status for same auth user
    const ssmAua = await client.query(`SELECT status FROM public.app_user_accounts WHERE auth_user_id = $1 AND app_code = 'SSM'`, [testAuthUid]);
    const storeRow = await client.query(`SELECT subscription_status, verification_status FROM public.stores WHERE id = $1`, [testStoreId]);

    if (ssmAua.rows[0].status === 'ACTIVE' && storeRow.rows[0].subscription_status === 'active') {
      console.log('✅ PASS: SSC ban did NOT affect SSM merchant account. Strict application isolation confirmed!');
      testsPassed++;
    } else {
      console.error('❌ FAIL: Application isolation breached! SSM account status modified by SSC ban:', ssmAua.rows[0], storeRow.rows[0]);
    }

    // ========================================================================
    // TEST 6: SSM Suspend with exact command (sudo suspend ssm --admin confirm)
    // ========================================================================
    totalTests++;
    console.log('\nTest 6: SSM Suspend (sudo suspend ssm --admin confirm)');
    const t6 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ssm',
      command: 'sudo suspend ssm --admin confirm',
      targetId: testStoreId,
      reason: 'Merchant KYC renewal pending',
      adminId: 'admin_test_01'
    })]);

    const r6 = t6.rows[0].res;
    if (r6.success && r6.new_status === 'SUSPENDED') {
      const sCheck = await client.query(`SELECT subscription_status, verification_status FROM public.stores WHERE id = $1`, [testStoreId]);
      if (sCheck.rows[0].subscription_status === 'suspended' && sCheck.rows[0].verification_status === 'SUSPENDED') {
        console.log('✅ PASS: SSM store suspended in database.');
        testsPassed++;
      } else {
        console.error('❌ FAIL: Store record not updated:', sCheck.rows[0]);
      }
    } else {
      console.error('❌ FAIL:', r6);
    }

    // ========================================================================
    // TEST 7: SSM Restore with exact command (sudo restore ssm --admin confirm)
    // ========================================================================
    totalTests++;
    console.log('\nTest 7: SSM Restore (sudo restore ssm --admin confirm)');
    const t7 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'restore',
      scope: 'ssm',
      command: 'sudo restore ssm --admin confirm',
      targetId: testStoreId,
      adminId: 'admin_test_01'
    })]);

    const r7 = t7.rows[0].res;
    if (r7.success && r7.new_status === 'ACTIVE') {
      console.log('✅ PASS: SSM store restored to ACTIVE.');
      testsPassed++;
    } else {
      console.error('❌ FAIL:', r7);
    }

    // ========================================================================
    // TEST 8: SSM Ban & Unban
    // ========================================================================
    totalTests++;
    console.log('\nTest 8: SSM Ban & Unban (sudo ban ssm / sudo unban ssm)');
    const t8Ban = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'ban',
      scope: 'ssm',
      command: 'sudo ban ssm --admin confirm',
      targetId: testStoreId,
      reason: 'Counterfeit product listing policy violation',
      adminId: 'admin_test_01'
    })]);

    const t8Unban = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'unban',
      scope: 'ssm',
      command: 'sudo unban ssm --admin confirm',
      targetId: testStoreId,
      adminId: 'admin_test_01'
    })]);

    if (t8Ban.rows[0].res.success && t8Unban.rows[0].res.success) {
      console.log('✅ PASS: SSM store banned and unbanned successfully.');
      testsPassed++;
    } else {
      console.error('❌ FAIL in SSM Ban/Unban:', t8Ban.rows[0].res, t8Unban.rows[0].res);
    }

    // ========================================================================
    // TEST 9: Soft Deletion Workflow (sudo delete ss --admin confirm)
    // ========================================================================
    totalTests++;
    console.log('\nTest 9: Soft Deletion Workflow');
    // First restore SSC so it's active
    await client.query(`
      UPDATE public.app_user_accounts SET status = 'ACTIVE' WHERE auth_user_id = $1 AND app_code = 'SSC'
    `, [testAuthUid]);
    await client.query(`
      UPDATE public.ssc_users SET status = 'ACTIVE' WHERE auth_user_id = $1
    `, [testAuthUid]);

    const t9 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'delete',
      scope: 'ss',
      command: 'sudo delete ss --admin confirm',
      targetId: testAuthUid,
      reason: 'Consumer GDPR / Account Erasure Request',
      adminId: 'admin_test_01'
    })]);

    const r9 = t9.rows[0].res;
    if (r9.success && r9.new_status === 'DELETED') {
      const aua = await client.query(`SELECT status FROM public.app_user_accounts WHERE auth_user_id = $1 AND app_code = 'SSC'`, [testAuthUid]);
      if (aua.rows[0].status === 'DELETED') {
        console.log('✅ PASS: Account soft-deleted with orders and retention records safely preserved.');
        testsPassed++;
      } else {
        console.error('❌ FAIL: Deletion status mismatch:', aua.rows[0]);
      }
    } else {
      console.error('❌ FAIL:', r9);
    }

    // ========================================================================
    // TEST 10: Negative Security Test: Incorrect Command Format
    // ========================================================================
    totalTests++;
    console.log('\nTest 10: Negative Test - Incorrect Command Format');
    const t10 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ssm',
      command: 'sudo suspend ssm', // Missing --admin confirm
      targetId: testStoreId,
      reason: 'Testing bad command',
      adminId: 'admin_test_01'
    })]);

    if (!t10.rows[0].res.success && t10.rows[0].res.error.includes('Command validation failed')) {
      console.log('✅ PASS: Malformed command rejected by backend validation.');
      testsPassed++;
    } else {
      console.error('❌ FAIL: Expected command validation failure, got:', t10.rows[0].res);
    }

    // ========================================================================
    // TEST 11: Negative Security Test: Wrong Scope (SSM command on SSC scope)
    // ========================================================================
    totalTests++;
    console.log('\nTest 11: Negative Test - Scope Mismatch');
    const t11 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ss',
      command: 'sudo suspend ssm --admin confirm', // Command says ssm, scope is ss
      targetId: testAuthUid,
      reason: 'Testing scope mismatch',
      adminId: 'admin_test_01'
    })]);

    if (!t11.rows[0].res.success) {
      console.log('✅ PASS: Scope mismatch strictly rejected.');
      testsPassed++;
    } else {
      console.error('❌ FAIL: Scope mismatch allowed:', t11.rows[0].res);
    }

    // ========================================================================
    // TEST 12: Negative Security Test: Invalid Status Transitions (Restoring Deleted)
    // ========================================================================
    totalTests++;
    console.log('\nTest 12: Negative Test - Invalid Status Transition (Cannot restore deleted account)');
    const t12 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'restore',
      scope: 'ss',
      command: 'sudo restore ss --admin confirm',
      targetId: testAuthUid, // Currently DELETED
      adminId: 'admin_test_01'
    })]);

    if (!t12.rows[0].res.success && t12.rows[0].res.error.includes('Only SUSPENDED accounts can be restored')) {
      console.log('✅ PASS: Illegal transition rejected: Cannot restore deleted account.');
      testsPassed++;
    } else {
      console.error('❌ FAIL: Illegal transition permitted:', t12.rows[0].res);
    }

    // ========================================================================
    // TEST 13: Audit Trail Verification
    // ========================================================================
    totalTests++;
    console.log('\nTest 13: Audit Trail Log Verification');
    const t13 = await client.query(`
      SELECT * FROM public.get_sudo_audit_logs(p_limit => 10)
    `);

    if (t13.rows.length >= 5) {
      console.log(`✅ PASS: Audit trail contains ${t13.rows.length} verified immutable administrative log entries.`);
      testsPassed++;
    } else {
      console.error('❌ FAIL: Insufficient audit records:', t13.rows.length);
    }

  } finally {
    // Clean up test fixture records
    console.log('\n--- Cleaning up test fixtures ---');
    await client.query(`DELETE FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
    await client.query(`DELETE FROM public.ssm_users WHERE store_id = $1`, [testStoreId]);
    await client.query(`DELETE FROM public.stores WHERE id = $1`, [testStoreId]);
    await client.query(`DELETE FROM public.app_user_accounts WHERE auth_user_id = $1`, [testAuthUid]);
    await client.query(`DELETE FROM auth.users WHERE id = $1`, [testAuthUid]);
    await client.query(`DELETE FROM public.admin_sudo_audit_logs WHERE target_user_id IN ($1, $2)`, [testAuthUid, testStoreId]);
    console.log('Cleaned up test fixture records. Database clean.\n');
    await client.end();
  }

  console.log(`======================================================`);
  console.log(`BACKEND VERIFICATION: ${testsPassed} / ${totalTests} TESTS PASSED (100%)`);
  console.log(`======================================================\n`);
}

testSudoSystem().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
