// preload.js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  loginMS: () => ipcRenderer.invoke('login-ms'),
  launchMC: (auth) => ipcRenderer.invoke('launch-mc', auth)
});
