/**
 * Cleanup script: Find and optionally delete auth.users with no orders, no managed_wp services, no sites
 * Run with: node scripts/cleanup-empty-accounts.js [--delete]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();
          // Remove surrounding quotes
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findEmptyAccounts() {
  console.log('🔍 Finding accounts with no orders, no managed_wp services, no sites...\n');

  // Get all users from auth.users via admin API
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw authError;

  const results = [];

  for (const user of authUsers.users) {
    const userId = user.id;

    // Check orders
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Check managed_wp user_services
    const { count: managedWpCount } = await supabase
      .from('user_services')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('service_type', 'managed_wp');

    // Check sites via cloudflare_kv_tracking view (join orders)
    const { count: siteCount } = await supabase
      .from('cloudflare_kv_tracking')
      .select('*', { count: 'exact', head: true })
      .in('order_id', (await supabase.from('orders').select('order_id').eq('user_id', userId)).data?.map(o => o.order_id) || ['__none__']);

    // Get profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isExpertOrAdmin = profile?.role === 'expert' || profile?.role === 'admin';
    const isEmpty = orderCount === 0 && managedWpCount === 0 && siteCount === 0;

    if (isEmpty) {
      results.push({
        id: userId,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        role: profile?.role || 'user',
        orderCount,
        managedWpCount,
        siteCount,
        isExpertOrAdmin,
        safeToDelete: !isExpertOrAdmin
      });
    }
  }

  return results;
}

async function deleteAccounts(userIds) {
  console.log(`\n🗑️  Deleting ${userIds.length} account(s)...\n`);
  
  let deleted = 0;
  let failed = 0;

  for (const userId of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`  ❌ Failed to delete ${userId}:`, error.message);
      failed++;
    } else {
      console.log(`  ✅ Deleted ${userId}`);
      deleted++;
    }
  }

  console.log(`\n📊 Deleted: ${deleted}, Failed: ${failed}`);
}

async function main() {
  const shouldDelete = process.argv.includes('--delete');
  
  try {
    const accounts = await findEmptyAccounts();
    
    if (accounts.length === 0) {
      console.log('✅ No empty accounts found.');
      return;
    }

    console.log(`Found ${accounts.length} account(s) with no orders/services/sites:\n`);
    
    accounts.forEach((acc, i) => {
      const marker = acc.safeToDelete ? '✅' : '⚠️  (expert/admin - skipped)';
      console.log(`${i + 1}. ${marker} ${acc.email}`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log(`   Last sign in: ${acc.last_sign_in_at || 'never'}`);
      console.log(`   Role: ${acc.role}`);
      console.log(`   Orders: ${acc.orderCount}, Managed WP: ${acc.managedWpCount}, Sites: ${acc.siteCount}`);
      console.log('');
    });

    const safeToDelete = accounts.filter(a => a.safeToDelete);
    
    if (safeToDelete.length === 0) {
      console.log('⚠️  All found accounts are experts/admins - none will be deleted for safety.');
      return;
    }

    if (!shouldDelete) {
      console.log('🔍 DRY RUN - no accounts deleted.');
      console.log(`\nTo actually delete ${safeToDelete.length} account(s), run:`);
      console.log('   node scripts/cleanup-empty-accounts.js --delete');
      return;
    }

    // Confirm before deleting
    console.log(`\n⚠️  About to delete ${safeToDelete.length} account(s). This cannot be undone!`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(r => setTimeout(r, 5000));

    await deleteAccounts(safeToDelete.map(a => a.id));
    
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();