const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCases() {
  console.log("--- TEST 1: Search by Name ('Ajmal') ---");
  const { data: d1 } = await supabase.rpc("get_admin_consumers", { p_search: "Ajmal" });
  console.log("Count:", d1.length, "Matches:", d1.map(u => ({ name: u.name, phone: u.phone, email: u.email })));

  console.log("\n--- TEST 2: Search by Phone ('9539214872') ---");
  const { data: d2 } = await supabase.rpc("get_admin_consumers", { p_search: "9539214872" });
  console.log("Count:", d2.length, "Matches:", d2.map(u => ({ name: u.name, phone: u.phone })));

  console.log("\n--- TEST 3: Search by Email ('afsiyasiyad@gmail.com') ---");
  const { data: d3 } = await supabase.rpc("get_admin_consumers", { p_search: "afsiyasiyad@gmail.com" });
  console.log("Count:", d3.length, "Matches:", d3.map(u => ({ name: u.name, email: u.email })));

  console.log("\n--- TEST 4: Pagination (Limit 3, Offset 3) ---");
  const { data: d4 } = await supabase.rpc("get_admin_consumers", { p_limit: 3, p_offset: 3 });
  console.log("Offset 3, Limit 3:", d4.map(u => u.name));

  console.log("\n--- TEST 5: Status Filter ('active' vs 'inactive') ---");
  const { data: d5 } = await supabase.rpc("get_admin_consumers", { p_status: "active" });
  console.log("Active consumers count:", d5.length);
  const { data: d6 } = await supabase.rpc("get_admin_consumers", { p_status: "inactive" });
  console.log("Inactive consumers count:", d6.length);

  console.log("\n--- TEST 6: Overview real metrics ---");
  const { data: metrics } = await supabase.rpc("get_admin_overview_metrics");
  console.log("Real overview metrics:", metrics);
}

testCases();
