const fs = require('fs');

function inspectFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...content.matchAll(/\.from\(['"]([a-zA-Z0-9_\-]+)['"]\)/g)].map(m => m[1]);
  console.log(`Unique tables in ${filePath}:`, [...new Set(matches)]);
}

inspectFile('c:/Users/Muhammad J R/Documents/JRINA/SSC App/src/api/supabase.ts');
inspectFile('c:/Users/Muhammad J R/Documents/JRINA/SSM App/src/api/supabase.ts');
inspectFile('c:/Users/Muhammad J R/Documents/JRINA/SSD App/src/api/supabase.ts');
