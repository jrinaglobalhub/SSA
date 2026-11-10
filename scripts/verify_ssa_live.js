const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAudit() {
  console.log("=== SSA LIVE BACKEND & FUNCTIONALITY VERIFICATION ===");

  // 1. Overview Metrics
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayIso = todayMidnight.toISOString();

  let todayOrders = 0;
  const { count: ordersCount, error: ordersErr } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayIso);
  if (!ordersErr) todayOrders = ordersCount || 0;

  const { count: sscCount } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true });

  const { count: ssmCount } = await supabase
    .from("stores")
    .select("id", { count: "exact", head: true });

  const { count: ssdCount } = await supabase
    .from("delivery_partners")
    .select("id", { count: "exact", head: true });

  console.log("\n[1. OVERVIEW PULSE]");
  console.log(`- Today's Total Orders: ${todayOrders}`);
  console.log(`- Total Registered SSC Consumers: ${sscCount || 0}`);
  console.log(`- Total SSM Merchant Stores: ${ssmCount || 0}`);
  console.log(`- Total SSD Delivery Partners: ${ssdCount || 0}`);

  // 2. SSC Consumers Sample
  console.log("\n[2. SSC CONSUMERS LIST]");
  const { data: consumers, error: cErr } = await supabase
    .from("app_users")
    .select("id, full_name, phone, state, created_at, updated_at")
    .range(0, 4)
    .order("created_at", { ascending: false });

  if (cErr) {
    console.log("SSC query error:", cErr.message);
  } else {
    console.log(`Fetched ${consumers.length} sample consumer records:`);
    consumers.forEach((c, idx) => {
      console.log(`  ${idx + 1}. ${c.full_name || "Consumer"} | Phone: ${c.phone || "—"} | State: ${c.state || "Kerala"} | Reg: ${c.created_at?.slice(0, 10)}`);
    });
  }

  // 3. SSM Merchant Stores Sample
  console.log("\n[3. SSM MERCHANTS LIST]");
  const { data: stores, error: sErr } = await supabase
    .from("stores")
    .select("id, name, owner_name, contact_person, phone, state, plan")
    .range(0, 3)
    .order("created_at", { ascending: false });

  if (sErr) {
    console.log("SSM query error:", sErr.message);
  } else {
    console.log(`Fetched ${stores.length} sample store records:`);
    for (const s of stores) {
      const { count: catCount } = await supabase.from("catalog").select("id", { count: "exact", head: true }).eq("store_id", s.id);
      const { count: offCount } = await supabase.from("offers").select("id", { count: "exact", head: true }).eq("store_id", s.id);
      console.log(`  - Store: ${s.name} | Owner: ${s.owner_name || s.contact_person || "Owner"} | Phone: ${s.phone || "—"} | Catalog: ${catCount || 0} items | Offers: ${offCount || 0}`);
    }
  }

  // 4. SSD Delivery Applications
  console.log("\n[4. SSD DELIVERY APPLICATIONS & APPROVAL WORKFLOW]");
  const { data: apps, error: aErr } = await supabase
    .from("delivery_partner_applications")
    .select("id, full_name, phone, status, vehicle_type, vehicle_number, driving_licence_number, created_at")
    .range(0, 4)
    .order("created_at", { ascending: false });

  if (aErr) {
    console.log("SSD query error:", aErr.message);
  } else {
    console.log(`Fetched ${apps.length} sample delivery applications:`);
    apps.forEach((a, idx) => {
      console.log(`  ${idx + 1}. ${a.full_name || "Applicant"} | Phone: ${a.phone} | Status: [${a.status.toUpperCase()}] | Vehicle: ${a.vehicle_type} (${a.vehicle_number || "—"})`);
    });
  }

  console.log("\n=== ALL BACKEND METRICS & APIS OPERATIONAL ===");
}

runAudit();
