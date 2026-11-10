const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAdminApi() {
  console.log("=== TESTING SSA ADMIN API WITH REAL SUPABASE DATA ===");

  // 1. Stores
  const { data: stores, count } = await supabase
    .from("stores")
    .select("id, name, address, phone, subscription_plan, subscription_status, created_at, referral_code", { count: "exact" })
    .order("created_at", { ascending: false });

  console.log(`\nFound ${count} real stores in database:`);
  for (const s of stores.slice(0, 5)) {
    const { count: catCount } = await supabase.from("catalog").select("id", { count: "exact", head: true }).eq("store_id", s.id);
    const { count: offCount } = await supabase.from("offers").select("id", { count: "exact", head: true }).eq("store_id", s.id);
    const state = s.address?.includes("Kerala") ? "Kerala" : "India";
    console.log(`- [${s.id}] ${s.name}`);
    console.log(`   Phone: ${s.phone} | State: ${state} | Referral: ${s.referral_code || "—"}`);
    console.log(`   Plan: ${s.subscription_plan} (${s.subscription_status}) | Catalog Items: ${catCount || 0} | Offers: ${offCount || 0}`);
  }

  // 2. Offers in database
  const { data: offers } = await supabase.from("offers").select("id, title, store_id, discount_percentage, created_at");
  console.log(`\nActive Offers (${offers?.length || 0}):`);
  offers?.forEach(o => console.log(`- ${o.title} (${o.discount_percentage}% off) at store ${o.store_id}`));

  // 3. Catalog in database
  const { data: catalog } = await supabase.from("catalog").select("id, name, price, store_id").limit(5);
  console.log(`\nSample Catalog Items (${catalog?.length || 0}):`);
  catalog?.forEach(c => console.log(`- ${c.name} (₹${c.price}) at store ${c.store_id}`));

  console.log("\n=== TEST COMPLETE ===");
}

testAdminApi();
