const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://tpcrwtxtqvvdghtfckea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_duE4gQ7TYTYpO7sRjeKcXQ_1mf2F-d3";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAppUsers() {
  const { data, error, count } = await supabase
    .from("app_users")
    .select("*", { count: "exact" });

  console.log("app_users select * result:");
  console.log("error:", error);
  console.log("count:", count);
  console.log("data:", data);
}

testAppUsers();
