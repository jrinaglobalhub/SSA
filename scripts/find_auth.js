const fs = require('fs');
const path = require('path');

function searchFiles(dir, term) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === '.expo') continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchFiles(full, term);
    } else if (entry.endsWith('.env') || entry.endsWith('.ts') || entry.endsWith('.js') || entry.endsWith('.json')) {
      const txt = fs.readFileSync(full, 'utf8');
      if (txt.includes(term)) {
        console.log(`Match in ${full}:`);
        txt.split('\n').forEach((l, idx) => {
          if (l.includes(term)) {
            console.log(`  L${idx+1}: ${l.trim().slice(0, 100)}`);
          }
        });
      }
    }
  }
}

console.log('Searching for test users / signInWithPassword...');
searchFiles('c:/Users/Muhammad J R/Documents/JRINA/SSC App', 'signInWithPassword');
searchFiles('c:/Users/Muhammad J R/Documents/JRINA/SSM App', 'signInWithPassword');
searchFiles('c:/Users/Muhammad J R/Documents/JRINA/SSD App', 'signInWithPassword');
searchFiles('c:/Users/Muhammad J R/Documents/JRINA/SmartShopper', 'signInWithPassword');
