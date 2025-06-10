// main.js for Electron app
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { setupStore } = require('./store');
const GameLauncher = require('./launch');
const ConfigManager = require('./configmanager');
const { setupMicrosoftAuth } = require('./microsoftAuth');
const fs = require('fs-extra');

// Initialize core components
let mainWindow = null;
let storeAPI = null;
let launcher = null;

// Create main window
function createWindow() {    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true,
            devTools: false // Disable devTools in production
        },
        frame: false,
        show: false,
        backgroundColor: '#1a1a1a'
    });

    // Make the window available globally for auth
    global.mainWindow = mainWindow;

    mainWindow.loadFile('main.html');
    mainWindow.once('ready-to-show', () => mainWindow.show());    // DevTools disabled by default
}

// Version management
ipcMain.handle('get-versions', async () => {
    try {
        if (!launcher) {
            console.error('Launcher not initialized');
            return ['1.20.1'];
        }
        
        const versions = await launcher.getVersions();
        console.log('Versions from launcher:', versions);
        return versions;
    } catch (error) {
        console.error('Error getting versions:', error);
        return ['1.20.1']; // Fallback version
    }
});

// Microsoft auth handler - update this section
ipcMain.handle('microsoft-auth-start', async () => {
    try {
        // Remove any existing handlers
        ipcMain.removeHandler('microsoft-auth-start');
        
        if (!global.microsoftAuth) {
            setupMicrosoftAuth();
        }
        
        const result = await global.microsoftAuth.handleMicrosoftAuth();
        if (result.success && storeAPI) {
            await storeAPI.set('microsoftAuth', result);
        }
        return result;
    } catch (error) {
        console.error('Microsoft auth error:', error);
        return {
            success: false,
            error: error.message || 'Authentication failed'
        };
    }
});

// Store handlers
ipcMain.handle('store-get', async (_, key) => {
    return storeAPI.get(key);
});

ipcMain.handle('store-set', async (_, key, value) => {
    return storeAPI.set(key, value);
});

ipcMain.handle('store-delete', async (_, key) => {
    return storeAPI.delete(key);
});

// Window control
ipcMain.on('window-action', (_, action) => {
    if (!mainWindow) return;
    
    switch (action) {
        case 'minimize':
            mainWindow.minimize();
            break;
        case 'maximize':
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
            break;
        case 'close':
            mainWindow.close();
            break;
    }
});

// Launch handler
ipcMain.handle('launch-minecraft', async (event, options) => {
    try {
        if (!launcher) {
            throw new Error('Launcher not initialized');
        }

        console.log('Launch request received with options:', options);
          // Add authentication token if available
        if (global.microsoftAuth) {
            const mcToken = global.microsoftAuth.getLastToken();
            if (mcToken && typeof mcToken.mclc === 'function') {
                const auth = mcToken.mclc(true); // Get refreshable token
                console.log('Converting MSMC token to MCLC format');
                options.auth = auth;
            }
        }
        
        await launcher.launch(options);
        return { success: true };
    } catch (error) {
        console.error('Launch error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Initialize the application - update this section
async function initializeApp() {
    try {
        // Initialize core services first
        storeAPI = await setupStore();
        launcher = new GameLauncher(storeAPI);
        
        // Create window first
        createWindow();

        // Remove any existing handlers
        ['get-versions', 'launch-minecraft', 'store-get', 'store-set', 'store-delete']
            .forEach(channel => {
                try { ipcMain.removeHandler(channel); } catch {}
            });

        // Register store handlers
        ipcMain.handle('store-get', async (_, key) => storeAPI.get(key));
        ipcMain.handle('store-set', async (_, key, value) => storeAPI.set(key, value));
        ipcMain.handle('store-delete', async (_, key) => storeAPI.delete(key));

        // Register version handler
        ipcMain.handle('get-versions', async () => {
            try {
                return await launcher.getVersions();
            } catch (error) {
                console.error('Error getting versions:', error);
                return ['1.20.1']; // Fallback version
            }
        });
        
        // Then setup auth after window is ready
        mainWindow.webContents.on('did-finish-load', () => {
            setupMicrosoftAuth();
        });

        // Setup launch handler
        ipcMain.handle('launch-minecraft', async (_, options) => {
            try {
                console.log('Launching Minecraft with options:', options);
                if (!launcher) {
                    throw new Error('Launcher not initialized');
                }

                await launcher.launch(options);
                return { success: true };
            } catch (error) {
                console.error('Launch error:', error);
                return {
                    success: false,
                    error: error.message || 'Failed to launch game'
                };
            }
        });
    } catch (error) {
        console.error('Failed to initialize app:', error);
        app.quit();
    }
}

// App lifecycle
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
