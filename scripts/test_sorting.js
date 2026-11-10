const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://tpcrwtxtqvvdghtfckea.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const res = await supabase.rpc('get_admin_banner_applications', {
    p_status_filter: 'all',
    p_limit: 10,
    p_offset: 0
  });
  console.log('Sorted order:');
  res.data.applications.forEach((a, i) => {
    console.log((i + 1) + '. Store: ' + a.storeName + ' | Owner: ' + a.ownerName + ' | Status: ' + a.status + ' | From: ' + a.startDate + ' | To: ' + a.endDate);
  });
}
test().catch(console.error);
