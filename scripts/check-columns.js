const { Client } = require('pg');
const { parse } = require('pg-connection-string');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };
const client = new Client(config);

async function checkColumns() {
    await client.connect();
    console.log('✅ Connected');
    
    // Check subscriptions columns
    const subCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='subscriptions'
        ORDER BY ordinal_position
    `);
    console.log('\n=== subscriptions columns ===');
    subCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Check orders columns
    const orderCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='orders'
        ORDER BY ordinal_position
    `);
    console.log('\n=== orders columns ===');
    orderCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Check one_time_orders columns
    const otoCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='one_time_orders'
        ORDER BY ordinal_position
    `);
    console.log('\n=== one_time_orders columns ===');
    otoCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Check subscription_with_limit view columns
    try {
        const vCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema='public' AND table_name='subscription_with_limit'
            ORDER BY ordinal_position
        `);
        console.log('\n=== subscription_with_limit columns ===');
        vCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    } catch (e) {
        console.log('\n=== subscription_with_limit view dropped ===');
    }
    
    await client.end();
}

checkColumns().catch(e => { console.error(e); client.end(); });