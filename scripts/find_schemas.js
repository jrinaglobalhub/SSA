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
    } else if (entry.endsWith('.sql') || entry.endsWith('.ts') || entry.endsWith('.js') || entry.endsWith('.json')) {
      const txt = fs.readFileSync(full, 'utf8');
      if (txt.toLowerCase().includes(term.toLowerCase())) {
        console.log(`Match in ${full}`);
        // find matching lines
        txt.split('\n').forEach((l, idx) => {
          if (l.toLowerCase().includes(term.toLowerCase())) {
            console.log(`  L${idx+1}: ${l.trim().slice(0, 120)}`);
          }
        });
      }
    }
  }
}

console.log('Searching for app_users schema in SSC App...');
searchFiles('c:/Users/Muhammad J R/Documents/JRINA/SSC App', 'create table');
console.log('\nSearching for app_users schema in SSM App...');
searchFiles('c:/Users/Muhammad J R/Documents/JRINA/SSM App', 'create table');
console.log('\nSearching for app_users schema in SSD App...');
searchFiles('c:/Users/Muhammad J R/Documents/JRINA/SSD App', 'create table');
