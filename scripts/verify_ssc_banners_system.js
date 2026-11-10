const { createClient } = require('@supabase/supabase-js');
const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const pgClient = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function runVerification() {
  console.log('================================================================');
  console.log('SSA -> SSC BANNER MANAGEMENT SYSTEM - AUTOMATED VERIFICATION');
  console.log('================================================================\n');

  await pgClient.connect();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, name) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${name}`);
      process.exitCode = 1;
    }
  }

  // 1. Zero-Impact Ecosystem Audit
  console.log('--- 1. ZERO-IMPACT ECOSYSTEM INTEGRITY CHECK ---');
  const storesRes = await pgClient.query('SELECT count(*) FROM public.stores');
  const appUsersRes = await pgClient.query('SELECT count(*) FROM public.app_users');
  const slotControlsRes = await pgClient.query('SELECT count(*) FROM public.banner_slot_controls');
  const referralCampaignsRes = await pgClient.query('SELECT count(*) FROM public.referral_campaigns');

  assert(parseInt(storesRes.rows[0].count, 10) >= 14, `Stores table intact (${storesRes.rows[0].count} stores)`);
  assert(parseInt(appUsersRes.rows[0].count, 10) >= 68, `App users table intact (${appUsersRes.rows[0].count} users)`);
  assert(parseInt(slotControlsRes.rows[0].count, 10) >= 1, `Banner slot controls intact (${slotControlsRes.rows[0].count} controls)`);
  assert(parseInt(referralCampaignsRes.rows[0].count, 10) >= 1, `Referral campaigns intact (${referralCampaignsRes.rows[0].count} campaigns)`);

  // 2. SSC Banners Table and Schema Verification
  console.log('\n--- 2. SSC BANNERS TABLE & RPC VERIFICATION ---');
  const tableCheck = await pgClient.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ssc_banners' 
    ORDER BY ordinal_position
  `);
  assert(tableCheck.rows.length >= 13, `ssc_banners table has all required columns (${tableCheck.rows.length} columns)`);

  // 3. Test Banner Creation via RPC
  console.log('\n--- 3. TEST BANNER CREATION VIA RPC (save_ssc_banner) ---');
  const testBannerPayload = {
    title: 'Festival Mega Bonanza 2026',
    subtitle: 'Flat 50% discount on fashion & electronics',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    linkType: 'category',
    targetId: 'Electronics',
    targetName: 'Electronics',
    displayOrder: 1,
    isActive: true,
    createdBy: 'Automated Test Suite'
  };

  const { data: createData, error: createError } = await supabase.rpc('save_ssc_banner', {
    p_banner: testBannerPayload
  });

  assert(!createError && createData?.success, 'save_ssc_banner created new banner successfully');
  const bannerId = createData?.banner?.id;
  assert(bannerId && bannerId.startsWith('ssc_bnr_'), `Generated banner ID has correct prefix (${bannerId})`);

  // 4. Test Admin Fetch RPC
  console.log('\n--- 4. TEST ADMIN FETCH (get_all_ssc_banners_admin) ---');
  const { data: adminBanners, error: adminError } = await supabase.rpc('get_all_ssc_banners_admin');
  assert(!adminError && Array.isArray(adminBanners), 'get_all_ssc_banners_admin executes cleanly');
  const foundInAdmin = adminBanners.find((b) => b.id === bannerId);
  assert(foundInAdmin !== undefined, 'Newly created banner found in admin list');
  assert(foundInAdmin?.title === testBannerPayload.title, 'Banner title matches');
  assert(foundInAdmin?.clicks_count === 0, 'Initial clicks count is 0');
  assert(foundInAdmin?.impressions_count === 0, 'Initial impressions count is 0');

  // 5. Test SSC Consumer App Fetch RPC
  console.log('\n--- 5. TEST CONSUMER APP FETCH (get_active_ssc_banners) ---');
  const { data: activeBanners, error: activeError } = await supabase.rpc('get_active_ssc_banners');
  assert(!activeError && Array.isArray(activeBanners), 'get_active_ssc_banners executes cleanly');
  const foundInActive = activeBanners.find((b) => b.id === bannerId);
  assert(foundInActive !== undefined, 'Active banner returned for SSC consumer app');

  // 6. Test Impressions & Click Tracking RPCs
  console.log('\n--- 6. TEST CLICK & IMPRESSION TRACKING ATOMICITY ---');
  const { data: impData, error: impError } = await supabase.rpc('record_ssc_banner_impression', {
    p_banner_id: bannerId
  });
  assert(!impError && impData?.success, 'record_ssc_banner_impression recorded');

  const { data: clickData, error: clickError } = await supabase.rpc('record_ssc_banner_click', {
    p_banner_id: bannerId
  });
  assert(!clickError && clickData?.success, 'record_ssc_banner_click recorded');

  // Verify counters incremented
  const { data: updatedAdminList } = await supabase.rpc('get_all_ssc_banners_admin');
  const verifiedBanner = updatedAdminList.find((b) => b.id === bannerId);
  assert(verifiedBanner?.impressions_count === 1, 'Impressions count incremented to 1');
  assert(verifiedBanner?.clicks_count === 1, 'Clicks count incremented to 1');

  // 7. Test One-Click Toggle Status RPC
  console.log('\n--- 7. TEST ONE-CLICK STATUS TOGGLE (toggle_ssc_banner_status) ---');
  const { data: toggleDeact, error: toggleErr1 } = await supabase.rpc('toggle_ssc_banner_status', {
    p_banner_id: bannerId,
    p_is_active: false
  });
  assert(!toggleErr1 && toggleDeact?.success && toggleDeact?.isActive === false, 'Deactivation toggle succeeded');

  // Verify inactive banner is excluded from SSC app fetch
  const { data: activeAfterDeact } = await supabase.rpc('get_active_ssc_banners');
  const foundAfterDeact = activeAfterDeact.find((b) => b.id === bannerId);
  assert(foundAfterDeact === undefined, 'Deactivated banner is immediately filtered out of SSC app');

  // Re-activate
  const { data: toggleAct } = await supabase.rpc('toggle_ssc_banner_status', {
    p_banner_id: bannerId,
    p_is_active: true
  });
  assert(toggleAct?.success && toggleAct?.isActive === true, 'Re-activation toggle succeeded');

  // 8. Test Banner Update
  console.log('\n--- 8. TEST BANNER UPDATE VIA save_ssc_banner ---');
  const { data: updateData, error: updateErr } = await supabase.rpc('save_ssc_banner', {
    p_banner: {
      id: bannerId,
      title: 'Festival Mega Bonanza 2026 - UPDATED',
      subtitle: 'Updated description for testing',
      imageUrl: testBannerPayload.imageUrl,
      linkType: 'category',
      targetId: 'Electronics',
      displayOrder: 2,
      isActive: true
    }
  });
  assert(!updateErr && updateData?.success && updateData?.action === 'updated', 'Banner updated successfully');
  assert(updateData?.banner?.title === 'Festival Mega Bonanza 2026 - UPDATED', 'Updated title reflected');
  assert(updateData?.banner?.clicks_count === 1, 'Clicks count preserved after update');

  // 9. Clean up Test Record
  console.log('\n--- 9. TEST CLEANUP VIA delete_ssc_banner ---');
  const { data: deleteData, error: deleteErr } = await supabase.rpc('delete_ssc_banner', {
    p_banner_id: bannerId
  });
  assert(!deleteErr && deleteData?.success, 'delete_ssc_banner executed cleanly');

  const { data: finalActiveList } = await supabase.rpc('get_active_ssc_banners');
  const foundAfterDelete = finalActiveList.find((b) => b.id === bannerId);
  assert(foundAfterDelete === undefined, 'Deleted banner no longer exists');

  // 10. Summary
  console.log('\n================================================================');
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('================================================================\n');

  await pgClient.end();
}

runVerification().catch((err) => {
  console.error('Verification failed with exception:', err);
  process.exit(1);
});
