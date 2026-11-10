const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');
const { createClient } = require('@supabase/supabase-js');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

async function reloadAndTest() {
  const pgClient = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();
    // Notify PostgREST to reload its schema cache
    await pgClient.query("NOTIFY pgrst, 'reload schema';");
    console.log("NOTIFY pgrst sent!");
  } finally {
    await pgClient.end();
  }

  // Wait 2 seconds for PostgREST to reload
  await new Promise(r => setTimeout(r, 2000));

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc("get_admin_consumers", {
    p_search: "",
    p_status: "all",
    p_limit: 10,
    p_offset: 0
  });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log(`Success! Retrieved ${data.length} consumers via Supabase JS client!`);
    console.log("Sample:", data[0]);
  }
}

reloadAndTest();
