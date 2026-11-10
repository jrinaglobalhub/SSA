const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const poolerUrl = 'postgresql://postgres.tpcrwtxtqvvdghtfckea:Enthukond@m1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function checkColumns() {
  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const cols = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name IN ('orders', 'order_items', 'app_users', 'stores', 'delivery_partners')
    ORDER BY table_name, ordinal_position;
  `);

  const map = {};
  cols.rows.forEach(c => {
    if (!map[c.table_name]) map[c.table_name] = [];
    map[c.table_name].push(`${c.column_name} (${c.data_type})`);
  });
  console.log(map);

  await client.end();
}

checkColumns().catch(console.error);
