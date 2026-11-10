const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');
const client = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  const c = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores' AND column_name IN ('lat', 'lng')");
  console.log(c.rows);
  const sample = await client.query("SELECT id, lat, lng FROM stores LIMIT 5");
  console.log(sample.rows);
  await client.end();
}
run();
