// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { oauth2 } = require('electron-oauth2');
require('@electron/remote/main').initialize();

// Configura OAuth Microsoft (regístrate en portal Azure)
const msConfig = {
  clientId: 'TU_CLIENT_ID',
  clientSecret: 'TU_CLIENT_SECRET',
  authorizationUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
  useBasicAuthorizationHeader: false,
  redirectUri: 'http://localhost'
};
const msOptions = { scope: 'XboxLive.signin XboxLive.offline_access', accessType: 'offline' };

let win;
function createWindow() {
  const isMac = process.platform === 'darwin';
  win = new BrowserWindow({
    width: 900, height: 600,
    frame: false, transparent: true, resizable: false,
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    ...( !isMac && {
      titleBarOverlay: {
        color: '#00000000',
        symbolColor: '#ffffff',
        height: 32
      }
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  require('@electron/remote/main').enable(win.webContents);
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', ()=>{ if (process.platform!=='darwin') app.quit(); });

ipcMain.handle('login-ms', async () => {
  const windowParams = { alwaysOnTop: true };
  const myOAuth = oauth2(msConfig, msOptions);
  try {
    const token = await myOAuth.getAccessToken(windowParams);
    return token;
  } catch(e) {
    return { error: e.message };
  }
});

ipcMain.handle('launch-mc', async (e, auth) => {
  const { Launcher } = require('minecraft-launcher-core');
  const launcher = new Launcher();
  launcher.launch({
    clientPackage: null,
    authorization: auth,
    root: path.join(app.getPath('userData'), 'minecraft'),
    version: { number: '1.20.1', type: 'release' },
    memory: { max: '2G', min: '1G' }
  });
  return true;
});
