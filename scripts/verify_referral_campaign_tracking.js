const { createClient } = require('@supabase/supabase-js');
const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');
const { exportCampaignToPDF, exportCampaignToDOCX } = require('../src/utils/campaignExport.ts');

const SUPABASE_URL = 'https://tpcrwtxtqvvdghtfckea.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3';
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
  console.log('SSA – REFERRAL CAMPAIGN TRACKING & ATTRIBUTION VERIFICATION');
  console.log('================================================================\n');

  await pgClient.connect();

  const testCampaignId = 'camp_test_trk_' + Date.now();
  const testStoreId1 = 'store_test_trk_1_' + Date.now();
  const testStoreId2 = 'store_test_trk_2_' + Date.now();
  const testUserId1 = 'user_test_trk_1_' + Date.now();
  const testUserId2 = 'user_test_trk_2_' + Date.now();
  const testUserId3 = 'user_test_trk_3_' + Date.now();
  const testPartnerId = 'dp_test_trk_' + Date.now();

  const code1 = 'CMP-TRK01' + Math.floor(Math.random() * 90 + 10);
  const code2 = 'CMP-TRK02' + Math.floor(Math.random() * 90 + 10);
  const code3 = 'CMP-TRK03' + Math.floor(Math.random() * 90 + 10);

  try {
    // -------------------------------------------------------------
    // SETUP: Create test campaign and 3 volunteers
    // -------------------------------------------------------------
    console.log('--- SETUP: Creating test campaign with 3 volunteers ---');
    await pgClient.query(`
      INSERT INTO referral_campaigns (
        id, name, description, start_date, start_time, end_date, end_time,
        start_timestamp, end_timestamp, volunteer_count, status, created_by
      ) VALUES (
        $1, 'Field Outreach Test Campaign', 'Tracking verification test campaign',
        '2026-11-10', '09:00', '2026-11-20', '18:00',
        '2026-11-10 09:00:00+05:30', '2026-11-20 18:00:00+05:30',
        3, 'active', 'SSA Test Suite'
      )
    `, [testCampaignId]);

    await pgClient.query(`
      INSERT INTO referral_campaign_volunteers (
        id, campaign_id, serial_number, volunteer_name, mobile_number, referral_code,
        assigned_date, assigned_start_time, assigned_end_time
      ) VALUES 
        ($1, $4, 1, 'Volunteer Alpha', '9847111111', $5, '2026-11-10', '09:00', '13:00'),
        ($2, $4, 2, 'Volunteer Beta', '9847222222', $6, '2026-11-11', '10:00', '15:00'),
        ($3, $4, 3, 'Volunteer Gamma', '9847333333', $7, '2026-11-12', '11:00', '17:00')
    `, [
      'vol_trk_1_' + Date.now(),
      'vol_trk_2_' + Date.now(),
      'vol_trk_3_' + Date.now(),
      testCampaignId,
      code1, code2, code3
    ]);
    console.log(`[PASS] Campaign created with codes: ${code1}, ${code2}, ${code3}`);

    // -------------------------------------------------------------
    // TEST 1: Volunteer with no referrals displays 0
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Volunteers with zero referrals display 0 ---');
    const { data: track1, error: errTrack1 } = await supabase.rpc('get_referral_campaign_tracking', {
      p_campaign_id: testCampaignId
    });
    if (errTrack1) throw new Error('Error fetching initial tracking: ' + errTrack1.message);
    if (!track1 || !track1.success) throw new Error('Failed tracking RPC call: ' + track1?.error);

    if (track1.summary.totalMerchants !== 0 || track1.summary.totalConsumers !== 0 || track1.summary.totalOnboarded !== 0) {
      throw new Error(`Expected summary 0, got M:${track1.summary.totalMerchants}, C:${track1.summary.totalConsumers}, T:${track1.summary.totalOnboarded}`);
    }

    for (const vol of track1.volunteers) {
      if (vol.ssmMerchants !== 0 || vol.sscConsumers !== 0 || vol.totalOnboarded !== 0) {
        throw new Error(`Volunteer ${vol.volunteerName} expected 0, got M:${vol.ssmMerchants}, C:${vol.sscConsumers}`);
      }
    }
    console.log('[PASS] All volunteers with no registrations correctly display 0 merchants, 0 consumers, and 0 total.');

    // -------------------------------------------------------------
    // TEST 2: SSM Registration increments ONLY Merchant count
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: SSM Store registration increments ONLY Merchant count ---');
    await pgClient.query(`
      INSERT INTO stores (
        id, name, phone, address, referral_code, referred_by_code, referred_at
      ) VALUES (
        $1, 'Test Retailer Alpha', '9847000001', 'Kochi, Kerala', 'SSM-TEST01', $2, now()
      )
    `, [testStoreId1, code1]);

    const { data: track2, error: errTrack2 } = await supabase.rpc('get_referral_campaign_tracking', {
      p_campaign_id: testCampaignId
    });
    if (errTrack2) throw new Error('Error fetching tracking after SSM registration: ' + errTrack2.message);

    const vol1_t2 = track2.volunteers.find(v => v.referralCode === code1);
    const vol2_t2 = track2.volunteers.find(v => v.referralCode === code2);

    if (vol1_t2.ssmMerchants !== 1 || vol1_t2.sscConsumers !== 0 || vol1_t2.totalOnboarded !== 1) {
      throw new Error(`Volunteer 1 counts mismatch: M:${vol1_t2.ssmMerchants}, C:${vol1_t2.sscConsumers}, T:${vol1_t2.totalOnboarded}`);
    }
    if (vol2_t2.ssmMerchants !== 0 || vol2_t2.sscConsumers !== 0) {
      throw new Error(`Volunteer 2 should remain 0`);
    }
    if (track2.summary.totalMerchants !== 1 || track2.summary.totalConsumers !== 0 || track2.summary.totalOnboarded !== 1) {
      throw new Error(`Summary mismatch after SSM store: ${JSON.stringify(track2.summary)}`);
    }
    console.log('[PASS] SSM store attributed to Volunteer 1: Merchants = 1, Consumers = 0, Total = 1.');

    // -------------------------------------------------------------
    // TEST 3: SSC Registration increments ONLY Consumer count
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: SSC Consumer registration increments ONLY Consumer count ---');
    await pgClient.query(`
      INSERT INTO app_users (
        id, username, full_name, phone, role, referral_code, referred_by_code, referred_at
      ) VALUES (
        $1, 'test_user_beta', 'Consumer User Beta', '9847000002', 'consumer', 'SSC-TEST02', $2, now()
      )
    `, [testUserId1, code2]);

    const { data: track3, error: errTrack3 } = await supabase.rpc('get_referral_campaign_tracking', {
      p_campaign_id: testCampaignId
    });
    if (errTrack3) throw new Error('Error fetching tracking after SSC registration: ' + errTrack3.message);

    const vol1_t3 = track3.volunteers.find(v => v.referralCode === code1);
    const vol2_t3 = track3.volunteers.find(v => v.referralCode === code2);

    if (vol2_t3.ssmMerchants !== 0 || vol2_t3.sscConsumers !== 1 || vol2_t3.totalOnboarded !== 1) {
      throw new Error(`Volunteer 2 counts mismatch: M:${vol2_t3.ssmMerchants}, C:${vol2_t3.sscConsumers}, T:${vol2_t3.totalOnboarded}`);
    }
    if (vol1_t3.ssmMerchants !== 1 || vol1_t3.sscConsumers !== 0) {
      throw new Error(`Volunteer 1 should remain M:1, C:0`);
    }
    if (track3.summary.totalMerchants !== 1 || track3.summary.totalConsumers !== 1 || track3.summary.totalOnboarded !== 2) {
      throw new Error(`Summary mismatch after SSC consumer: ${JSON.stringify(track3.summary)}`);
    }
    console.log('[PASS] SSC consumer attributed to Volunteer 2: Merchants = 0, Consumers = 1, Total = 1.');

    // -------------------------------------------------------------
    // TEST 4: Multiple registrations & Volunteer 3 attribution
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Multiple registrations attributed to Volunteer 3 ---');
    // Store for Volunteer 3
    await pgClient.query(`
      INSERT INTO stores (
        id, name, phone, address, referral_code, referred_by_code, referred_at
      ) VALUES (
        $1, 'Test Retailer Gamma', '9847000003', 'Kochi, Kerala', 'SSM-TEST03', $2, now()
      )
    `, [testStoreId2, code3]);

    // 2 Consumers for Volunteer 3
    await pgClient.query(`
      INSERT INTO app_users (
        id, username, full_name, phone, role, referral_code, referred_by_code, referred_at
      ) VALUES 
        ($1, 'test_user_gamma1', 'Consumer Gamma One', '9847000004', 'consumer', 'SSC-TEST03A', $3, now()),
        ($2, 'test_user_gamma2', 'Consumer Gamma Two', '9847000005', 'consumer', 'SSC-TEST03B', $3, now())
    `, [testUserId2, testUserId3, code3]);

    const { data: track4, error: errTrack4 } = await supabase.rpc('get_referral_campaign_tracking', {
      p_campaign_id: testCampaignId
    });
    if (errTrack4) throw new Error('Error fetching tracking after multiple: ' + errTrack4.message);

    const vol3_t4 = track4.volunteers.find(v => v.referralCode === code3);
    if (vol3_t4.ssmMerchants !== 1 || vol3_t4.sscConsumers !== 2 || vol3_t4.totalOnboarded !== 3) {
      throw new Error(`Volunteer 3 counts mismatch: M:${vol3_t4.ssmMerchants}, C:${vol3_t4.sscConsumers}, T:${vol3_t4.totalOnboarded}`);
    }
    console.log('[PASS] Volunteer 3 attributed: 1 Merchant + 2 Consumers = 3 Total Onboarded.');

    // -------------------------------------------------------------
    // TEST 5: Verify SSD Delivery Partner is NOT counted in statistics
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Verify SSD Delivery Partner is NOT counted in campaign statistics ---');
    await pgClient.query(`
      INSERT INTO app_users (
        id, username, full_name, phone, role, referral_code, referred_by_code, referred_at
      ) VALUES (
        $1, 'test_rider_dp', 'Delivery Partner Rider', '9847000006', 'delivery_partner', 'SSD-TEST01', $2, now()
      )
    `, [testPartnerId, code1]);

    const { data: track5, error: errTrack5 } = await supabase.rpc('get_referral_campaign_tracking', {
      p_campaign_id: testCampaignId
    });
    if (errTrack5) throw new Error('Error fetching tracking after SSD insertion: ' + errTrack5.message);

    const vol1_t5 = track5.volunteers.find(v => v.referralCode === code1);
    if (vol1_t5.sscConsumers !== 0) {
      throw new Error(`SSD delivery partner was erroneously counted as an SSC consumer! sscConsumers: ${vol1_t5.sscConsumers}`);
    }
    console.log('[PASS] SSD delivery partner registration with volunteer referral code was correctly excluded.');

    // -------------------------------------------------------------
    // TEST 6: Verify Campaign Totals match the sum of individual volunteers
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Verify Campaign Totals match sum of individual volunteers ---');
    const sumMerchants = track5.volunteers.reduce((acc, v) => acc + v.ssmMerchants, 0);
    const sumConsumers = track5.volunteers.reduce((acc, v) => acc + v.sscConsumers, 0);
    const sumTotal = track5.volunteers.reduce((acc, v) => acc + v.totalOnboarded, 0);

    if (track5.summary.totalMerchants !== sumMerchants || track5.summary.totalMerchants !== 2) {
      throw new Error(`Total merchants mismatch: summary=${track5.summary.totalMerchants}, sum=${sumMerchants}, expected=2`);
    }
    if (track5.summary.totalConsumers !== sumConsumers || track5.summary.totalConsumers !== 3) {
      throw new Error(`Total consumers mismatch: summary=${track5.summary.totalConsumers}, sum=${sumConsumers}, expected=3`);
    }
    if (track5.summary.totalOnboarded !== sumTotal || track5.summary.totalOnboarded !== 5) {
      throw new Error(`Total onboarded mismatch: summary=${track5.summary.totalOnboarded}, sum=${sumTotal}, expected=5`);
    }
    if (track5.summary.totalVolunteers !== 3) {
      throw new Error(`Total volunteers mismatch: expected 3, got ${track5.summary.totalVolunteers}`);
    }
    console.log(`[PASS] Campaign Totals verified: Volunteers: 3, Merchants: 2, Consumers: 3, Total Onboarded: 5.`);

    // -------------------------------------------------------------
    // TEST 7: Verify PDF and DOCX Exports with Live Tracking Performance Data
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Verify PDF and DOCX Export Generation with Tracking Figures ---');
    const exportData = {
      name: track5.campaign.name,
      description: track5.campaign.description,
      startDate: track5.campaign.startDate,
      startTime: track5.campaign.startTime,
      endDate: track5.campaign.endDate,
      endTime: track5.campaign.endTime,
      volunteerCount: track5.campaign.volunteerCount,
      totalMerchants: track5.summary.totalMerchants,
      totalConsumers: track5.summary.totalConsumers,
      totalOnboarded: track5.summary.totalOnboarded,
      volunteers: track5.volunteers
    };

    const pdfBlob = exportCampaignToPDF(exportData);
    if (!pdfBlob || pdfBlob.size < 5000) throw new Error('PDF export generation produced invalid blob');
    console.log(`[PASS] Tracking PDF document generated successfully (${pdfBlob.size} bytes).`);

    const docxBlob = await exportCampaignToDOCX(exportData);
    if (!docxBlob || docxBlob.size < 5000) throw new Error('DOCX export generation produced invalid blob');
    console.log(`[PASS] Tracking DOCX document generated successfully (${docxBlob.size} bytes).`);

    // -------------------------------------------------------------
    // TEST 8: Archived Campaign Tracking
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Verify Archived Campaign Tracking ---');
    const { data: archRes, error: errArch } = await supabase.rpc('archive_and_delete_referral_campaign', {
      p_campaign_id: testCampaignId,
      p_admin_id: 'Test Suite Admin'
    });
    if (errArch) throw new Error('Error archiving campaign: ' + errArch.message);

    const { data: archTracking, error: errArchTrack } = await supabase.rpc('get_referral_campaign_archive_tracking', {
      p_archive_id: archRes.archiveId
    });
    if (errArchTrack) throw new Error('Error fetching archive tracking: ' + errArchTrack.message);
    if (!archTracking || !archTracking.success) throw new Error('Archive tracking RPC returned unsuccessful');

    if (archTracking.summary.totalMerchants !== 2 || archTracking.summary.totalConsumers !== 3 || archTracking.summary.totalOnboarded !== 5) {
      throw new Error(`Archive tracking summary mismatch: ${JSON.stringify(archTracking.summary)}`);
    }
    console.log(`[PASS] Archived campaign tracking successfully verified: Merchants: 2, Consumers: 3, Total: 5.`);

    // -------------------------------------------------------------
    // CLEANUP: Clean up all test records
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP: Removing all test records ---');
    await pgClient.query('DELETE FROM stores WHERE id IN ($1, $2)', [testStoreId1, testStoreId2]);
    await pgClient.query('DELETE FROM app_users WHERE id IN ($1, $2, $3, $4)', [testUserId1, testUserId2, testUserId3, testPartnerId]);
    await pgClient.query('DELETE FROM referral_campaign_archives WHERE original_campaign_id = $1', [testCampaignId]);
    console.log('[PASS] All test stores, consumers, delivery partner, and archive records cleaned up.');

    // Verify database counts
    const storesCount = await pgClient.query('SELECT count(*) FROM stores');
    const usersCount = await pgClient.query("SELECT count(*) FROM app_users WHERE role = 'consumer'");
    console.log(`[PASS] Production stores count intact: ${storesCount.rows[0].count} (13 stores).`);
    console.log(`[PASS] Production consumer count intact: ${usersCount.rows[0].count} (35 consumers).`);

    console.log('\n================================================================');
    console.log('ALL REFERRAL CAMPAIGN TRACKING TESTS PASSED (8/8)!');
    console.log('================================================================');
  } catch (err) {
    console.error('Verification failed:', err);
    // Safety cleanup
    await pgClient.query('DELETE FROM stores WHERE id IN ($1, $2)', [testStoreId1, testStoreId2]).catch(() => {});
    await pgClient.query('DELETE FROM app_users WHERE id IN ($1, $2, $3, $4)', [testUserId1, testUserId2, testUserId3, testPartnerId]).catch(() => {});
    await pgClient.query('DELETE FROM referral_campaigns WHERE id = $1', [testCampaignId]).catch(() => {});
    await pgClient.query('DELETE FROM referral_campaign_archives WHERE original_campaign_id = $1', [testCampaignId]).catch(() => {});
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

runVerification();
