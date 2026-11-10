const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

let server = null;

function startLocalServer(distDir, callback) {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp"
  };

  server = http.createServer((req, res) => {
    let reqUrl = decodeURI(req.url.split("?")[0]);
    if (reqUrl === "/" || reqUrl === "") reqUrl = "/index.html";

    const filePath = path.join(distDir, reqUrl.replace(/^\//, ""));

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const indexFile = path.join(distDir, "index.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream(indexFile).pipe(res);
      }
    });
  });

  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    callback(port);
  });
}

app.whenReady().then(() => {
  const distDir = path.join(__dirname, "../dist");

  startLocalServer(distDir, (port) => {
    const win = new BrowserWindow({
      width: 1320,
      height: 880,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    win.loadURL(`http://127.0.0.1:${port}`).then(async () => {
      // 1. Wait 3 seconds for Splash screen (durationMs=2000) to dismiss
      await new Promise(r => setTimeout(r, 3000));
      
      const res = await win.webContents.executeJavaScript(`
        (() => {
          const all = Array.from(document.querySelectorAll('*'));
          const target = all.find(el => el.innerText && el.innerText.trim() === 'Sign In to Dashboard');
          if (!target) return { found: false, count: all.length };

          // Find clickable button ancestor
          const btn = target.closest('[tabindex="0"]') || target.closest('[role="button"]') || target.parentElement;
          const rect = (btn || target).getBoundingClientRect();
          return {
            found: true,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          };
        })()
      `);
      console.log("Button detection after splash:", res);

      if (res.found && res.rect) {
        const x = Math.round(res.rect.x + res.rect.width / 2);
        const y = Math.round(res.rect.y + res.rect.height / 2);
        console.log(`Sending click to (${x}, ${y})`);
        win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
      }

      // Wait 3.5 seconds for Dashboard to fetch Supabase data & render
      await new Promise(r => setTimeout(r, 3500));

      const dashboard = await win.webContents.executeJavaScript(`
        (() => {
          const text = document.body.innerText;
          return {
            isDashboardMounted: text.includes('SmartShopper Ecosystem Pulse') || text.includes('Live platform metrics'),
            hasOverview: text.includes('Overview'),
            hasSSC: text.includes('SSC (Consumer)'),
            hasSSM: text.includes('SSM (Merchant)'),
            hasSSD: text.includes('SSD (Delivery)'),
            hasReferrals: text.includes('Referrals'),
            snippet: text.slice(0, 350).replace(/\\n/g, ' ')
          };
        })()
      `);
      console.log("Dashboard mount status:", dashboard);

      server.close();
      app.quit();
    });
  });
});
