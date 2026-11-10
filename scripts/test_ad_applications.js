const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://tpcrwtxtqvvdghtfckea.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, count, error } = await supabase
    .from('spotlight_campaigns')
    .select('*, stores(id, name, address, phone)', { count: 'exact' })
    .not('status', 'in', '("draft","payment_pending","cancelled","refunded","refund_pending","refund_failed")')
    .eq('payment_status', 'paid')
    .not('banner_url', 'is', null);

  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data:', data);
}

test().catch(console.error);
