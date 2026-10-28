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

async function listFunctions() {
  // Query pg_proc for all functions in public schema
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        p.proname AS name,
        pg_get_function_arguments(p.oid) AS args,
        pg_get_function_result(p.oid) AS returns,
        p.prosrc AS source,
        CASE p.prokind 
          WHEN 'f' THEN 'function'
          WHEN 'p' THEN 'procedure'
          WHEN 'a' THEN 'aggregate'
          WHEN 'w' THEN 'window'
        END AS kind,
        n.nspname AS schema
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname;
    `
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('=== PUBLIC FUNCTIONS ===');
  data.forEach(f => {
    console.log(`${f.kind} ${f.name}(${f.args}) RETURNS ${f.returns}`);
    if (f.source.includes('SECURITY DEFINER')) console.log('  -> SECURITY DEFINER');
    if (f.source.includes('TRIGGER')) console.log('  -> TRIGGER FUNCTION');
  });
  
  // Also check for triggers
  const { data: triggers, error: trigErr } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        tgname AS trigger_name,
        tgrelid::regclass AS table_name,
        proname AS function_name
      FROM pg_trigger
      JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
      WHERE NOT tgisinternal
      ORDER BY tgrelid::regclass::text, tgname;
    `
  });
  
  if (!trigErr) {
    console.log('\n=== TRIGGERS ===');
    triggers.forEach(t => {
      console.log(`${t.trigger_name} ON ${t.table_name} -> ${t.function_name}`);
    });
  }
}

listFunctions().catch(console.error);