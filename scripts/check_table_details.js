const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const candidateTables = [
  "app_users",
  "users",
  "profiles",
  "consumer_profiles",
  "consumers",
  "customers",
  "user_push_tokens",
  "push_delivery_logs",
  "orders",
  "bills",
  "offers",
  "stores",
  "vouchers",
  "chat_messages",
  "catalog",
  "reviews"
];

async function checkDetails() {
  for (const t of candidateTables) {
    const { data, error } = await supabase.from(t).select("*").limit(2);
    if (error) {
      console.log(`[${t}] ERROR: ${error.code} | ${error.message} | ${error.hint || ''}`);
    } else {
      console.log(`[${t}] SUCCESS: ${data.length} rows returned. Sample keys:`, data[0] ? Object.keys(data[0]) : '(empty)');
      if (data[0]) {
        console.log(`   Sample:`, JSON.stringify(data[0]).slice(0, 150));
      }
    }
  }
}

checkDetails();
