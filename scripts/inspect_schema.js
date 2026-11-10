const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectSchema() {
  // 1. Inspect stores
  const { data: storeSample } = await supabase.from("stores").select("*").limit(1);
  if (storeSample && storeSample[0]) {
    console.log("stores columns:", Object.keys(storeSample[0]));
    console.log("sample store:", storeSample[0]);
  }

  // 2. Inspect app_users
  const { data: userSample } = await supabase.from("app_users").select("*").limit(1);
  if (userSample && userSample[0]) {
    console.log("app_users columns:", Object.keys(userSample[0]));
    console.log("sample user:", userSample[0]);
  } else {
    console.log("app_users has 0 rows or error");
  }

  // 3. Test possible delivery tables
  const deliveryTables = [
    "delivery_partners",
    "delivery_applications",
    "partner_applications",
    "delivery_jobs",
    "delivery_boys",
    "drivers"
  ];
  for (const t of deliveryTables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (!error) {
      console.log(`Table exists: '${t}', columns:`, data[0] ? Object.keys(data[0]) : "empty table");
    } else {
      console.log(`Table '${t}' not accessible: ${error.message}`);
    }
  }
}

inspectSchema();
