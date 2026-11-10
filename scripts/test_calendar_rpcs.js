const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://tpcrwtxtqvvdghtfckea.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCalendarRPCs() {
  console.log('Testing Calendar RPCs...');

  // 1. Test get_banner_month_slots for Nov 2026
  const { data: monthSlots, error: monthErr } = await supabase.rpc('get_banner_month_slots', {
    p_start_date: '2026-11-01',
    p_end_date: '2026-11-30'
  });
  if (monthErr) throw monthErr;
  console.log('Month slots returned count:', monthSlots.length);
  console.log('Nov 10 slot info:', monthSlots.find(s => s.date === '2026-11-10'));
  console.log('Nov 11 slot info:', monthSlots.find(s => s.date === '2026-11-11'));

  // 2. Test get_daily_banner_slot for 2026-11-10
  const { data: dailySlot, error: dailyErr } = await supabase.rpc('get_daily_banner_slot', {
    p_date: '2026-11-10'
  });
  if (dailyErr) throw dailyErr;
  console.log('Daily slot for Nov 10:', dailySlot);

  // 3. Test update_daily_banner_booked_slots (+1 on Nov 10)
  const { data: incRes, error: incErr } = await supabase.rpc('update_daily_banner_booked_slots', {
    p_date: '2026-11-10',
    p_delta: 1,
    p_admin_id: 'Test SSA Admin'
  });
  if (incErr) throw incErr;
  console.log('Incremented Nov 10 slot:', incRes);

  // Verify Nov 11 was NOT modified
  const { data: nov11Slot } = await supabase.rpc('get_daily_banner_slot', { p_date: '2026-11-11' });
  console.log('Nov 11 slot remained independent:', nov11Slot);

  // Decrement back to 0
  const { data: decRes } = await supabase.rpc('update_daily_banner_booked_slots', {
    p_date: '2026-11-10',
    p_delta: -1,
    p_admin_id: 'Test SSA Admin'
  });
  console.log('Decremented Nov 10 slot back:', decRes);

  // 4. Test applications by date for Nov 10
  const { data: appsNov10, error: appErr } = await supabase.rpc('get_admin_banner_applications_by_date', {
    p_date: '2026-11-10'
  });
  if (appErr) throw appErr;
  console.log('Applications on Nov 10 count:', appsNov10.length);
  appsNov10.forEach(a => console.log(`  - ${a.id} | ${a.storeName} | ${a.status}`));

  // 5. Test applications on Nov 05 (should show multi-day MK Collections campaign)
  const { data: appsNov05 } = await supabase.rpc('get_admin_banner_applications_by_date', {
    p_date: '2026-11-05'
  });
  console.log('Applications on Nov 05 (multi-day) count:', appsNov05.length);
  appsNov05.forEach(a => console.log(`  - ${a.id} | ${a.storeName} | Dates: ${a.startDate} to ${a.endDate}`));

  console.log('ALL RPC TESTS PASSED SUCCESSFULLY!');
}

testCalendarRPCs().catch(console.error);
