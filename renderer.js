// renderer.js - UI handling and Microsoft authentication
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    loadVersions();
});

async function initializeUI() {
    const msLoginBtn = document.getElementById('microsoft-login-btn');
    const msStatus = document.getElementById('ms-login-status');
    const msAccount = document.getElementById('microsoft-account');
    const msPlay = document.getElementById('microsoft-play');

    if (msLoginBtn) {
        msLoginBtn.addEventListener('click', async () => {
            try {
                msStatus.textContent = 'Starting Microsoft login...';
                msLoginBtn.disabled = true;
                
                if (msAccount) msAccount.style.display = 'none';
                if (msPlay) msPlay.style.display = 'none';

                const result = await window.electronAPI.microsoftLoginStart();
                
                if (result.success) {
                    // Update UI with login success
                    msStatus.textContent = '';                    if (msAccount) {
                        msAccount.style.display = 'flex';
                        const avatar = msAccount.querySelector('#microsoft-avatar');
                        const name = msAccount.querySelector('#microsoft-name');                        if (avatar) {
                            // Use crafthead API which is more reliable
                            avatar.src = `https://crafthead.net/avatar/${result.account.id}`;
                            avatar.onerror = () => {
                                // Fallback to default avatar if loading fails
                                avatar.src = `https://crafthead.net/avatar/steve`;
                            };
                        }
                        if (name) name.textContent = result.account.name;
                    }
                    if (msPlay) msPlay.style.display = 'inline-flex';

                    // Store auth data
                    await window.electronAPI.store.set('microsoftAuth', {
                        accessToken: result.accessToken,
                        account: result.account
                    });
                } else {
                    msStatus.textContent = `Login failed: ${result.error}`;
                    console.error('Microsoft login failed:', result.error);
                }
            } catch (error) {
                msStatus.textContent = `Error: ${error.message}`;
                console.error('Login error:', error);
            } finally {
                msLoginBtn.disabled = false;
            }
        });
    }

    // Handle logout
    const msLogoutBtn = document.getElementById('microsoft-logout');
    if (msLogoutBtn) {
        msLogoutBtn.addEventListener('click', async () => {
            await window.electronAPI.store.delete('microsoftAuth');
            if (msAccount) msAccount.style.display = 'none';
            if (msPlay) msPlay.style.display = 'none';
            if (msLoginBtn) msLoginBtn.style.display = 'inline-flex';
            msStatus.textContent = 'Ready to sign in';
        });
    }

    // Handle MSMC progress events
    window.electronAPI.onAuthProgress((data) => {
        if (msStatus) {
            msStatus.textContent = data.message || 'Authenticating...';
        }
    });

    // Check if already logged in
    try {
        const auth = await window.electronAPI.store.get('microsoftAuth');
        if (auth && auth.account) {
            if (msAccount) {
                msAccount.style.display = 'flex';
                const avatar = msAccount.querySelector('#microsoft-avatar');
                const name = msAccount.querySelector('#microsoft-name');                if (avatar) {
                    avatar.src = `https://crafthead.net/avatar/${auth.account.id}`;
                    avatar.onerror = () => {
                        avatar.src = `https://crafthead.net/avatar/steve`;
                    };
                }
                if (name) name.textContent = auth.account.name;
            }
            if (msPlay) msPlay.style.display = 'inline-flex';
            if (msLoginBtn) msLoginBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
    }
}

async function loadVersions() {
    try {
        console.log('Loading versions...');
        const versions = await window.electronAPI.getVersions();
        console.log('Retrieved versions:', versions);
        
        const versionSelect = document.getElementById('version-select');
        if (!versionSelect) {
            console.error('Version select element not found');
            return;
        }

        versionSelect.innerHTML = '<option value="" disabled>Select a version</option>';
        
        if (!Array.isArray(versions) || versions.length === 0) {
            console.error('No versions available');
            versionSelect.innerHTML = '<option value="1.20.1">1.20.1</option>';
            versionSelect.value = "1.20.1";
            return;
        }

        // Add all versions to the select element
        versions.forEach(version => {
            if (!version) return;
            const option = document.createElement('option');
            option.value = version;
            
            // Format version text
            let displayText = version;
            if (version.includes('-forge-')) {
                displayText = `${version.split('-forge-')[0]} (Forge)`;
            } else if (version.includes('-fabric-')) {
                displayText = `${version.split('-fabric-')[0]} (Fabric)`;
            }
            
            option.textContent = displayText;
            versionSelect.appendChild(option);
        });

        // Try to restore last used version from settings
        try {
            const settings = await window.electronAPI.store.get('settings');
            if (settings?.lastVersion && versions.includes(settings.lastVersion)) {
                versionSelect.value = settings.lastVersion;
                console.log('Restored last used version:', settings.lastVersion);
            } else if (versions.length > 0) {
                versionSelect.value = versions[0];
                console.log('Selected first available version:', versions[0]);
            }
        } catch (error) {
            console.warn('Could not restore last version:', error);
            if (versions.length > 0) {
                versionSelect.value = versions[0];
            }
        }
    } catch (error) {
        console.error('Failed to load versions:', error);
        const versionSelect = document.getElementById('version-select');
        if (versionSelect) {
            versionSelect.innerHTML = '<option value="1.20.1">1.20.1</option>';
            versionSelect.value = "1.20.1";
        }
    }
}

async function launchGame() {
    try {
        // Get required elements
        const version = document.getElementById('version-select')?.value;
        const ramInput = document.getElementById('ram-input')?.value;
        const msStatus = document.getElementById('microsoft-status');

        if (!version) {
            throw new Error('Please select a version');
        }

        // Show launching status
        if (msStatus) {
            msStatus.textContent = 'Launching game...';
        }

        // Prepare launch options
        const options = {
            version,
            memory: {
                min: Math.max(1024, parseInt(ramInput || '2048')),
                max: Math.max(2048, parseInt(ramInput || '4096'))
            }
        };

        console.log('Launching with options:', options);
        const result = await window.electronAPI.launchMinecraft(options);

        if (result.success) {
            if (msStatus) {
                msStatus.textContent = 'Game launched successfully!';
                setTimeout(() => {
                    msStatus.textContent = '';
                }, 3000);
            }
        } else {
            throw new Error(result.error || 'Failed to launch game');
        }
    } catch (error) {
        console.error('Launch error:', error);
        const msStatus = document.getElementById('microsoft-status');
        if (msStatus) {
            msStatus.textContent = `Launch failed: ${error.message}`;
        }
    }
}

// Add play button event listener
document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.addEventListener('click', launchGame);
    }
});