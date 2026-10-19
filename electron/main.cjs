/**
 * DIGI WHATSAPP AGENT — Desktop Shell (Electron).
 *
 * Starts the agent's server in-process, shows a branded splash screen while the
 * engine and memory subsystems initialize, then opens the main frameless rounded window.
 * Matches DIGI LABS sizing, theming, window controls, and clean shutdown architecture.
 */
const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

// Prevent multiple instances from conflicting on ports
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

const PORT = Number(process.env.PORT || 9010);
let activePort = PORT;
const ROOT = path.join(__dirname, "..");

// In a packaged build, data and sessions must live in user's writable AppData directory
const DATA = app.isPackaged ? path.join(app.getPath("userData"), "data") : path.join(ROOT, "data");
process.env.MYRAA_DATA_DIR = DATA;
process.env.DIGI_DATA_DIR = DATA;

// Ensure DATA, knowledge base, and environment variables are properly initialized
try {
  fs.mkdirSync(DATA, { recursive: true });
  const appDataKb = path.join(DATA, "whatsapp_knowledge.md");
  const rootKb = path.join(ROOT, "data", "whatsapp_knowledge.md");
  if (!fs.existsSync(appDataKb) && fs.existsSync(rootKb)) {
    fs.copyFileSync(rootKb, appDataKb);
  }

  // Seed domain knowledge files into AppData
  const appDataKnowledgeDir = path.join(DATA, "knowledge");
  const rootKnowledgeDir = path.join(ROOT, "knowledge");
  fs.mkdirSync(appDataKnowledgeDir, { recursive: true });
  if (fs.existsSync(rootKnowledgeDir)) {
    const kfiles = fs.readdirSync(rootKnowledgeDir);
    for (const kf of kfiles) {
      const dest = path.join(appDataKnowledgeDir, kf);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(rootKnowledgeDir, kf), dest);
      }
    }
  }
  process.env.KNOWLEDGE_DIR = appDataKnowledgeDir;

  // Sync and load environment variables
  const userDataEnv = path.join(app.getPath("userData"), ".env");
  const rootEnv = path.join(ROOT, ".env");
  const candidateEnvs = [
    rootEnv,
    path.join(process.resourcesPath, "..", ".env"),
    path.join(process.resourcesPath, ".env"),
    path.join(process.cwd(), ".env"),
    "C:\\Users\\user\\Desktop\\AWAIS\\WHATSAPP_AGENT\\.env",
  ].filter(Boolean);

  let foundEnv = null;
  for (const c of candidateEnvs) {
    if (fs.existsSync(c)) {
      foundEnv = c;
      break;
    }
  }

  if (!fs.existsSync(userDataEnv) && foundEnv) {
    try {
      fs.copyFileSync(foundEnv, userDataEnv);
    } catch { }
  }

  try {
    const dotenv = require("dotenv");
    if (foundEnv) dotenv.config({ path: foundEnv });
    if (fs.existsSync(userDataEnv)) dotenv.config({ path: userDataEnv, override: true });
  } catch { }
} catch (e) {
  console.warn("[Electron Init] Knowledge & Env sync warning:", e?.message);
}

let splash = null;
let win = null;

const http = require("node:http");

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  } else if (splash && !splash.isDestroyed()) {
    splash.focus();
  }
});

function stage(text) {
  if (splash && !splash.isDestroyed()) {
    splash.webContents.send("splash:stage", text);
  }
}

function makeSplash() {
  splash = new BrowserWindow({
    width: 440,
    height: 340,
    frame: false,
    resizable: false,
    movable: true,
    transparent: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    show: false,
    skipTaskbar: false,
    alwaysOnTop: false,
    icon: path.join(ROOT, "assets", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "splash-preload.cjs"),
      contextIsolation: true,
    },
  });

  splash.loadFile(path.join(__dirname, "splash.html"));
  splash.once("ready-to-show", () => splash.show());
}

function makeWindow() {
  // Clamped directly to the screen's work area like DIGI LABS
  const { width: waW, height: waH } = screen.getPrimaryDisplay().workAreaSize;
  const winW = Math.min(1360, waW - 40);
  const winH = Math.min(880, waH - 40);

  win = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: Math.min(1000, winW),
    minHeight: Math.min(700, winH),
    maxHeight: waH,
    center: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    show: false,
    autoHideMenuBar: true,
    title: "Digi WhatsApp Agent",
    icon: path.join(ROOT, "assets", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadURL(`http://127.0.0.1:${activePort}/`);

  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    if (splash && !splash.isDestroyed()) {
      splash.destroy();
    }
    splash = null;
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
  };

  win.once("ready-to-show", reveal);
  win.webContents.once("did-finish-load", reveal);
  // Fail-safe: Maximum 1200ms after loadURL, force reveal so the app NEVER hangs on loading!
  setTimeout(reveal, 1200);

  // External links open in default OS browser, never inside the app frame
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${activePort}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

function checkPortLive(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 1000 }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json && json.ok ? json : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Polls the backend server until live and ready
 */
async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let candidatePort = global.__DIGI_WA_PORT;
    if (!candidatePort) {
      try {
        const portFile = path.join(DATA, ".port");
        if (fs.existsSync(portFile)) {
          const val = Number(fs.readFileSync(portFile, "utf-8").trim());
          if (val > 0) candidatePort = val;
        }
      } catch { }
    }

    const portsToTry = candidatePort ? [candidatePort, PORT] : [PORT, PORT + 1, PORT + 2];
    for (const port of portsToTry) {
      const res = await checkPortLive(port);
      if (res) {
        activePort = port;
        return res;
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

app.whenReady().then(async () => {
  fs.mkdirSync(DATA, { recursive: true });
  makeSplash();

  stage("Starting Digi WhatsApp Agent…");
  try {
    const serverPath = path.join(ROOT, "dist", "backend", "server.cjs");
    if (fs.existsSync(serverPath)) {
      require(serverPath);
    } else {
      throw new Error(`Backend bundle not found at: ${serverPath}. Run npm run build first.`);
    }
  } catch (e) {
    stage("The agent server failed to start.");
    dialog.showErrorBox("Digi WhatsApp Agent", `The agent backend failed to start.\n\n${e && e.message}`);
    app.quit();
    return;
  }

  stage("Initializing memory & AI engine…");
  const health = await waitForServer();
  if (!health) {
    stage("Backend server did not answer.");
    dialog.showErrorBox("Digi WhatsApp Agent", "The backend server did not respond in time.");
    app.quit();
    return;
  }

  stage("Ready");
  makeWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) makeWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

// Window controls (frameless topbar)
ipcMain.on("win:minimize", () => win && win.minimize());
ipcMain.on("win:maximize", () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on("win:close", () => win && win.close());
ipcMain.handle("win:isMaximized", () => win ? win.isMaximized() : false);

ipcMain.on("open:external", (_e, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("app:openFolder", async (_e, targetPath) => {
  const p = targetPath || DATA;
  await shell.openPath(p);
  return p;
});
