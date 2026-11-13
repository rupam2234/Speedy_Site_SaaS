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

async function check() {
  // Check index is gone
  const { data: idx, error: idxErr } = await supabase.rpc('exec_sql', {
    sql: "SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'uniq_orders_free_per_user'"
  });
  console.log('Index uniq_orders_free_per_user:', idx, idxErr);

  // Check trigger exists
  const { data: trig, error: trigErr } = await supabase.rpc('exec_sql', {
    sql: "SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE trigger_name = 'enforce_free_site_limit'"
  });
  console.log('Trigger enforce_free_site_limit:', trig, trigErr);

  // Test insert limit - create a test free order to verify the 3-site limit
  console.log('\nDone checking.');
}

check().catch(console.error);