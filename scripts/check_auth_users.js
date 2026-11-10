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

  const demoUserIds = [
    'c52a78b0-c7e4-4f30-9d1e-5a5e71de51da',
    '706be533-bd21-4d55-af92-985b4dc02f97',
    '8048cac7-2578-414c-ad8f-bd6abbbeac3d',
    '60d0c5a7-02df-4228-a482-87885c296484',
    '982264cc-58d2-449a-b0b7-e9537682fb7c',
    '26f002a2-0d1a-4191-8cdd-b6a041c0df6e'
  ];

  const authUsers = await client.query(`
    SELECT id, email, phone FROM auth.users WHERE id = ANY($1)
  `, [demoUserIds]);
  console.log('auth.users matches:', authUsers.rows);

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
