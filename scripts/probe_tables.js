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
  "order_items",
  "bills",
  "bill_items",
  "offers",
  "stores",
  "vouchers",
  "chat_messages",
  "catalog",
  "reviews"
];

async function checkTables() {
  for (const t of candidateTables) {
    const { data, error, count } = await supabase
      .from(t)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`[${t}] Error: ${error.code} - ${error.message}`);
    } else {
      console.log(`[${t}] Accessible! Count: ${count}`);
    }
  }
}

checkTables();
