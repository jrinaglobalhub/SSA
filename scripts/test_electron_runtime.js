const { app, BrowserWindow } = require("electron");
const path = require("path");

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

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[DID FAIL LOAD] Code: ${errorCode}, Desc: ${errorDescription}, URL: ${validatedURL}`);
  });

  // Inject early error listener before script loads
  win.webContents.session.webRequest.onCompleted((details) => {
    console.log(`[NET] ${details.statusCode} ${details.url}`);
  });

  const targetFile = path.join(__dirname, "../dist/index.html");

  win.loadFile(targetFile).then(() => {
    setTimeout(async () => {
      try {
        const result = await win.webContents.executeJavaScript(`
          (() => {
            const scripts = Array.from(document.querySelectorAll('script')).map(s => ({ src: s.src, loaded: !!s.dataset.loaded }));
            return {
              scripts,
              documentBody: document.body.innerHTML,
              rootInner: document.getElementById('root')?.innerHTML,
              windowKeys: Object.keys(window).filter(k => k.includes('React') || k.includes('expo') || k.includes('App') || k.includes('webpack') || k.includes('metro')),
            };
          })()
        `);
        console.log("Diagnostic result:", JSON.stringify(result, null, 2));
      } catch (err) {
        console.error("Diagnostic error:", err);
      } finally {
        app.quit();
      }
    }, 2000);
  });
});
