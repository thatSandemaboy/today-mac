const { app, BrowserWindow, globalShortcut, nativeTheme, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let ghostWindow;

// Settings directory (always ~/.today/)
const SETTINGS_DIR = path.join(os.homedir(), '.today');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

// Settings object
let settings = { tasksFilePath: null, setupComplete: false };
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
  return fs.readFileSync(filePath, 'utf8');
}

// Write tasks file
function writeTasksFile(content) {
  const filePath = getTasksFile();
  ensureDataFile(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

// File watcher
let fileWatcher = null;
let lastWriteTime = 0;

function setupFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
  }

  const filePath = getTasksFile();
  if (!filePath || !fs.existsSync(filePath)) return;

  fileWatcher = fs.watch(filePath, (eventType) => {
    // Ignore changes we just made (within 1 second)
    if (Date.now() - lastWriteTime < 1000) return;

    if (eventType === 'change' && mainWindow) {
      const content = readTasksFile();
      mainWindow.webContents.send('file-changed', content);
    }
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
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Send initial file content when ready
  mainWindow.webContents.on('did-finish-load', () => {
    if (needsSetup) {
      mainWindow.webContents.send('initial-load', { needsSetup: true });
    } else {
      const content = readTasksFile();
      mainWindow.webContents.send('initial-load', { content, filePath: getTasksFile() });
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
      nodeIntegration: true,
      contextIsolation: false
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
  lastWriteTime = Date.now();
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
  const content = fs.readFileSync(settings.tasksFilePath, 'utf8');
  setupFileWatcher();
  return { content, filePath: settings.tasksFilePath };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (fileWatcher) {
    fileWatcher.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Unregister shortcuts when quitting
app.on('will-quit', () => {
  if (fileWatcher) {
    fileWatcher.close();
  }
  globalShortcut.unregisterAll();
});
