const { Client } = require('pg');
const { parse } = require('pg-connection-string');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('Missing POSTGRES_URL in .env.local');
    process.exit(1);
}

// Parse connection string and add SSL config
const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };

const client = new Client(config);

async function runMigration(filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`\n📄 Running migration: ${path.basename(filePath)}`);
    
    // Remove comments and execute entire file as one batch
    // PostgreSQL can handle multiple statements in a single query
    const cleanSql = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
    
    if (!cleanSql) {
        console.log('  (empty file, skipping)');
        return;
    }
    
    try {
        await client.query(cleanSql);
        console.log(`  ✅ Migration executed successfully`);
    } catch (err) {
        // Check for expected errors
        const isExpectedDropError = (
            err.code === '42P01' || // undefined table
            err.message.includes('does not exist')
        );
        
        const isExpectedDuplicateError = (
            err.code === '42P07' || // duplicate table
            err.code === '42710' || // duplicate object
            err.message.includes('already exists')
        );
        
        if (isExpectedDropError || isExpectedDuplicateError) {
            console.log(`  ⚠️  Skipped (expected): ${err.message.split('\n')[0]}`);
        } else {
            console.error(`  ❌ Migration FAILED:`);
            console.error(`     Error: ${err.message}`);
            console.error(`     Code: ${err.code}`);
            throw err;
        }
    }
}

async function main() {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    
    console.log('🚀 Starting Phase 1 Database Migration');
    console.log(`Found ${files.length} migration files`);
    console.log(`Connecting to: ${connectionString.substring(0, 50)}...`);
    
    await client.connect();
    console.log('✅ Connected to database');
    
    try {
        for (const file of files) {
            await runMigration(path.join(migrationsDir, file));
        }
        
        console.log('\n✅ All migrations completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Run: npx supabase gen types typescript --project-id <project> > src/lib/db/database.types.ts');
        console.log('2. Update docs/migration/README.md checkboxes');
        console.log('3. Tag: git tag migration-db-v1');
    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
});