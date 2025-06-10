const { Auth } = require('msmc');
const { ipcMain } = require('electron');

class MicrosoftAuthManager {
    constructor() {
        this.auth = new Auth("select_account");
        this.isAuthInProgress = false;
    }    async handleMicrosoftAuth() {
        if (this.isAuthInProgress) {
            return { success: false, error: 'Authentication already in progress' };
        }

        this.isAuthInProgress = true;

        try {
            // Check if we have a valid cached token first
            if (this.lastToken && typeof this.lastToken.validate === 'function' && this.lastToken.validate()) {
                try {
                    await this.lastToken.refresh(false);
                    return {
                        success: true,
                        token: this.lastToken.mclc(true),
                        profile: {
                            id: this.lastToken.profile.id,
                            name: this.lastToken.profile.name,
                            skins: this.lastToken.profile.skins || [],
                            capes: this.lastToken.profile.capes || []
                        }
                    };
                } catch (refreshError) {
                    console.warn('Token refresh failed, proceeding with new login:', refreshError);
                }
            }

            // New login flow
            const xbox = await this.auth.launch('electron');
            if (!xbox) throw new Error('Xbox authentication failed');
            
            const mcToken = await xbox.getMinecraft();
            if (!mcToken) throw new Error('Could not get Minecraft token');

            // Store token for later use
            this.lastToken = mcToken;

            return {
                success: true,
                token: mcToken.mclc(true),  // Get refreshable MCLC compatible token
                profile: {
                    id: mcToken.profile.id,
                    name: mcToken.profile.name,
                    skins: mcToken.profile.skins || [],
                    capes: mcToken.profile.capes || []
                }
            };
        } catch (error) {
            console.error('Microsoft auth error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        } finally {
            this.isAuthInProgress = false;
        }
    }

    getLastToken() {
        return this.lastToken && typeof this.lastToken.mclc === 'function' ? this.lastToken : null;
    }

    getErrorMessage(error) {
        // Handle MSMC's error codes
        if (error.errorCode === 'error.auth.xsts.userNotFound') {
            return 'The Microsoft account does not have an Xbox account';
        }
        if (error.errorCode === 'error.auth.xsts.child') {
            return 'This account is for a child (under 18) and requires parental consent';
        }
        if (error.errorCode === 'error.auth.xsts.bannedCountry') {
            return 'Xbox Live is not available in your country';
        }
        if (error.errorCode === 'error.auth.xsts.child.SK') {
            return 'South Korean law: Parental consent required';
        }
        if (error.errorCode === 'error.auth.minecraft.login') {
            return 'Failed to authenticate with Minecraft services';
        }
        if (error.errorCode === 'error.auth.minecraft.profile') {
            return 'Failed to fetch Minecraft profile';
        }
        return error.message || 'An unknown error occurred';
    }
}

function setupMicrosoftAuth() {
    if (!global.microsoftAuth) {
        global.microsoftAuth = new MicrosoftAuthManager();
    }    ipcMain.removeHandler('microsoft-auth-start');
    ipcMain.handle('microsoft-auth-start', () => {
        return global.microsoftAuth.handleMicrosoftAuth();
    });
}

module.exports = {
    setupMicrosoftAuth
};
