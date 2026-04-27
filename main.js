const { app, BrowserWindow, globalShortcut, nativeTheme, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

let mainWindow;
let ghostWindow;

// Tracks whether the user actually wants to quit (Cmd+Q / app.quit) vs.
// just closing the window. macOS productivity apps stay alive when the
// window is closed so global shortcuts keep working.
let isQuitting = false;

// Single-instance lock: if another copy is already running, hand focus
// to it and exit. Prevents two instances racing to write today.md.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Settings directory (always ~/.today/)
const SETTINGS_DIR = path.join(os.homedir(), '.today');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

// Settings object
let settings = { tasksFilePath: null, setupComplete: false, openAtLogin: true };
let needsSetup = false;

function loadSettings() {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) {
      settings = { tasksFilePath: null, setupComplete: false };
    }
  }
  // Check if setup is needed
  if (!settings.setupComplete || !settings.tasksFilePath) {
    needsSetup = true;
  } else if (!fs.existsSync(settings.tasksFilePath)) {
    // Returning user but file is missing — re-run setup
    needsSetup = true;
  } else {
    needsSetup = false;
  }
}

function saveSettings() {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

function getTasksFile() {
  return settings.tasksFilePath;
}

// Ensure data directory and file exist at given path
function ensureDataFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    const defaultContent = `# Monthly Goals

# This Week

# Today

# Done
`;
    fs.writeFileSync(filePath, defaultContent, 'utf8');
  }
}

// Read tasks file
function readTasksFile() {
  const filePath = getTasksFile();
  ensureDataFile(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  lastWrittenHash = hashContent(content);
  return content;
}

// Write tasks file
function writeTasksFile(content) {
  const filePath = getTasksFile();
  ensureDataFile(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  lastWrittenHash = hashContent(content);
}

// File watcher
let fileWatcher = null;
// sha256 of the content the app last wrote (or last read). Watcher events whose
// disk content hashes to this value are self-induced and get filtered out;
// anything else means something edited the file out from under us.
let lastWrittenHash = null;

function setupFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
  }

  const filePath = getTasksFile();
  if (!filePath || !fs.existsSync(filePath)) return;

  fileWatcher = fs.watch(filePath, (eventType) => {
    if (eventType !== 'change' || !mainWindow) return;

    let diskContent;
    try {
      diskContent = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      return;
    }

    const diskHash = hashContent(diskContent);
    if (diskHash === lastWrittenHash) return;

    const expectedHash = lastWrittenHash;
    lastWrittenHash = diskHash;
    mainWindow.webContents.send('file-changed', { content: diskContent, expectedHash });
  });
}

function createWindow() {
  loadSettings();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 19 },
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  // Hide-on-close instead of quit. Keeps global shortcuts (Cmd+Shift+Space,
  // Cmd+Opt+N) alive and matches the convention used by Things, Notion, Linear.
  // Cmd+Q sets isQuitting=true via 'before-quit' so the real quit still works.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Send initial file content when ready
  mainWindow.webContents.on('did-finish-load', () => {
    if (needsSetup) {
      mainWindow.webContents.send('initial-load', { needsSetup: true });
    } else {
      const content = readTasksFile();
      mainWindow.webContents.send('initial-load', {
        content,
        filePath: getTasksFile(),
        openAtLogin: settings.openAtLogin !== false
      });
      setupFileWatcher();
    }
  });

  // Handle theme changes
  nativeTheme.on('updated', () => {
    mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
    mainWindow.setVibrancy('under-window');
  });

  // Register global shortcut for quick capture (Cmd+Shift+Space)
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('quick-capture');
    }
  });

  // Register Ghost Capture shortcut (Cmd+Option+N)
  globalShortcut.register('CommandOrControl+Alt+N', () => {
    createGhostWindow();
  });
}

