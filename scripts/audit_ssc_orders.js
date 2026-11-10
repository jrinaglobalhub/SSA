const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      searchDir(full, pattern);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      lines.forEach((l, idx) => {
        if (pattern.test(l)) {
          console.log(`${full.replace('c:\\Users\\Muhammad J R\\Documents\\JRINA\\', '')}:${idx+1}: ${l.trim().slice(0, 120)}`);
        }
      });
    }
  }
}

console.log("=== Searching for order creation & database references in SSC App ===");
searchDir('c:/Users/Muhammad J R/Documents/JRINA/SSC App/src', /orders|createOrder|placeOrder|saveOrder/i);
