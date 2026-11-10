const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://tpcrwtxtqvvdghtfckea.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('1. Checking stores count:');
  const { count: storeCount, error: storeErr } = await supabase.from('stores').select('*', { count: 'exact', head: true });
  console.log('Stores error:', storeErr, 'Count:', storeCount);

  console.log('\n2. Checking spotlight_campaigns genuine ads query:');
  const { data, count, error } = await supabase
    .from('spotlight_campaigns')
    .select('*, stores(id, name, address, phone)', { count: 'exact' })
    .not('status', 'in', '("draft","payment_pending","cancelled","refunded","refund_pending","refund_failed")')
    .eq('payment_status', 'paid')
    .not('banner_url', 'is', null);

  console.log('Error:', error);
  console.log('Total genuine ads:', count);
  console.log('Returned rows:', data ? data.length : 0);

  console.log('\n3. Testing sub-status filtering:');
  const pending = await supabase
    .from('spotlight_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'paid')
    .in('status', ['pending_review', 'review_started']);
  console.log('Pending ads count:', pending.count);

  const approved = await supabase
    .from('spotlight_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'paid')
    .in('status', ['approved', 'scheduled', 'active', 'completed']);
  console.log('Approved/Active ads count:', approved.count);

  const rejected = await supabase
    .from('spotlight_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'paid')
    .eq('status', 'rejected');
  console.log('Rejected ads count:', rejected.count);
}

run().catch(console.error);
