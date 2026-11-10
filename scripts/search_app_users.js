const fs = require('fs');

const content = fs.readFileSync('c:/Users/Muhammad J R/Documents/JRINA/SSC App/src/api/supabase.ts', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('app_users')) {
    console.log(`L${i+1}: ${line}`);
    // print 5 lines before and after
    const start = Math.max(0, i - 5);
    const end = Math.min(lines.length, i + 10);
    console.log('--- Context ---');
    for (let j = start; j < end; j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
    console.log('===============\n');
  }
});
