// store.js - Secure store logic with error handling
const Store = require('electron-store');
const fs = require('fs-extra');
const path = require('path');

function setupStore() {
    // Default configuration
    const defaults = {
        settings: {
            memory: {
                min: 2048,
                max: 4096
            },
            window: {
                width: 856,
                height: 482
            },
            javaPath: '',
            gameDir: '',
            lastVersion: '1.20.1',
        }
    };

    try {
        // Try to create store with defaults
        const store = new Store({
            name: 'pixelplay-config',
            defaults,
            clearInvalidConfig: true, // Clear config if it's invalid
            encryptionKey: 'your-encryption-key' // Add encryption for sensitive data
        });

        // Verify store integrity
        try {
            store.get('settings');
        } catch (error) {
            console.error('Store corrupted, resetting to defaults:', error);
            store.clear(); // Clear corrupted data
            store.set(defaults); // Reset to defaults
        }        return {
            get: (key) => {
                try {
                    return store.get(key);
                } catch (error) {
                    console.error('Error reading from store:', error);
                    return defaults[key];
                }
            },
            set: (key, value) => {
                try {
                    store.set(key, value);
                    return true;
                } catch (error) {
                    console.error('Error writing to store:', error);
                    return false;
                }
            },
            delete: (key) => {
                try {
                    store.delete(key);
                    return true;
                } catch (error) {
                    console.error('Error deleting from store:', error);
                    return false;
                }
            },
            getSettings: () => {
                try {
                    return store.get('settings') || defaults.settings;
                } catch (error) {
                    console.error('Error reading settings:', error);
                    return defaults.settings;
                }
            },
            setSetting: (key, value) => {
                try {
                    const settings = store.get('settings') || defaults.settings;
                    settings[key] = value;
                    store.set('settings', settings);
                    return true;
                } catch (error) {
                    console.error('Error saving setting:', error);
                    return false;
                }
            },

            // Version management
            setLastVersion: (version) => {
                try {
                    store.set('settings.lastVersion', version);
                    return true;
                } catch (error) {
                    console.error('Error saving version:', error);
                    return false;
                }
            },
            getLastVersion: () => {
                try {
                    return store.get('settings.lastVersion') || defaults.settings.lastVersion;
                } catch (error) {
                    console.error('Error reading version:', error);
                    return defaults.settings.lastVersion;
                }
            },

            // Direct store access with error handling
            get: (key) => {
                try {
                    return store.get(key);
                } catch (error) {
                    console.error(`Error reading key ${key}:`, error);
                    return null;
                }
            },
            set: (key, value) => {
                try {
                    store.set(key, value);
                    return true;
                } catch (error) {
                    console.error(`Error setting key ${key}:`, error);
                    return false;
                }
            },
            delete: (key) => {
                try {
                    store.delete(key);
                    return true;
                } catch (error) {
                    console.error(`Error deleting key ${key}:`, error);
                    return false;
                }
            }
        };
    } catch (error) {
        console.error('Critical error setting up store:', error);
        // Return failsafe store that only uses memory
        return {
            _memoryStore: { ...defaults },
            getSettings: () => ({ ...defaults.settings }),
            setSetting: (key, value) => {
                this._memoryStore.settings[key] = value;
                return true;
            },
            setLastVersion: (version) => {
                this._memoryStore.settings.lastVersion = version;
                return true;
            },
            getLastVersion: () => defaults.settings.lastVersion,
            get: (key) => this._memoryStore[key],
            set: (key, value) => {
                this._memoryStore[key] = value;
                return true;
            },
            delete: (key) => {
                delete this._memoryStore[key];
                return true;
            }
        };
    }
}

module.exports = {
    setupStore
};
