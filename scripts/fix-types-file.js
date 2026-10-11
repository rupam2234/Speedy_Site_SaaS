const fs = require('fs');

const content = fs.readFileSync('src/lib/db/database.types.ts', 'utf8');

// Remove the Supabase CLI version notice that got appended
const cleaned = content.replace(/node\.exe : A new version of Supabase CLI is available: v[\d.]+ \(currently installed v[\d.]+\)[\s\S]*$/, '');

fs.writeFileSync('src/lib/db/database.types.ts', cleaned, 'utf8');
console.log('Removed Supabase CLI version notice');