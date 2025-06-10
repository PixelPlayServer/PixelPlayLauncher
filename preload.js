// preload.js
const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  windowAction: (action) => ipcRenderer.send('window-action', action),

  // Minecraft Launch
  launchMinecraft: (options) => ipcRenderer.invoke('launch-minecraft', options),
  getVersions: () => ipcRenderer.invoke('get-versions'),
  onLaunchError: (callback) => { // For global errors shown in main window
    const handler = (_event, msg) => callback(msg);
    ipcRenderer.on('launch-error', handler);
    return () => ipcRenderer.removeListener('launch-error', handler);
  },

  // Store API (backed by electron-store in main process)
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
  },

  // Direct localStorage access (for non-critical or UI-only state)
  localStorageGet: (key) => localStorage.getItem(key),
  localStorageSet: (key, value) => localStorage.setItem(key, value),
  localStorageDelete: (key) => localStorage.removeItem(key),
  // Version management
  getVersions: () => ipcRenderer.invoke('get-versions'),

  // Microsoft Authentication
  microsoftLoginStart: () => ipcRenderer.invoke('microsoft-auth-start'),
  onDeviceCode: (callback) => {
    ipcRenderer.on('microsoft-device-code', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('microsoft-device-code', callback);
  },
  onAuthProgress: (callback) => {
    ipcRenderer.on('auth-progress', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('auth-progress', callback);
  },

  // External URL opening
  openExternal: (url) => shell.openExternal(url),
});

// Handle Microsoft device code event
ipcRenderer.on('microsoft-device-code', (_, data) => {
  // Dispatch a custom event that the renderer can listen to
  window.dispatchEvent(new CustomEvent('microsoft-device-code', { 
      detail: data 
  }));
});

console.log('PixelPlay preload.js executed');