// minecraft.js (logic from src/services/minecraft.js, flat for Fiddle)
// This is a placeholder for your Minecraft service logic.
// Implement profile, version, or other Minecraft-related helpers here.
// Implement profile, version, or other Minecraft-related helpers here.

const { launch } = require('@xmcl/core');
const { MinecraftFolder } = require('@xmcl/core');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function findJavaPath() {
    const isWindows = os.platform() === 'win32';
    const possiblePaths = [];
    
    if (isWindows) {
        // Windows Java paths
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        
        possiblePaths.push(
            path.join(programFiles, 'Java'),
            path.join(programFiles, 'Eclipse Adoptium'),
            path.join(programFiles, 'Eclipse Foundation'),
            path.join(programFiles, 'Microsoft'),
            path.join(programFilesX86, 'Java'),
            path.join(programFilesX86, 'Eclipse Adoptium'),
            path.join(programFilesX86, 'Eclipse Foundation'),
            path.join(programFilesX86, 'Microsoft')
        );
    } else {
        // Unix-like Java paths
        possiblePaths.push(
            '/usr/bin',
            '/usr/lib/jvm',
            '/Library/Java/JavaVirtualMachines'
        );
    }

    for (const basePath of possiblePaths) {
        if (!await fs.pathExists(basePath)) continue;

        const javaExe = isWindows ? 'java.exe' : 'java';
        const items = await fs.readdir(basePath, { withFileTypes: true });
        
        for (const item of items) {
            if (!item.isDirectory()) continue;
            
            const javaPath = path.join(basePath, item.name, 'bin', javaExe);
            if (await fs.pathExists(javaPath)) {
                return javaPath;
            }

            // Check one level deeper
            const binPath = path.join(basePath, item.name);
            try {
                const subItems = await fs.readdir(binPath, { withFileTypes: true });
                for (const subItem of subItems) {
                    if (!subItem.isDirectory()) continue;
                    const subJavaPath = path.join(binPath, subItem.name, 'bin', javaExe);
                    if (await fs.pathExists(subJavaPath)) {
                        return subJavaPath;
                    }
                }
            } catch (err) {
                // Skip if can't read directory
                continue;
            }
        }
    }

    // Fallback to system Java
    return isWindows ? 'javaw.exe' : 'java';
}

class MinecraftLauncher {
    constructor(gameDir) {
        if (!gameDir) {
            throw new Error('Game directory must be provided');
        }
        this.gameDir = gameDir;
    }

