const { Client } = require('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper/node_modules/pg');

const client = new Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.tpcrwtxtqvvdghtfckea',
  password: 'password@2026/jrina',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  await client.connect();

  const stores = await client.query('SELECT count(*) FROM stores');
  const users = await client.query('SELECT count(*) FROM app_users');
  const consumers = await client.query("SELECT count(*) FROM app_users WHERE role = 'consumer'");
  const merchants = await client.query("SELECT count(*) FROM app_users WHERE role = 'merchant_partner'");
  const delivery = await client.query("SELECT count(*) FROM app_users WHERE role = 'delivery_partner'");
  const campaigns = await client.query('SELECT count(*) FROM referral_campaigns');
  const archives = await client.query('SELECT count(*) FROM referral_campaign_archives');
  const bannerSlots = await client.query('SELECT count(*) FROM banner_slot_controls');
  const bannerPackages = await client.query('SELECT count(*) FROM banner_advertising_packages');

  console.log('================================================================');
  console.log('PRE-IMPLEMENTATION BASELINE DATABASE AUDIT');
  console.log('================================================================');
  console.log('1. Stores (SSM):', stores.rows[0].count);
  console.log('2. App Users Total:', users.rows[0].count);
  console.log('   - Consumers (SSC):', consumers.rows[0].count);
  console.log('   - Merchants (SSM):', merchants.rows[0].count);
  console.log('   - Delivery Partners (SSD):', delivery.rows[0].count);
  console.log('3. Referral Campaigns:', campaigns.rows[0].count);
  console.log('4. Referral Campaign Archives:', archives.rows[0].count);
  console.log('5. Banner Slot Controls (SSM Ad Calendar):', bannerSlots.rows[0].count);
  console.log('6. Banner Advertising Packages:', bannerPackages.rows[0].count);

  const sscBannersTbl = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ssc_banners')");
  console.log('7. ssc_banners table exists:', sscBannersTbl.rows[0].exists);

  await client.end();
}

audit().catch(console.error);
