const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
content.split('\n').forEach(line => {
  const t = line.trim();
  if (t && !t.startsWith('#')) {
    const i = t.indexOf('=');
    if (i > 0) {
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[k] = v;
    }
  }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAccountsWithSites() {
  // Get all users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw authError;

  console.log('=== Accounts with sites (orders) ===\n');

  for (const user of authUsers.users) {
    const userId = user.id;

    // Count orders
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Skip if no orders
    if (!orderCount || orderCount === 0) continue;

    // Get order details
    const { data: orders } = await supabase
      .from('orders')
      .select('order_id, website_name, product_type, order_status')
      .eq('user_id', userId);

    const isAdmin = profile?.role === 'admin';
    const isRupam = user.email === 'rupam.krishna999@gmail.com';

    if (isAdmin || isRupam) {
      console.log(`⏭️  SKIPPED (admin/rupam): ${user.email} — ${orderCount} site(s)`);
      continue;
    }

    console.log(`✅ ${user.email}`);
    console.log(`   ID: ${userId}`);
    console.log(`   Role: ${profile?.role || 'user'}`);
    console.log(`   Sites: ${orderCount}`);
    orders?.forEach(o => {
      console.log(`     - ${o.website_name} (${o.product_type}) ${o.order_status ? 'active' : 'inactive'}`);
    });
    console.log('');
  }
}

listAccountsWithSites().catch(console.error);