    async validateInstallation() {
        // Ensure game directory exists and has required folders
        if (!await fs.pathExists(this.gameDir)) {
            throw new Error('Minecraft instance directory not found');
        }
        
        // These folders should already exist in the instance
        const requiredFolders = ['versions', 'assets', 'libraries'];
        for (const folder of requiredFolders) {
            const folderPath = path.join(this.gameDir, folder);
            if (!await fs.pathExists(folderPath)) {
                throw new Error(`Required folder "${folder}" not found in instance directory`);
            }
        }
    }    async launch(options) {
        const {
            version,
            gameDirectory,
            memory = { min: 2048, max: 4096 },
            window = { width: 856, height: 482 },
            auth = null
        } = options;

        console.log('Starting game launch...');
        console.log('Game directory:', this.gameDir);
        console.log('Version:', version);

        if (!version) {
            throw new Error('Version must be specified');
        }

        await this.validateInstallation();
        const javaPath = await findJavaPath();
        
        // Setup the absolute game directory
        const absoluteGameDir = path.resolve(gameDirectory || this.gameDir);
        
        // Find and validate version
        const versionsDir = path.join(absoluteGameDir, 'versions');
        const versionFolders = await fs.readdir(versionsDir);
        
        const exactMatch = versionFolders.find(folder => folder === version);
        const matchingVersions = exactMatch ? [exactMatch] : versionFolders.filter(folder => folder.startsWith(version));
        
        if (matchingVersions.length === 0) {
            throw new Error(`No version found for Minecraft ${version}`);
        }
        
        const fullVersion = matchingVersions.sort().pop();
        const versionFolder = path.join(versionsDir, fullVersion);
        const versionJsonPath = path.join(versionFolder, `${fullVersion}.json`);
        
        if (!await fs.pathExists(versionJsonPath)) {
            throw new Error(`Version JSON not found at: ${versionJsonPath}`);
        }

        // Read version JSON
        const versionJson = await fs.readJson(versionJsonPath);

        // Configure launch options
        const launchOptions = {
            version: {
                number: fullVersion,
                type: versionJson.type || 'release',
                custom: versionJson.custom || false
            },
            memory: {
                max: `${memory.max}M`,
                min: `${memory.min}M`
            },
            window: {
                width: window.width,
                height: window.height,
                fullscreen: false
            },
            overrides: {
                detached: false
            },
            root: absoluteGameDir,
            gamePath: absoluteGameDir,
            javaPath: javaPath,
            authorization: auth ? {
                access_token: auth.access_token || '',
                client_token: auth.client_token || '',
                uuid: auth.uuid || '',
                name: auth.name || 'Player',
                user_properties: auth.user_properties || '{}',
                meta: {
                    type: auth.type === 'microsoft' ? 'msa' : 'offline',
                    xuid: auth.meta?.xuid || '',
                    demo: false
                }
            } : {
                access_token: '',
                client_token: '',
                uuid: '',
                name: 'Player',
                user_properties: '{}',
                meta: {
                    type: 'offline',
                    demo: false
                }
            }
        };

        console.log('Final launch options:', JSON.stringify(launchOptions, null, 2));

        try {
            const process = await launch(launchOptions);
            return process;
        } catch (error) {
            console.error('Launch error:', error);
            throw new Error('Failed to launch game: ' + error.message);
        }
    }    async getVersions() {
        try {
            const versionsDir = path.join(this.gameDir, 'versions');
            console.log('Looking for versions in:', versionsDir);
            
            if (!await fs.pathExists(versionsDir)) {
                console.error('Versions directory not found:', versionsDir);
                return ['1.20.1'];
            }
            
            console.log('Found versions directory');            // Get all items in the versions directory
            const items = await fs.readdir(versionsDir);
            console.log('Items in versions directory:', items);
            
            // Filter out the manifest files and non-directories
            const versionFolders = items.filter(item => {
                if (item === 'jre_manifest.json' || item === 'version_manifest_v2.json') {
                    return false;
                }
                
                const fullPath = path.join(versionsDir, item);
                try {
                    const isDir = fs.statSync(fullPath).isDirectory();
                    console.log(`Checking ${item}: ${isDir ? 'is directory' : 'not directory'}`);
                    return isDir;
                } catch (err) {
                    console.error(`Error checking ${item}:`, err);
                    return false;
                }
            });            // Validate each version folder has a json file
            const validVersions = versionFolders.filter(folder => {
                const versionJsonPath = path.join(versionsDir, folder, `${folder}.json`);
                try {
                    const hasJson = fs.existsSync(versionJsonPath);
                    console.log(`Checking ${folder} for json:`, hasJson ? 'found' : 'not found', versionJsonPath);
                    return hasJson;
                } catch (err) {
                    console.error(`Error checking json for ${folder}:`, err);
                    return false;
                }
            });

            // Custom version sorting function
            const sortVersions = (a, b) => {
                // Extract version components and forge/loader info
                const parseVersion = (ver) => {
                    const parts = ver.split('-');
                    const version = parts[0];
                    const [major, minor, patch] = version.split('.').map(n => parseInt(n) || 0);
                    const isPreRelease = version.includes('pre') || version.includes('rc');
                    const modLoader = parts[1] || '';
                    return { major, minor, patch, isPreRelease, modLoader };
                };

                const verA = parseVersion(a);
                const verB = parseVersion(b);

                // Compare major version
                if (verA.major !== verB.major) return verB.major - verA.major;
                // Compare minor version
                if (verA.minor !== verB.minor) return verB.minor - verA.minor;
                // Compare patch version
                if (verA.patch !== verB.patch) return verB.patch - verA.patch;
                // Pre-releases come after full releases
                if (verA.isPreRelease !== verB.isPreRelease) {
                    return verA.isPreRelease ? -1 : 1;
                }
                // Sort by mod loader if everything else is equal
                return verA.modLoader.localeCompare(verB.modLoader);
            };

            // Sort the versions
            const sortedVersions = validVersions.sort(sortVersions);

            console.log('Available versions in client folder:', sortedVersions);
            if (sortedVersions.length === 0) {
                return ['1.20.1']; // Fallback version if no versions found
            }

            return sortedVersions;
        } catch (error) {
            console.error('Error reading versions:', error);
            return ['1.20.1']; // Fallback version on error
        }
    }
}

module.exports = MinecraftLauncher;