// Create the floating ghost capture window
function createGhostWindow() {
  if (ghostWindow) {
    ghostWindow.focus();
    return;
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  ghostWindow = new BrowserWindow({
    width: 500,
    height: 60,
    x: Math.round((width - 500) / 2),
    y: Math.round(height / 3),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  ghostWindow.loadFile('ghost.html');

  ghostWindow.on('blur', () => {
    if (ghostWindow) {
      ghostWindow.close();
    }
  });

  ghostWindow.on('closed', () => {
    ghostWindow = null;
  });
}

// Handle save request from renderer
ipcMain.on('save-tasks', (event, content) => {
  writeTasksFile(content);
});

// Handle read request from renderer
ipcMain.handle('read-tasks', () => {
  return readTasksFile();
});

// Handle ghost capture submission
ipcMain.on('ghost-capture-submit', (event, taskText) => {
  if (mainWindow) {
    mainWindow.webContents.send('ghost-capture-add', taskText);
  }
  if (ghostWindow) {
    ghostWindow.close();
  }
});

ipcMain.on('ghost-capture-cancel', () => {
  if (ghostWindow) {
    ghostWindow.close();
  }
});

// Handle timer title updates
ipcMain.on('update-title', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// Open file in default editor
ipcMain.on('open-file', () => {
  const { shell } = require('electron');
  shell.openPath(getTasksFile());
});

// Choose folder for tasks file
ipcMain.handle('choose-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose where to save your tasks'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folder = result.filePaths[0];
  const fileExists = fs.existsSync(path.join(folder, 'today.md'));
  return { folder, fileExists };
});

// Complete setup
ipcMain.handle('complete-setup', async (event, { folderPath }) => {
  settings.tasksFilePath = path.join(folderPath, 'today.md');
  settings.setupComplete = true;
  saveSettings();
  ensureDataFile(settings.tasksFilePath);
  needsSetup = false;
  const content = readTasksFile();
  setupFileWatcher();
  return { content, filePath: settings.tasksFilePath };
});

// Relocate the tasks file to a new folder. Used by the in-app "Change tasks
// file location..." command after first-run setup is already complete.
// We move (rename) the existing file rather than copy+delete so any external
// editor watching the file follows it transparently on the same volume.
ipcMain.handle('change-tasks-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Move your tasks file to…'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const newFolder = result.filePaths[0];
  const newPath = path.join(newFolder, 'today.md');
  const oldPath = settings.tasksFilePath;

  if (oldPath && fs.existsSync(oldPath) && oldPath !== newPath) {
    if (fs.existsSync(newPath)) {
      // Don't clobber an existing file at the destination — let the user
      // resolve it manually rather than silently overwriting.
      return { error: 'A today.md already exists in that folder. Move or rename it first.' };
    }
    if (!fs.existsSync(newFolder)) fs.mkdirSync(newFolder, { recursive: true });
    fs.renameSync(oldPath, newPath);
  }

  settings.tasksFilePath = newPath;
  saveSettings();
  ensureDataFile(newPath);
  const content = readTasksFile();
  setupFileWatcher();
  return { content, filePath: newPath };
});

// Toggle "open at login" from the renderer's settings UI.
ipcMain.handle('set-open-at-login', (event, enabled) => {
  settings.openAtLogin = !!enabled;
  saveSettings();
  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    openAsHidden: true
  });
  return settings.openAtLogin;
});

// Standard macOS app menu — without this, no Cmd+Q binding because we set
// up a custom window that doesn't render the default menu by itself.
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  // Apply the persisted login-at-startup preference. Default is on.
  app.setLoginItemSettings({
    openAtLogin: settings.openAtLogin !== false,
    openAsHidden: true
  });
  createWindow();
});

app.on('window-all-closed', () => {
  // We deliberately don't quit on macOS — the app survives window close
  // so Cmd+Shift+Space and Cmd+Opt+N keep firing. To actually quit, use
  // Cmd+Q (which routes through 'before-quit' and sets isQuitting=true).
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  // Dock icon click: reveal the hidden window or recreate it if quit-and-relaunched.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Unregister shortcuts when quitting
app.on('will-quit', () => {
  if (fileWatcher) {
    fileWatcher.close();
  }
  globalShortcut.unregisterAll();
});
