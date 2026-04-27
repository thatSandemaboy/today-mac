const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');

contextBridge.exposeInMainWorld('todayAPI', {
  saveTasks: (content) => ipcRenderer.send('save-tasks', content),
  updateTitle: (title) => ipcRenderer.send('update-title', title),
  openFile: () => ipcRenderer.send('open-file'),
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  completeSetup: (folderPath) => ipcRenderer.invoke('complete-setup', { folderPath }),
  changeTasksFile: () => ipcRenderer.invoke('change-tasks-file'),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke('set-open-at-login', enabled),
  ghostCaptureSubmit: (taskText) => ipcRenderer.send('ghost-capture-submit', taskText),
  ghostCaptureCancel: () => ipcRenderer.send('ghost-capture-cancel'),
  getDefaultTasksFolder: () => path.join(os.homedir(), '.today'),
  onInitialLoad: (callback) => ipcRenderer.on('initial-load', (_event, data) => callback(data)),
  onFileChanged: (callback) => ipcRenderer.on('file-changed', (_event, payload) => callback(payload)),
  onQuickCapture: (callback) => ipcRenderer.on('quick-capture', () => callback()),
  onGhostCaptureAdd: (callback) => ipcRenderer.on('ghost-capture-add', (_event, taskText) => callback(taskText))
});
