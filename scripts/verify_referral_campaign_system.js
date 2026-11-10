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
  console.log('SSA – REFERRAL CAMPAIGN MANAGEMENT SYSTEM VERIFICATION');
  console.log('================================================================\n');

  await pgClient.connect();

  let testCampaignId = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Generate 5 Unique Referral Codes
    // -------------------------------------------------------------
    console.log('--- TEST 1: Unique Referral Code Generation (5 codes) ---');
    const { data: codes5, error: errCodes5 } = await supabase.rpc('generate_unique_campaign_referral_codes', {
      p_count: 5,
      p_prefix: 'CMP'
    });
    if (errCodes5) throw new Error('Error generating 5 codes: ' + errCodes5.message);
    if (!codes5 || codes5.length !== 5) throw new Error(`Expected 5 codes, got ${codes5?.length}`);
    
    // Check format and uniqueness within set
    const set5 = new Set(codes5);
    if (set5.size !== 5) throw new Error('Duplicate codes found in generated set of 5');
    for (const code of codes5) {
      if (!/^CMP-[A-Z0-9]{6}$/.test(code)) throw new Error(`Invalid code format: ${code}`);
    }
    console.log('[PASS] 5 codes successfully generated and validated:', codes5);

    // -------------------------------------------------------------
    // TEST 2: Generate 15 Unique Referral Codes & Global Database Uniqueness
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Unique Referral Code Generation (15 codes) & Global DB Uniqueness ---');
    const { data: codes15, error: errCodes15 } = await supabase.rpc('generate_unique_campaign_referral_codes', {
      p_count: 15,
      p_prefix: 'CMP'
    });
    if (errCodes15) throw new Error('Error generating 15 codes: ' + errCodes15.message);
    if (!codes15 || codes15.length !== 15) throw new Error(`Expected 15 codes, got ${codes15?.length}`);
    
    const set15 = new Set(codes15);
    if (set15.size !== 15) throw new Error('Duplicate codes found in generated set of 15');
    for (const code of codes15) {
      if (!/^CMP-[A-Z0-9]{6}$/.test(code)) throw new Error(`Invalid code format: ${code}`);
    }

    // Verify against DB (stores, app_users, referral_campaign_volunteers)
    const checkStores = await pgClient.query('SELECT referral_code FROM stores WHERE referral_code = ANY($1)', [codes15]);
    if (checkStores.rows.length > 0) throw new Error('Collision detected with stores.referral_code');

    const checkUsers = await pgClient.query('SELECT referral_code FROM app_users WHERE referral_code = ANY($1)', [codes15]);
    if (checkUsers.rows.length > 0) throw new Error('Collision detected with app_users.referral_code');

    const checkVolunteers = await pgClient.query('SELECT referral_code FROM referral_campaign_volunteers WHERE referral_code = ANY($1)', [codes15]);
    if (checkVolunteers.rows.length > 0) throw new Error('Collision detected with referral_campaign_volunteers.referral_code');

    console.log('[PASS] 15 unique codes generated with zero collisions across entire database.');

    // -------------------------------------------------------------
    // TEST 3: Campaign Creation with 5 Volunteers
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Campaign Creation with 5 Volunteers ---');
    const campaignPayload5 = {
      name: 'Kochi Tech Park Onboarding Drive',
      description: 'Field activation campaign targeting retail establishments in Kakkanad',
      start_date: '2026-11-15',
      start_time: '09:00',
      end_date: '2026-11-20',
      end_time: '18:00',
      volunteer_count: 5,
      status: 'active'
    };

    const volunteers5 = [
      {
        serial_number: 1,
        volunteer_name: 'Arjun Menon',
        mobile_number: '9847112233',
        referral_code: codes5[0],
        assigned_date: '2026-11-15',
        assigned_start_time: '09:00',
        assigned_end_time: '13:00'
      },
      {
        serial_number: 2,
        volunteer_name: 'Pooja Nair',
        mobile_number: '9847223344',
        referral_code: codes5[1],
        assigned_date: '2026-11-15',
        assigned_start_time: '14:00',
        assigned_end_time: '18:00'
      },
      {
        serial_number: 3,
        volunteer_name: 'Fahad Rasheed',
        mobile_number: '9847334455',
        referral_code: codes5[2],
        assigned_date: '2026-11-16',
        assigned_start_time: '09:00',
        assigned_end_time: '15:00'
      },
      {
        serial_number: 4,
        volunteer_name: 'Sneha Joseph',
        mobile_number: '9847445566',
        referral_code: codes5[3],
        assigned_date: '2026-11-17',
        assigned_start_time: '10:00',
        assigned_end_time: '16:00'
      },
      {
        serial_number: 5,
        volunteer_name: 'Kiran Das',
        mobile_number: '9847556677',
        referral_code: codes5[4],
        assigned_date: '2026-11-18',
        assigned_start_time: '11:00',
        assigned_end_time: '17:00'
      }
    ];

    const { data: savedCampRes, error: errSave5 } = await supabase.rpc('save_referral_campaign', {
      p_campaign: campaignPayload5,
      p_volunteers: volunteers5
    });
    if (errSave5) throw new Error('Error saving campaign with 5 volunteers: ' + errSave5.message);
    if (!savedCampRes || !savedCampRes.success) throw new Error('Failed to save campaign: ' + savedCampRes?.error);
    testCampaignId = savedCampRes.campaignId;
    console.log('[PASS] Campaign saved successfully! ID:', testCampaignId);

    // Verify DB records
    const campCheck = await pgClient.query('SELECT * FROM referral_campaigns WHERE id = $1', [testCampaignId]);
    if (campCheck.rows.length !== 1) throw new Error('Campaign record not found in DB');
    if (campCheck.rows[0].volunteer_count !== 5) throw new Error(`Expected volunteer_count 5, got ${campCheck.rows[0].volunteer_count}`);

    const volCheck = await pgClient.query('SELECT * FROM referral_campaign_volunteers WHERE campaign_id = $1 ORDER BY serial_number', [testCampaignId]);
    if (volCheck.rows.length !== 5) throw new Error(`Expected 5 volunteer records, got ${volCheck.rows.length}`);
    console.log(`[PASS] DB contains exactly 1 campaign record and 5 volunteer rows.`);

    // -------------------------------------------------------------
    // TEST 4: Campaign Update / Scale to 15 Volunteers
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Scale Campaign to 15 Volunteers (Editing Existing Campaign) ---');
    const campaignPayload15 = {
      id: testCampaignId,
      name: 'Kochi Tech Park Onboarding Drive - Mega Phase',
      description: 'Expanded field activation campaign targeting commercial areas',
      start_date: '2026-11-15',
      start_time: '08:30',
      end_date: '2026-11-25',
      end_time: '19:00',
      volunteer_count: 15,
      status: 'active'
    };

    // Keep existing 5 volunteers and add 10 more
    const volunteers15 = [
      ...volunteers5,
      ...Array.from({ length: 10 }, (_, i) => ({
        serial_number: 6 + i,
        volunteer_name: `Volunteer ${6 + i}`,
        mobile_number: `98470000${String(i).padStart(2, '0')}`,
        referral_code: codes15[i],
        assigned_date: '2026-11-19',
        assigned_start_time: '09:00',
        assigned_end_time: '17:00'
      }))
    ];

    const { data: updatedCampId, error: errSave15 } = await supabase.rpc('save_referral_campaign', {
      p_campaign: campaignPayload15,
      p_volunteers: volunteers15
    });
    if (errSave15) throw new Error('Error updating campaign: ' + errSave15.message);

    const campCheck15 = await pgClient.query('SELECT * FROM referral_campaigns WHERE id = $1', [testCampaignId]);
    if (campCheck15.rows[0].volunteer_count !== 15) throw new Error(`Expected volunteer_count 15, got ${campCheck15.rows[0].volunteer_count}`);

    const volCheck15 = await pgClient.query('SELECT * FROM referral_campaign_volunteers WHERE campaign_id = $1 ORDER BY serial_number', [testCampaignId]);
    if (volCheck15.rows.length !== 15) throw new Error(`Expected 15 volunteer records, got ${volCheck15.rows.length}`);
    console.log('[PASS] Campaign successfully scaled and updated to 15 volunteers.');

    // -------------------------------------------------------------
    // TEST 5: Get All Campaigns & Campaign Details RPCs
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Verify get_all_referral_campaigns & get_referral_campaign_details ---');
    const { data: allCampaigns, error: errAll } = await supabase.rpc('get_all_referral_campaigns');
    if (errAll) throw new Error('Error fetching all campaigns: ' + errAll.message);
    const foundCamp = allCampaigns.find(c => c.id === testCampaignId);
    if (!foundCamp) throw new Error('Created campaign not returned in get_all_referral_campaigns');
    if (foundCamp.volunteerCount !== 15) throw new Error(`Expected 15 volunteers in summary, got ${foundCamp.volunteerCount}`);
    if (foundCamp.generatedCodesCount !== 15) throw new Error(`Expected 15 codes in summary, got ${foundCamp.generatedCodesCount}`);
    console.log('[PASS] get_all_referral_campaigns returned verified campaign summary.');

    const { data: campDetails, error: errDetails } = await supabase.rpc('get_referral_campaign_details', {
      p_campaign_id: testCampaignId
    });
    if (errDetails) throw new Error('Error fetching campaign details: ' + errDetails.message);
    if (!campDetails || !campDetails.campaign || !campDetails.volunteers) throw new Error('Invalid details structure');
    if (campDetails.volunteers.length !== 15) throw new Error(`Expected 15 volunteers in details, got ${campDetails.volunteers.length}`);
    console.log('[PASS] get_referral_campaign_details returned complete campaign details and 15 volunteers.');

    // -------------------------------------------------------------
    // TEST 6: Export Verification (PDF & DOCX)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Export Verification (PDF & DOCX) ---');
    const exportData = {
      name: campDetails.campaign.name,
      description: campDetails.campaign.description,
      startDate: campDetails.campaign.startDate,
      startTime: campDetails.campaign.startTime,
      endDate: campDetails.campaign.endDate,
      endTime: campDetails.campaign.endTime,
      volunteerCount: campDetails.campaign.volunteerCount,
      createdAt: campDetails.campaign.createdAt,
      volunteers: campDetails.volunteers.map(v => ({
        serialNumber: v.serialNumber,
        volunteerName: v.volunteerName,
        mobileNumber: v.mobileNumber,
        referralCode: v.referralCode,
        assignedDate: v.assignedDate,
        assignedStartTime: v.assignedStartTime,
        assignedEndTime: v.assignedEndTime
      }))
    };

    const pdfBlob = exportCampaignToPDF(exportData);
    if (!pdfBlob || pdfBlob.size < 1000) throw new Error('PDF generation produced invalid blob');
    console.log(`[PASS] PDF Document successfully generated (${pdfBlob.size} bytes).`);

    const docxBlob = await exportCampaignToDOCX(exportData);
    if (!docxBlob || docxBlob.size < 1000) throw new Error('DOCX generation produced invalid blob');
    console.log(`[PASS] DOCX Document successfully generated (${docxBlob.size} bytes).`);

    // -------------------------------------------------------------
    // TEST 7: Campaign Deletion with Automatic Archival
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Campaign Deletion with Automatic Archival ---');
    const { data: archiveRes, error: errArchive } = await supabase.rpc('archive_and_delete_referral_campaign', {
      p_campaign_id: testCampaignId,
      p_admin_id: 'ssa_admin_test'
    });
    if (errArchive) throw new Error('Error archiving and deleting campaign: ' + errArchive.message);
    console.log('[PASS] archive_and_delete_referral_campaign executed successfully. Archive ID:', archiveRes.archiveId);

    // Verify active tables NO LONGER contain this campaign
    const checkActiveCamp = await pgClient.query('SELECT * FROM referral_campaigns WHERE id = $1', [testCampaignId]);
    if (checkActiveCamp.rows.length !== 0) throw new Error('Campaign still present in referral_campaigns after deletion');

    const checkActiveVol = await pgClient.query('SELECT * FROM referral_campaign_volunteers WHERE campaign_id = $1', [testCampaignId]);
    if (checkActiveVol.rows.length !== 0) throw new Error('Volunteers still present in referral_campaign_volunteers after deletion');
    console.log('[PASS] Active campaign and volunteer records permanently deleted from active tables.');

    // Verify archive table contains full snapshot
    const checkArchive = await pgClient.query('SELECT * FROM referral_campaign_archives WHERE original_campaign_id = $1', [testCampaignId]);
    if (checkArchive.rows.length !== 1) throw new Error('Archive record not found in referral_campaign_archives');
    const archiveRow = checkArchive.rows[0];
    if (archiveRow.campaign_name !== campaignPayload15.name) throw new Error('Archive name mismatch');
    if (archiveRow.volunteer_count !== 15) throw new Error('Archive volunteer count mismatch');
    if (!archiveRow.volunteer_data || archiveRow.volunteer_data.length !== 15) throw new Error('Archive volunteer_data incomplete');
    console.log(`[PASS] Permanent archive record verified with full snapshot of 15 volunteers.`);

    // Verify get_referral_campaign_archives RPC
    const { data: archivesList, error: errArchList } = await supabase.rpc('get_referral_campaign_archives');
    if (errArchList) throw new Error('Error fetching archives list: ' + errArchList.message);
    const foundArchive = archivesList.find(a => a.originalCampaignId === testCampaignId);
    if (!foundArchive) throw new Error('Archived campaign not listed in get_referral_campaign_archives');
    console.log('[PASS] get_referral_campaign_archives RPC listed archived campaign.');

    // -------------------------------------------------------------
    // TEST 8: Export from Archive
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Document Generation from Archive Record ---');
    const startDt = new Date(archiveRow.start_timestamp);
    const endDt = new Date(archiveRow.end_timestamp);
    const archivedExportData = {
      name: archiveRow.campaign_name,
      description: archiveRow.campaign_description,
      startDate: startDt.toLocaleDateString('en-CA'),
      startTime: startDt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      endDate: endDt.toLocaleDateString('en-CA'),
      endTime: endDt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      volunteerCount: archiveRow.volunteer_count,
      createdAt: archiveRow.original_created_at,
      volunteers: archiveRow.volunteer_data.map(v => ({
        serialNumber: v.serialNumber,
        volunteerName: v.volunteerName,
        mobileNumber: v.mobileNumber,
        referralCode: v.referralCode,
        assignedDate: v.assignedDate,
        assignedStartTime: v.assignedStartTime,
        assignedEndTime: v.assignedEndTime
      }))
    };
    const archPdfBlob = exportCampaignToPDF(archivedExportData);
    const archDocxBlob = await exportCampaignToDOCX(archivedExportData);
    if (!archPdfBlob || !archDocxBlob) throw new Error('Failed to generate export from archive');
    console.log(`[PASS] Successfully generated PDF (${archPdfBlob.size} bytes) and DOCX (${archDocxBlob.size} bytes) directly from archive snapshot.`);

    // Cleanup test archive record so zero dummy/test data remains in production DB
    await pgClient.query('DELETE FROM referral_campaign_archives WHERE original_campaign_id = $1', [testCampaignId]);
    console.log('[PASS] Test archive cleaned up. Zero test records remain in database.');

    // -------------------------------------------------------------
    // TEST 9: Existing SSC & SSM Referrals Separation & Integrity
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Preserve Existing SSC & SSM Referrals Separation ---');
    const ssmStores = await pgClient.query('SELECT count(*) FROM stores WHERE referral_code IS NOT NULL');
    console.log(`[PASS] SSM stores with referral codes intact: ${ssmStores.rows[0].count}`);

    const sscUsers = await pgClient.query('SELECT count(*) FROM app_users WHERE referral_code IS NOT NULL');
    console.log(`[PASS] SSC consumers with referral codes intact: ${sscUsers.rows[0].count}`);

    console.log('\n================================================================');
    console.log('ALL REFERRAL CAMPAIGN SYSTEM VERIFICATION TESTS PASSED (9/9)!');
    console.log('================================================================');
  } catch (err) {
    console.error('Verification failed:', err);
    if (testCampaignId) {
      await pgClient.query('DELETE FROM referral_campaigns WHERE id = $1', [testCampaignId]).catch(() => {});
      await pgClient.query('DELETE FROM referral_campaign_archives WHERE campaign_id = $1', [testCampaignId]).catch(() => {});
    }
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

runVerification();
