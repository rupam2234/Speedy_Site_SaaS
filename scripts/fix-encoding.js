const fs = require('fs');

// Read as UTF-16LE (Unicode)
const content = fs.readFileSync('src/lib/db/database.types.ts', 'utf16le');

// Write as UTF-8
fs.writeFileSync('src/lib/db/database.types.ts', content, 'utf8');

console.log('Fixed encoding: UTF-16LE -> UTF-8');