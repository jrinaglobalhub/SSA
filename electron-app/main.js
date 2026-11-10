const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

let server = null;

function startLocalServer(callback) {
  const distDir = path.join(__dirname, "dist");

  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf"
  };

  server = http.createServer((req, res) => {
    let reqUrl = decodeURI(req.url.split("?")[0]);
    if (reqUrl === "/" || reqUrl === "") reqUrl = "/index.html";

    const filePath = path.join(distDir, reqUrl.replace(/^\//, ""));

    // Prevent directory traversal
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Cache-Control": "no-cache"
        });
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

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1024,
    minHeight: 720,
    title: "SSA - SmartShopper Admin",
    icon: path.join(__dirname, "icon.ico"),
    backgroundColor: "#FFFFFF",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(() => {
  startLocalServer((port) => {
    createWindow(port);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
    });
  });
});

app.on("window-all-closed", () => {
  if (server) {
    try {
      server.close();
    } catch {}
  }
  if (process.platform !== "darwin") app.quit();
});
