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
    console.log(`Running SSC Live Test on http://127.0.0.1:${port}`);

    const win = new BrowserWindow({
      width: 1320,
      height: 880,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    win.webContents.on("console-message", (event, level, message) => {
      if (message.includes("Error") || message.includes("warn")) {
        console.log(`[CONSOLE] ${message}`);
      }
    });

    win.loadURL(`http://127.0.0.1:${port}`).then(async () => {
      // 1. Pre-authenticate in localStorage for fast immediate dashboard load
      await win.webContents.executeJavaScript(`
        try {
          localStorage.setItem('@ssa_founder_authenticated', 'true');
        } catch(e) {}
      `);

      // Reload to apply authenticated state immediately
      win.loadURL(`http://127.0.0.1:${port}`);

      // 2. Wait for Dashboard to mount
      await new Promise(r => setTimeout(r, 3500));

      const initialText = await win.webContents.executeJavaScript(`document.body.innerText`);
      console.log("Initial Dashboard Text preview:", initialText.slice(0, 150).replace(/\n/g, ' '));

      // 3. Click SSC (Consumer) navigation button
      const clickCoords = await win.webContents.executeJavaScript(`
        (() => {
          const all = Array.from(document.querySelectorAll('*'));
          const target = all.find(el => el.innerText && el.innerText.trim() === 'SSC (Consumer)');
          if (!target) return null;
          const rect = target.getBoundingClientRect();
          return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
        })()
      `);
      console.log("SSC Tab Coordinates:", clickCoords);

      if (clickCoords) {
        win.webContents.sendInputEvent({ type: 'mouseDown', x: clickCoords.x, y: clickCoords.y, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x: clickCoords.x, y: clickCoords.y, button: 'left', clickCount: 1 });
      }

      // 4. Wait for real Supabase consumers to load and render
      await new Promise(r => setTimeout(r, 4500));

      const sscData = await win.webContents.executeJavaScript(`
        (() => {
          const text = document.body.innerText;
          return {
            hasLiveBadge: text.includes('LIVE SUPABASE'),
            hasTotalCount: text.includes('19 consumers') || text.includes('records: 19'),
            hasAryajith: text.includes('Aryajith A'),
            hasAfsiya: text.includes('Afsiya Afii'),
            hasAjmal: text.includes('Ajmal n'),
            hasAsif: text.includes('Asif Muhammed'),
            hasRahulMock: text.includes('Rahul Nambiar'),
            hasFathimaMock: text.includes('Fathima Suhara'),
            bodySnippet: text.slice(0, 800).replace(/\\n/g, ' ')
          };
        })()
      `);
      console.log("\n=======================================================");
      console.log("SSC LIVE SUPABASE RENDERING REPORT:");
      console.log(JSON.stringify(sscData, null, 2));
      console.log("=======================================================\n");

      // 5. Click Aryajith A's card to test Detailed Profile Modal
      const cardCoords = await win.webContents.executeJavaScript(`
        (() => {
          const all = Array.from(document.querySelectorAll('*'));
          const target = all.find(el => el.innerText && el.innerText.includes('Aryajith A'));
          if (!target) return null;
          const rect = target.getBoundingClientRect();
          return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
        })()
      `);
      console.log("Aryajith card coords:", cardCoords);

      if (cardCoords) {
        win.webContents.sendInputEvent({ type: 'mouseDown', x: cardCoords.x, y: cardCoords.y, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x: cardCoords.x, y: cardCoords.y, button: 'left', clickCount: 1 });
      }

      await new Promise(r => setTimeout(r, 1500));

      const modalData = await win.webContents.executeJavaScript(`
        (() => {
          const text = document.body.innerText;
          return {
            isModalOpen: text.includes('Consumer Profile Dossier'),
            hasIdentityHeading: text.includes('COMMUNICATION & IDENTITY'),
            hasEmail: text.includes('aryajitharun17@gmail.com'),
            hasPassCode: text.includes('SSC-LVRMV4'),
            hasCustomerId: text.includes('SS-CUS-YG90R4LF'),
            hasRegisteredDate: text.includes('28 Oct 2026') || text.includes('Oct'),
            modalSnippet: text.slice(0, 600).replace(/\\n/g, ' ')
          };
        })()
      `);
      console.log("CONSUMER DOSSIER MODAL TEST:");
      console.log(JSON.stringify(modalData, null, 2));

      server.close();
      app.quit();
    });
  });
});
