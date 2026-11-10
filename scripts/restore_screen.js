const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:/Users/Muhammad J R/.gemini/antigravity/brain/eab246ff-6e17-4def-aa92-663fdef124c1/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 1020 && obj.tool_calls && obj.tool_calls[0]) {
        let content = obj.tool_calls[0].args.Content;
        if (typeof content === 'string') {
          if (content.startsWith('"') && content.endsWith('"')) {
            content = JSON.parse(content);
          }
        }
        fs.writeFileSync('src/screens/ReferralsScreen.tsx', content, 'utf8');
        console.log('Successfully restored ReferralsScreen.tsx from step 1020! Length:', content.length);
        return;
      }
    } catch (e) {
      // continue
    }
  }
}
extract().catch(console.error);
