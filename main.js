const { app, BrowserWindow, globalShortcut, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let ghostWindow;

// Markdown file path
const DATA_DIR = path.join(os.homedir(), '.today');
const TASKS_FILE = path.join(DATA_DIR, 'today.md');

// Ensure data directory and file exist
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TASKS_FILE)) {
    const defaultContent = `# Monthly Goals

# This Week

# Today

# Done
`;
    fs.writeFileSync(TASKS_FILE, defaultContent, 'utf8');
  }
  return TASKS_FILE;
}

// Read tasks file
function readTasksFile() {
  ensureDataFile();
  return fs.readFileSync(TASKS_FILE, 'utf8');
}

// Write tasks file
function writeTasksFile(content) {
  ensureDataFile();
  fs.writeFileSync(TASKS_FILE, content, 'utf8');
}

// File watcher
let fileWatcher = null;
let lastWriteTime = 0;

function setupFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = fs.watch(TASKS_FILE, (eventType) => {
    // Ignore changes we just made (within 1 second)
    if (Date.now() - lastWriteTime < 1000) return;

    if (eventType === 'change' && mainWindow) {
      const content = readTasksFile();
      mainWindow.webContents.send('file-changed', content);
    }
  });
}

function createWindow() {
  ensureDataFile();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 19 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Send initial file content when ready
  mainWindow.webContents.on('did-finish-load', () => {
    const content = readTasksFile();
    mainWindow.webContents.send('initial-load', { content, filePath: TASKS_FILE });
  });

  // Setup file watcher
  setupFileWatcher();

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
  shell.openPath(TASKS_FILE);
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
