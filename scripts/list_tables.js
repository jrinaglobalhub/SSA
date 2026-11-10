const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

async function run() {
  const client = new Client({
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.tpcrwtxtqvvdghtfckea',
    password: 'Enthukond@m1',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully!');

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('All Public Tables:', res.rows.map(r => r.table_name));

  // Check tables related to ads, banners, advertisements, applications, etc.
  const matching = res.rows
    .map(r => r.table_name)
    .filter(t => /ad|banner|campaign|appli|promo|sponsor|merchant/i.test(t));
  console.log('\nMatching Tables:', matching);

  for (const t of matching) {
    try {
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${t}";`);
      const colsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${t}'
        ORDER BY ordinal_position;
      `);
      console.log(`\nTable: ${t} (Rows: ${countRes.rows[0].count})`);
      console.log('Columns:', colsRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
      const sample = await client.query(`SELECT * FROM public."${t}" LIMIT 2;`);
      if (sample.rows.length > 0) {
        console.log('Sample row:', JSON.stringify(sample.rows[0], null, 2));
      }
    } catch (e) {
      console.log(`Error inspecting ${t}:`, e.message);
    }
  }

  await client.end();
}

run().catch(console.error);
