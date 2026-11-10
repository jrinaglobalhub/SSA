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

  const demoStoreIds = [
    'store_26f002a20d1a',
    'store_706be533bd21',
    'store_8048cac72578',
    'store_60d0c5a702df'
  ];

  const demoUserIds = [
    'c52a78b0-c7e4-4f30-9d1e-5a5e71de51da',
    '706be533-bd21-4d55-af92-985b4dc02f97',
    '8048cac7-2578-414c-ad8f-bd6abbbeac3d',
    '60d0c5a7-02df-4228-a482-87885c296484',
    '982264cc-58d2-449a-b0b7-e9537682fb7c',
    '26f002a2-0d1a-4191-8cdd-b6a041c0df6e'
  ];

  // List all tables in public schema
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);

  console.log(`Scanning ${tablesRes.rows.length} tables for demo store and user IDs...`);

  for (const row of tablesRes.rows) {
    const table = row.table_name;
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
    `, [table]);

    for (const col of colsRes.rows) {
      if (['text', 'character varying', 'uuid'].includes(col.data_type)) {
        try {
          const storeMatch = await client.query(`SELECT count(*) FROM "${table}" WHERE "${col.column_name}"::text = ANY($1)`, [demoStoreIds]);
          if (parseInt(storeMatch.rows[0].count) > 0) {
            console.log(`[STORE MATCH] Table "${table}", Col "${col.column_name}": ${storeMatch.rows[0].count} rows`);
          }
        } catch (e) {}

        try {
          const userMatch = await client.query(`SELECT count(*) FROM "${table}" WHERE "${col.column_name}"::text = ANY($1)`, [demoUserIds]);
          if (parseInt(userMatch.rows[0].count) > 0 && table !== 'app_users') {
            console.log(`[USER MATCH] Table "${table}", Col "${col.column_name}": ${userMatch.rows[0].count} rows`);
          }
        } catch (e) {}
      }
    }
  }

  console.log('Scan completed.');
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
