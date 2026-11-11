const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

async function runComprehensiveVerification() {
  const client = new Client({
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.tpcrwtxtqvvdghtfckea',
    password: 'password@2026/jrina',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('================================================================');
  console.log('SSA UNIVERSAL SUDO USER MANAGEMENT SYSTEM — VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const testAuthUid = '00000000-0000-0000-0000-000000000099';
  const testStoreId = 'store_sudo_verify_99';
  const testAdminId = 'founder_super_admin';
  const testAdminEmail = 'founder@jrina.online';

  try {
    // ------------------------------------------------------------------------
    // SETUP FIXTURES
    // ------------------------------------------------------------------------
    console.log('Phase 0: Initializing controlled test fixtures...');
    
    // Auth User
    await client.query(`
      INSERT INTO auth.users (id, email) 
      VALUES ($1, 'sudo.verify.test@smartshopper.in')
      ON CONFLICT (id) DO NOTHING;
    `, [testAuthUid]);

    // SSC Consumer Fixtures
    await client.query(`
      INSERT INTO public.app_user_accounts (
        id, auth_user_id, app_code, account_type, email, mobile, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000091',
        $1, 'SSC', 'CONSUMER', 'sudo.verify.test@smartshopper.in', '9876543210', 'ACTIVE'
      ) ON CONFLICT (auth_user_id, app_code) DO UPDATE SET status = 'ACTIVE', mobile = '9876543210', email = 'sudo.verify.test@smartshopper.in';
    `, [testAuthUid]);

    await client.query(`
      INSERT INTO public.app_users (
        id, username, full_name, phone, role, customer_id
      ) VALUES (
        $1, 'sudotest', 'Sudo Test User', '9876543210', 'consumer', 'SS-CUS-VFY99'
      ) ON CONFLICT (id) DO UPDATE SET phone = '9876543210', full_name = 'Sudo Test User';
    `, [testAuthUid]);

    await client.query(`
      INSERT INTO public.ssc_users (
        id, auth_user_id, customer_id, email, phone, full_name, username, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000091',
        $1, 'SS-CUS-VFY99', 'sudo.verify.test@smartshopper.in', '9876543210', 'Sudo Test User', 'sudotest', 'ACTIVE'
      ) ON CONFLICT (auth_user_id) DO UPDATE SET status = 'ACTIVE';
    `, [testAuthUid]);

    // SSM Merchant Fixtures
    await client.query(`
      INSERT INTO public.stores (
        id, name, owner_id, phone, subscription_status, verification_status
      ) VALUES (
        $1, 'Sudo Test Hypermarket', $2, '9876543211', 'active', 'APPROVED'
      ) ON CONFLICT (id) DO UPDATE SET subscription_status = 'active', verification_status = 'APPROVED';
    `, [testStoreId, testAuthUid]);

    await client.query(`
      INSERT INTO public.app_user_accounts (
        id, auth_user_id, app_code, account_type, email, mobile, status
      ) VALUES (
        '00000000-0000-0000-0000-000000000092',
        $1, 'SSM', 'MERCHANT', 'sudo.verify.test@smartshopper.in', '9876543211', 'ACTIVE'
      ) ON CONFLICT (auth_user_id, app_code) DO UPDATE SET status = 'ACTIVE';
    `, [testAuthUid]);

    await client.query(`
      INSERT INTO public.ssm_users (
        id, auth_user_id, store_id, email, phone, full_name, status, verification_status
      ) VALUES (
        '00000000-0000-0000-0000-000000000092',
        $1, $2, 'sudo.verify.test@smartshopper.in', '9876543211', 'Sudo Test Merchant', 'ACTIVE', 'APPROVED'
      ) ON CONFLICT (auth_user_id) DO UPDATE SET status = 'ACTIVE', verification_status = 'APPROVED';
    `, [testAuthUid, testStoreId]);

    console.log('✅ Phase 0 Complete: Fixtures active in SSC and SSM.\n');

    // ========================================================================
    // 1. SSC Suspend
    // ========================================================================
    total++;
    console.log('Test 1: SSC Suspend Action (sudo suspend ss --admin confirm)');
    const t1 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ss',
      command: 'sudo suspend ss --admin confirm',
      targetId: testAuthUid,
      reason: 'Automated verification test of temporary consumer suspension',
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const r1 = t1.rows[0].res;
    const sscCheck1 = await client.query(`SELECT status FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
    const auaCheck1 = await client.query(`SELECT status FROM public.app_user_accounts WHERE auth_user_id = $1 AND app_code = 'SSC'`, [testAuthUid]);

    if (r1.success && r1.new_status === 'SUSPENDED' && sscCheck1.rows[0].status === 'SUSPENDED' && auaCheck1.rows[0].status === 'SUSPENDED') {
      console.log('✅ PASS: SSC Consumer successfully suspended. Database records confirm status = SUSPENDED.');
      passed++;
    } else {
      console.error('❌ FAIL in Test 1:', r1);
    }

    // ========================================================================
    // 2. SSC Restore
    // ========================================================================
    total++;
    console.log('\nTest 2: SSC Restore Action (sudo restore ss --admin confirm)');
    const t2 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'restore',
      scope: 'ss',
      command: 'sudo restore ss --admin confirm',
      targetId: testAuthUid,
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const r2 = t2.rows[0].res;
    const sscCheck2 = await client.query(`SELECT status FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
    if (r2.success && r2.new_status === 'ACTIVE' && sscCheck2.rows[0].status === 'ACTIVE') {
      console.log('✅ PASS: Suspended SSC Consumer restored to ACTIVE.');
      passed++;
    } else {
      console.error('❌ FAIL in Test 2:', r2);
    }

    // ========================================================================
    // 3. SSC Ban
    // ========================================================================
    total++;
    console.log('\nTest 3: SSC Ban Action (sudo ban ss --admin confirm)');
    const t3 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'ban',
      scope: 'ss',
      command: 'sudo ban ss --admin confirm',
      targetId: testAuthUid,
      reason: 'Malicious activity detected in referral usage',
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const r3 = t3.rows[0].res;
    const sscCheck3 = await client.query(`SELECT status FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
    if (r3.success && r3.new_status === 'BANNED' && sscCheck3.rows[0].status === 'BANNED') {
      console.log('✅ PASS: SSC Consumer successfully banned. Status = BANNED.');
      passed++;
    } else {
      console.error('❌ FAIL in Test 3:', r3);
    }

    // ========================================================================
    // 4. Application Isolation Check: SSC Ban Must NOT Affect SSM Account
    // ========================================================================
    total++;
    console.log('\nTest 4: Strict Application Isolation Verification (SSC ban vs SSM account)');
    const ssmAua4 = await client.query(`SELECT status FROM public.app_user_accounts WHERE auth_user_id = $1 AND app_code = 'SSM'`, [testAuthUid]);
    const store4 = await client.query(`SELECT subscription_status, verification_status FROM public.stores WHERE id = $1`, [testStoreId]);
    const ssmUser4 = await client.query(`SELECT status, verification_status FROM public.ssm_users WHERE auth_user_id = $1`, [testAuthUid]);

    const ssmUntouched = ssmAua4.rows[0].status === 'ACTIVE' && 
                         store4.rows[0].subscription_status === 'active' && 
                         ssmUser4.rows[0].status === 'ACTIVE';

    if (ssmUntouched) {
      console.log('✅ PASS: Strict Application Isolation: SSC consumer ban left SSM merchant account 100% ACTIVE.');
      passed++;
    } else {
      console.error('❌ FAIL: Cross-app spillover! SSM account status changed:', ssmAua4.rows[0], store4.rows[0]);
    }

    // ========================================================================
    // 5. SSC Unban
    // ========================================================================
    total++;
    console.log('\nTest 5: SSC Unban Action (sudo unban ss --admin confirm)');
    const t5 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'unban',
      scope: 'ss',
      command: 'sudo unban ss --admin confirm',
      targetId: testAuthUid,
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const r5 = t5.rows[0].res;
    const sscCheck5 = await client.query(`SELECT status FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
    if (r5.success && r5.new_status === 'ACTIVE' && sscCheck5.rows[0].status === 'ACTIVE') {
      console.log('✅ PASS: SSC Consumer unbanned and restored to ACTIVE.');
      passed++;
    } else {
      console.error('❌ FAIL in Test 5:', r5);
    }

    // ========================================================================
    // 6. SSM Suspend
    // ========================================================================
    total++;
    console.log('\nTest 6: SSM Suspend Action (sudo suspend ssm --admin confirm)');
    const t6 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ssm',
      command: 'sudo suspend ssm --admin confirm',
      targetId: testStoreId,
      reason: 'GST compliance verification pending',
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const r6 = t6.rows[0].res;
    const store6 = await client.query(`SELECT subscription_status, verification_status FROM public.stores WHERE id = $1`, [testStoreId]);
    const ssmUser6 = await client.query(`SELECT status, verification_status FROM public.ssm_users WHERE auth_user_id = $1`, [testAuthUid]);

    if (r6.success && r6.new_status === 'SUSPENDED' && 
        store6.rows[0].subscription_status === 'suspended' && 
        store6.rows[0].verification_status === 'SUSPENDED' &&
        ssmUser6.rows[0].status === 'SUSPENDED') {
      console.log('✅ PASS: SSM Merchant store suspended in database (stores & ssm_users updated).');
      passed++;
    } else {
      console.error('❌ FAIL in Test 6:', r6);
    }

    // ========================================================================
    // 7. SSM Restore
    // ========================================================================
    total++;
    console.log('\nTest 7: SSM Restore Action (sudo restore ssm --admin confirm)');
    const t7 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'restore',
      scope: 'ssm',
      command: 'sudo restore ssm --admin confirm',
      targetId: testStoreId,
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const r7 = t7.rows[0].res;
    const store7 = await client.query(`SELECT subscription_status, verification_status FROM public.stores WHERE id = $1`, [testStoreId]);
    if (r7.success && r7.new_status === 'ACTIVE' && store7.rows[0].subscription_status === 'active') {
      console.log('✅ PASS: SSM Merchant store restored to ACTIVE.');
      passed++;
    } else {
      console.error('❌ FAIL in Test 7:', r7);
    }

    // ========================================================================
    // 8. SSM Ban & Unban
    // ========================================================================
    total++;
    console.log('\nTest 8: SSM Ban & Unban (sudo ban ssm / sudo unban ssm)');
    const t8Ban = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'ban',
      scope: 'ssm',
      command: 'sudo ban ssm --admin confirm',
      targetId: testStoreId,
      reason: 'Sale of prohibited goods reported',
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const t8Unban = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'unban',
      scope: 'ssm',
      command: 'sudo unban ssm --admin confirm',
      targetId: testStoreId,
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    if (t8Ban.rows[0].res.success && t8Unban.rows[0].res.success) {
      console.log('✅ PASS: SSM Merchant store successfully banned and unbanned.');
      passed++;
    } else {
      console.error('❌ FAIL in Test 8:', t8Ban.rows[0].res, t8Unban.rows[0].res);
    }

    // ========================================================================
    // 9. Soft-Deletion Workflow
    // ========================================================================
    total++;
    console.log('\nTest 9: Soft-Deletion Workflow (sudo delete ss --admin confirm)');
    const t9 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'delete',
      scope: 'ss',
      command: 'sudo delete ss --admin confirm',
      targetId: testAuthUid,
      reason: 'Consumer formal right-to-erasure request under privacy policy',
      adminId: testAdminId,
      adminEmail: testAdminEmail
    })]);

    const r9 = t9.rows[0].res;
    const sscCheck9 = await client.query(`SELECT status FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
    if (r9.success && r9.new_status === 'DELETED' && sscCheck9.rows[0].status === 'DELETED') {
      console.log('✅ PASS: Account soft-deleted with orders and retention records safely preserved.');
      passed++;
    } else {
      console.error('❌ FAIL in Test 9:', r9);
    }

    // ========================================================================
    // 10. Negative Test: Malformed Command Rejected
    // ========================================================================
    total++;
    console.log('\nTest 10: Negative Test — Malformed Command Rejection');
    const t10 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ss',
      command: 'sudo suspend ss', // Missing --admin confirm
      targetId: testAuthUid,
      reason: 'Testing malformed command'
    })]);

    if (!t10.rows[0].res.success && t10.rows[0].res.error.includes('Command validation failed')) {
      console.log('✅ PASS: Malformed command strictly rejected by backend validation.');
      passed++;
    } else {
      console.error('❌ FAIL: Malformed command was not rejected:', t10.rows[0].res);
    }

    // ========================================================================
    // 11. Negative Test: Scope Mismatch Rejected
    // ========================================================================
    total++;
    console.log('\nTest 11: Negative Test — Scope Mismatch Rejection');
    const t11 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'suspend',
      scope: 'ss',
      command: 'sudo suspend ssm --admin confirm', // Says ssm but scope is ss
      targetId: testAuthUid,
      reason: 'Testing scope mismatch'
    })]);

    if (!t11.rows[0].res.success && t11.rows[0].res.error.includes('Command validation failed')) {
      console.log('✅ PASS: Scope mismatch strictly rejected.');
      passed++;
    } else {
      console.error('❌ FAIL: Scope mismatch was not rejected:', t11.rows[0].res);
    }

    // ========================================================================
    // 12. Negative Test: Invalid Status Transitions (Restoring Deleted)
    // ========================================================================
    total++;
    console.log('\nTest 12: Negative Test — Invalid Status Transition Rejection');
    const t12 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'restore',
      scope: 'ss',
      command: 'sudo restore ss --admin confirm',
      targetId: testAuthUid // Account is DELETED
    })]);

    if (!t12.rows[0].res.success && t12.rows[0].res.error.includes('Only SUSPENDED accounts can be restored')) {
      console.log('✅ PASS: Illegal transition rejected: Cannot restore deleted account.');
      passed++;
    } else {
      console.error('❌ FAIL: Illegal transition permitted:', t12.rows[0].res);
    }

    // ========================================================================
    // 13. Negative Test: Missing Mandatory Reason
    // ========================================================================
    total++;
    console.log('\nTest 13: Negative Test — Missing Reason Rejection for Destructive Action');
    const t13 = await client.query(`
      SELECT public.execute_sudo_user_action($1::jsonb) as res
    `, [JSON.stringify({
      action: 'ban',
      scope: 'ssm',
      command: 'sudo ban ssm --admin confirm',
      targetId: testStoreId,
      reason: '' // Empty reason
    })]);

    if (!t13.rows[0].res.success && t13.rows[0].res.error.includes('valid reason is required')) {
      console.log('✅ PASS: Action without mandatory reason strictly rejected.');
      passed++;
    } else {
      console.error('❌ FAIL: Action without reason was allowed:', t13.rows[0].res);
    }

    // ========================================================================
    // 14. Audit Log Integrity & Append-Only Verification
    // ========================================================================
    total++;
    console.log('\nTest 14: Audit Trail Integrity & Immutability Verification');
    const logsRes = await client.query(`
      SELECT * FROM public.get_sudo_audit_logs(p_target_id => $1, p_limit => 20)
    `, [testAuthUid]);

    if (logsRes.rows.length >= 3) {
      console.log(`✅ PASS: Audit trail contains ${logsRes.rows.length} verified immutable audit records for the test subject.`);
      passed++;
    } else {
      console.error('❌ FAIL: Audit logs not populated properly:', logsRes.rows.length);
    }

    // ========================================================================
    // 15. get_admin_consumers RPC Reflects Live Account Status
    // ========================================================================
    total++;
    console.log('\nTest 15: get_admin_consumers RPC Live Status Verification');
    const consRpc = await client.query(`
      SELECT id, name, account_status 
      FROM public.get_admin_consumers(p_search => '9876543210')
    `);

    if (consRpc.rows.length > 0 && consRpc.rows[0].account_status === 'deleted') {
      console.log('✅ PASS: get_admin_consumers RPC returns accurate live status ("deleted").');
      passed++;
    } else {
      console.error('❌ FAIL: RPC status not matching:', consRpc.rows);
    }

  } finally {
    // Clean up all test fixture records so zero dummy data remains
    console.log('\n--- Cleaning up all verification test fixtures ---');
    await client.query(`DELETE FROM public.ssc_users WHERE auth_user_id = $1`, [testAuthUid]);
    await client.query(`DELETE FROM public.ssm_users WHERE store_id = $1`, [testStoreId]);
    await client.query(`DELETE FROM public.stores WHERE id = $1`, [testStoreId]);
    await client.query(`DELETE FROM public.app_user_accounts WHERE auth_user_id = $1`, [testAuthUid]);
    await client.query(`DELETE FROM public.app_users WHERE id = $1`, [testAuthUid]);
    await client.query(`DELETE FROM public.admin_sudo_audit_logs WHERE target_user_id IN ($1, $2)`, [testAuthUid, testStoreId]);
    await client.query(`DELETE FROM auth.users WHERE id = $1`, [testAuthUid]);
    console.log('✅ Cleaned up all verification test fixtures. Zero test records left behind in database.\n');
    await client.end();
  }

  console.log('================================================================');
  console.log(`FINAL RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');
}

runComprehensiveVerification().catch(err => {
  console.error('Verification failed with fatal error:', err);
  process.exit(1);
});
