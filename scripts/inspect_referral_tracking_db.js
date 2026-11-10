const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const client = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const roles = await client.query(`
    SELECT DISTINCT role, count(*) FROM app_users GROUP BY role
  `);
  console.log('app_users roles:', roles.rows);

  const getAdminConsumersFn = await client.query(`
    SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'get_admin_consumers'
  `);
  if (getAdminConsumersFn.rows.length > 0) {
    console.log('get_admin_consumers definition:');
    console.log(getAdminConsumersFn.rows[0].routine_definition);
  }

  await client.end();
}

check().catch(console.error);
