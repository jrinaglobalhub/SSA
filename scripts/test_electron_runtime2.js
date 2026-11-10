const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[BROWSER CONSOLE] Level ${level}: ${message} (${sourceId}:${line})`);
  });

  // Read index.html and convert absolute root paths to relative paths
  const distDir = path.join(__dirname, "../dist");
  let html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  html = html.replace(/href="\/favicon/g, 'href="./favicon')
             .replace(/src="\/_expo/g, 'src="./_expo');
  
  const patchedPath = path.join(distDir, "index_patched.html");
  fs.writeFileSync(patchedPath, html);

  win.loadFile(patchedPath).then(() => {
    setTimeout(async () => {
      try {
        const result = await win.webContents.executeJavaScript(`
          (() => {
            return {
              title: document.title,
              rootInnerLength: document.getElementById('root')?.innerHTML?.length || 0,
              preview: document.getElementById('root')?.innerText?.slice(0, 300) || '',
              bodySnippet: document.body.innerText?.slice(0, 300) || ''
            };
          })()
        `);
        console.log("Patched test result:", JSON.stringify(result, null, 2));
      } catch (err) {
        console.error("Test error:", err);
      } finally {
        app.quit();
      }
    }, 3000);
  });
});
