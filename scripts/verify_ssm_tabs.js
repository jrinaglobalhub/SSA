const { AdminApi } = require('./src/api/adminApi');

async function verify() {
  console.log('--- VERIFYING SSA SSM SUB-NAVIGATION ---');

  // 1. Verify Manage Sub-tab data source
  const merchantsRes = await AdminApi.getMerchants(1, 25, '');
  console.log('Manage Tab - Total Merchants:', merchantsRes.total);
  console.log('Manage Tab - Returned Merchants:', merchantsRes.merchants.length);
  if (merchantsRes.merchants.length > 0) {
    console.log('Sample Merchant:', {
      id: merchantsRes.merchants[0].id,
      storeName: merchantsRes.merchants[0].storeName,
      state: merchantsRes.merchants[0].state,
      offersLastMonth: merchantsRes.merchants[0].offersLastMonth,
      totalCatalogItems: merchantsRes.merchants[0].totalCatalogItems
    });
  }

  // 2. Verify Applications Sub-tab data source
  const adsRes = await AdminApi.getAdApplications('all', 1, 50);
  console.log('Applications Tab - Total Genuine Ads:', adsRes.total);
  console.log('Applications Tab - Returned Applications:', adsRes.applications.length);

  // 3. Test filter options
  for (const filter of ['pending', 'approved', 'rejected']) {
    const filterRes = await AdminApi.getAdApplications(filter, 1, 10);
    console.log(`Applications Tab [${filter}] - Total:`, filterRes.total);
  }

  console.log('All queries executed cleanly without errors.');
}

verify().catch(console.error);
