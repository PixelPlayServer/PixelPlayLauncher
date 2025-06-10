// launch.js (logic from src/utils/launch.js, flat for Fiddle)
// This is a placeholder for your Minecraft launching logic.

// launch.js for Fiddle - placeholder for Minecraft launching logic
// Implement game launching logic here, using @xmcl/core or similar libraries.
// Use IPC or contextBridge to communicate with main/preload.

const path = require('path');
const { app } = require('electron');
const MinecraftLauncher = require('./minecraft');

class GameLauncher {
    #store;
    #gameDir;
    #minecraft;

    constructor(store) {
        this.#store = store;
        // Use the client directory in the root folder
        this.#gameDir = path.join(__dirname, 'client');
        this.#minecraft = new MinecraftLauncher(this.#gameDir);
    }

    async getVersions() {
        try {
            return await this.#minecraft.getVersions();
        } catch (error) {
            console.error('Failed to get versions:', error);
            throw error;
        }
    }    async launch(options) {
        console.log('Launch called with options:', options);
        const {
            version = '1.20.1',
            ramMB = 4096,
            account = null
        } = options;

        if (!version) {
            throw new Error('Version must be specified');
        }

        // Prepare launch options
        const launchOptions = {
            version,
            gameDirectory: this.#gameDir,
            memory: {
                min: Math.min(ramMB, 2048), // At least 2GB minimum
                max: ramMB
            },
            window: { 
                width: 856, 
                height: 482 
            },
            auth: account,  // Pass the account info through
            extraJavaArgs: [
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+UseG1GC',
                '-XX:G1NewSizePercent=20',
                '-XX:G1ReservePercent=20',
                '-XX:MaxGCPauseMillis=50',
                '-XX:G1HeapRegionSize=32M'
            ]
        };

        console.log('Final launch options:', JSON.stringify(launchOptions, null, 2));

        // Launch the game
        try {
            const process = await this.#minecraft.launch(launchOptions);
            
            // Save last used version
            await this.#store.setLastVersion(version);
            
            return process;
        } catch (error) {
            console.error('Launch error:', error);
            throw new Error('Failed to launch game: ' + error.message);
        }
    }

    async validateInstallation() {
        return this.#minecraft.validateInstallation();
    }
}

module.exports = GameLauncher;
