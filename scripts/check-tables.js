const { Client } = require('pg');
const { parse } = require('pg-connection-string');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };
const client = new Client(config);

async function checkTables() {
    await client.connect();
    console.log('✅ Connected');
    
    const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' 
        AND table_name IN ('user_services','wp_scans','optimization_tasks','subscriptions','plan_metadata','one_time_orders')
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));
    
    // Check user_services count
    const count = await client.query('SELECT COUNT(*) FROM user_services');
    console.log('user_services count:', count.rows[0].count);
    
    // Check subscriptions count (should still exist)
    try {
        const subCount = await client.query('SELECT COUNT(*) FROM subscriptions');
        console.log('subscriptions count:', subCount.rows[0].count);
    } catch (e) {
        console.log('subscriptions table dropped');
    }
    
    await client.end();
}

checkTables().catch(e => { console.error(e); client.end(); });