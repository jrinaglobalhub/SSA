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
    console.log(`Local static server listening on http://127.0.0.1:${port}`);

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
      console.log(`[CONSOLE] ${message}`);
    });

    win.loadURL(`http://127.0.0.1:${port}`).then(() => {
      setTimeout(async () => {
        try {
          const res = await win.webContents.executeJavaScript(`
            (() => ({
              title: document.title,
              rootLength: document.getElementById('root')?.innerHTML?.length || 0,
              text: document.body.innerText.slice(0, 300)
            }))()
          `);
          console.log("SUCCESS! Result:", JSON.stringify(res, null, 2));
        } catch (e) {
          console.error("Exec error:", e);
        } finally {
          server.close();
          app.quit();
        }
      }, 3000);
    });
  });
});
