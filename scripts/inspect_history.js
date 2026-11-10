const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const client = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  const history = await client.query(`
    SELECT * FROM spotlight_status_history
  `);
  console.log('Total spotlight status history entries:', history.rows.length);
  console.dir(history.rows, { depth: null });

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
