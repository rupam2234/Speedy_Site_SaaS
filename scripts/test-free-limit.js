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

async function test() {
  // Create a test user
  const { data: user, error: userErr } = await supabase.auth.admin.createUser({
    email: `test-free-limit-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true
  });
  if (userErr) throw userErr;
  console.log('Created test user:', user.user.id);

  const userId = user.user.id;

  // Insert 3 free orders - should succeed
  for (let i = 1; i <= 3; i++) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        website_name: `test${i}.example.com`,
        website_address: `https://test${i}.example.com`,
        order_status: true,
        product_type: 'free'
      })
      .select()
      .single();
    
    if (error) {
      console.log(`  Order ${i}: FAILED - ${error.message}`);
    } else {
      console.log(`  Order ${i}: SUCCESS - ${data.order_id}`);
    }
  }

  // Insert 4th free order - should FAIL
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      website_name: 'test4.example.com',
      website_address: 'https://test4.example.com',
      order_status: true,
      product_type: 'free'
    })
    .select()
    .single();
  
  if (error) {
    console.log(`  Order 4: BLOCKED as expected - ${error.message}`);
  } else {
    console.log(`  Order 4: UNEXPECTED SUCCESS - ${data.order_id}`);
  }

  // Cleanup
  await supabase.auth.admin.deleteUser(userId);
  console.log('\nTest user cleaned up.');
}

test().catch(console.error);