const { Client } = require('pg');
const { parse } = require('pg-connection-string');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };
const client = new Client(config);

async function verifyViews() {
    await client.connect();
    console.log('✅ Connected');
    
    // Test cloudflare_kv_tracking view
    try {
        const kv = await client.query('SELECT * FROM cloudflare_kv_tracking LIMIT 5');
        console.log('\n=== cloudflare_kv_tracking ===');
        console.log('Columns:', Object.keys(kv.rows[0] || {}));
        console.log('Row count:', kv.rowCount);
        if (kv.rows[0]) {
            console.log('Sample:', {
                order_id: kv.rows[0].order_id,
                website_name: kv.rows[0].website_name,
                service_type: kv.rows[0].service_type,
                service_status: kv.rows[0].service_status,
                cf_status: kv.rows[0].cf_status,
                product_type: kv.rows[0].product_type
            });
        }
    } catch (e) {
        console.error('cloudflare_kv_tracking error:', e.message);
    }
    
    // Test v_cf_zone_per_site view
    try {
        const v = await client.query('SELECT * FROM v_cf_zone_per_site LIMIT 5');
        console.log('\n=== v_cf_zone_per_site ===');
        console.log('Columns:', Object.keys(v.rows[0] || {}));
        console.log('Row count:', v.rowCount);
    } catch (e) {
        console.error('v_cf_zone_per_site error:', e.message);
    }
    
    // Test user_services data
    try {
        const us = await client.query('SELECT * FROM user_services');
        console.log('\n=== user_services ===');
        console.log('Total:', us.rowCount);
        us.rows.forEach(r => console.log(`  ${r.website_name} | ${r.service_type} | ${r.status} | ${r.metadata?.plan_name || 'no plan'}`));
    } catch (e) {
        console.error('user_services error:', e.message);
    }
    
    await client.end();
}

verifyViews().catch(e => { console.error(e); client.end(); });