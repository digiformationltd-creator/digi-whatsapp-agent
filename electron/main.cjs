const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { pathToFileURL } = require('url');

const os = require('os');

function getLogPath() {
  return path.join(os.homedir(), 'whatsapp-agent-debug.log');
}

function log(msg) {
  try {
    const logFile = getLogPath();
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
    console.log(msg);
  } catch (e) {
    console.log(msg);
  }
}

// Crash protection
process.on('uncaughtException', (error) => {
  log('[Electron Shield] Uncaught Exception: ' + (error?.stack || error?.message || error));
});
process.on('unhandledRejection', (reason) => {
  log('[Electron Shield] Unhandled Rejection: ' + (reason?.stack || reason?.message || reason));
});

let mainWindow = null;
let tray = null;
let isQuitting = false;

const PORT = process.env.PORT || 9010;
const SERVER_URL = "http://localhost:" + PORT;

// -----------------------------------------------------------------------------
// 1. Setup User Directories & Environment
// -----------------------------------------------------------------------------
function setupEnvironment() {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  const knowledgeDir = path.join(userDataPath, 'knowledge');

  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(knowledgeDir, { recursive: true });
  } catch { }

  process.env.MYRAA_DATA_DIR = dataDir;
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_DIR = path.join(__dirname, '..', 'dist', 'frontend');

  // Seed default knowledge if empty
  try {
    const existing = fs.readdirSync(knowledgeDir);
    if (existing.length === 0) {
      const srcKnowledge = path.join(__dirname, '..', 'knowledge');
      if (fs.existsSync(srcKnowledge)) {
        const files = fs.readdirSync(srcKnowledge);
        for (const file of files) {
          fs.copyFileSync(path.join(srcKnowledge, file), path.join(knowledgeDir, file));
        }
      }
    }
  } catch (e) {
    log('[Electron] Knowledge seeding note: ' + e.message);
  }

  process.env.KNOWLEDGE_DIR = knowledgeDir;
}

// -----------------------------------------------------------------------------
// 2. Start Backend Server
// -----------------------------------------------------------------------------
function startBackendServer() {
  setupEnvironment();
  try {
    const serverScript = path.join(__dirname, '..', 'dist', 'backend', 'server.cjs');
    log('[Electron] Loading backend server from: ' + serverScript);
    require(serverScript);
    log('[Electron] Backend server successfully loaded and running.');
  } catch (err) {
    log('[Electron] Error starting backend server: ' + (err?.stack || err?.message || err));
  }
}

// -----------------------------------------------------------------------------
// 3. Poll Server Health until Ready
// -----------------------------------------------------------------------------
function waitForServer(callback, retries = 30) {
  http.get(SERVER_URL + "/api/health", (res) => {
    if (res.statusCode === 200) {
      callback();
    } else if (retries > 0) {
      setTimeout(() => waitForServer(callback, retries - 1), 300);
    } else {
      callback();
    }
  }).on('error', () => {
    if (retries > 0) {
      setTimeout(() => waitForServer(callback, retries - 1), 300);
    } else {
      callback();
    }
  });
}

// -----------------------------------------------------------------------------
// 4. Create Main Application Window
// -----------------------------------------------------------------------------
function createWindow() {
  log('[Electron] Creating Browser Window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1050,
    minHeight: 700,
    title: 'WhatsApp AI Sales Agent',
    backgroundColor: '#070B0E',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    log('[Electron] Window ready to show. Revealing window.');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`[Electron] Page load failed (${errorCode}: ${errorDescription}). Retrying in 800ms...`);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(SERVER_URL);
      }
    }, 800);
  });

  mainWindow.webContents.on('render-process-gone', (event, detailed) => {
    log('[Electron] Renderer process crashed: ' + JSON.stringify(detailed));
    mainWindow.reload();
  });

  // Enable F12 DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  log('[Electron] Loading URL: ' + SERVER_URL);
  mainWindow.loadURL(SERVER_URL);

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -----------------------------------------------------------------------------
// 5. Create System Tray Icon & Context Menu
// -----------------------------------------------------------------------------
function createTray() {
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVDhPY/wPBAwUACZGBgYGRkYkYdQARkZGUc2jBhAMR8oGBgZGJE50jXAbwMjIiGQ46tMBo34AAAQvAgN5gEAAAAAASUVORK5CYII=',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('WhatsApp AI Sales Agent (Running 24/7)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open WhatsApp Agent Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Server Port: ' + PORT + ' (Active)',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit WhatsApp Agent',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// -----------------------------------------------------------------------------
// 6. App Lifecycle Handlers
// -----------------------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    createTray();
    await startBackendServer();
    waitForServer(() => {
      createWindow();
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('window-all-closed', () => {
    // Keep running in background tray
  });
}
