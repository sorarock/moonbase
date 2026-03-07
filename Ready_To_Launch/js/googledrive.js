/* ============================================================================
   GOOGLE DRIVE API MANAGER
   OAuth 2.0 integration for persistent cloud storage
   ============================================================================ */

const GoogleDriveManager = {
    // OAuth Configuration
    CLIENT_ID: '307637927420-8qkiq4kv1ncvvmlsa8ka9b67id9tiko6.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.appdata',
    DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],

    // State
    isAuthenticated: false,
    tokenClient: null,
    gapiInitialized: false,
    gisInitialized: false,

    /**
     * Initialize Google API client
     * @returns {Promise<boolean>} Success status
     */
    async init() {
        try {
            console.log('Initializing Google Drive API...');

            // Initialize Google API Platform library
            await this.initializeGapiClient();

            // Initialize Google Identity Services
            await this.initializeGisClient();

            console.log('✓ Google Drive API initialized');
            return true;

        } catch (error) {
            console.error('Failed to initialize Google Drive API:', error);
            return false;
        }
    },

    /**
     * Initialize Google API client (gapi)
     */
    initializeGapiClient() {
        return new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                reject(new Error('Google API client not loaded'));
                return;
            }

            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        discoveryDocs: this.DISCOVERY_DOCS
                    });

                    this.gapiInitialized = true;
                    console.log('✓ GAPI client initialized');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    },

    /**
     * Initialize Google Identity Services (GIS)
     */
    initializeGisClient() {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined' || !google.accounts) {
                reject(new Error('Google Identity Services not loaded'));
                return;
            }

            try {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: (response) => {
                        if (response.error) {
                            console.error('OAuth error:', response);
                            this.isAuthenticated = false;
                            return;
                        }

                        // Store access token in sessionStorage (cleared on browser close)
                        sessionStorage.setItem('gdrive_token', response.access_token);
                        sessionStorage.setItem('gdrive_token_expiry', Date.now() + (response.expires_in * 1000));

                        this.isAuthenticated = true;
                        console.log('✓ Google Drive authenticated');

                        // Save user email to settings
                        this.getUserInfo().then(userInfo => {
                            const settings = StorageManager.getSettings();
                            settings.googleEmail = userInfo.emailAddress;
                            StorageManager.saveSettings(settings);
                        });
                    }
                });

                this.gisInitialized = true;
                console.log('✓ GIS client initialized');
                resolve();

            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Check if already authenticated (token still valid)
     * @returns {Promise<boolean>} Authentication status
     */
    async checkAuth() {
        const token = sessionStorage.getItem('gdrive_token');
        const expiry = sessionStorage.getItem('gdrive_token_expiry');

        if (!token || !expiry) {
            this.isAuthenticated = false;
            return false;
        }

        // Check if token expired
        if (Date.now() >= parseInt(expiry)) {
            console.log('Google Drive token expired');
            sessionStorage.removeItem('gdrive_token');
            sessionStorage.removeItem('gdrive_token_expiry');
            this.isAuthenticated = false;
            return false;
        }

        // Set token for gapi client
        gapi.client.setToken({ access_token: token });
        this.isAuthenticated = true;

        console.log('✓ Google Drive authentication valid');
        return true;
    },

    /**
     * Authenticate with Google (OAuth 2.0 flow)
     * @returns {Promise<boolean>} Success status
     */
    async authenticate() {
        if (!this.gisInitialized) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            try {
                // Set callback for this specific authentication request
                const originalCallback = this.tokenClient.callback;

                this.tokenClient.callback = (response) => {
                    // Call original callback
                    originalCallback(response);

                    // Resolve promise
                    if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(true);
                    }

                    // Restore original callback
                    this.tokenClient.callback = originalCallback;
                };

                // Trigger OAuth flow
                this.tokenClient.requestAccessToken({ prompt: '' });

            } catch (error) {
                console.error('Authentication error:', error);
                reject(error);
            }
        });
    },

    /**
     * Get user info (email)
     * @returns {Promise<object>} User info
     */
    async getUserInfo() {
        try {
            const response = await gapi.client.drive.about.get({
                fields: 'user'
            });

            return response.result.user;
        } catch (error) {
            console.error('Failed to get user info:', error);
            return { emailAddress: 'Unknown' };
        }
    },

    /**
     * Upload file to appDataFolder
     * @param {string} filename - File name
     * @param {object} data - Data to save
     * @returns {Promise<string>} File ID
     */
    async uploadFile(filename, data) {
        try {
            const content = JSON.stringify(data, null, 2);
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            // Check if file already exists
            const existingFile = await this.findFile(filename);

            const metadata = {
                name: filename,
                mimeType: 'application/json',
                parents: ['appDataFolder']
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                content +
                close_delim;

            let response;

            if (existingFile) {
                // Update existing file
                response = await gapi.client.request({
                    path: '/upload/drive/v3/files/' + existingFile.id,
                    method: 'PATCH',
                    params: { uploadType: 'multipart' },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    body: multipartRequestBody
                });
            } else {
                // Create new file
                response = await gapi.client.request({
                    path: '/upload/drive/v3/files',
                    method: 'POST',
                    params: { uploadType: 'multipart' },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    body: multipartRequestBody
                });
            }

            return response.result.id;

        } catch (error) {
            console.error(`Failed to upload file ${filename}:`, error);
            throw error;
        }
    },

    /**
     * Download file from appDataFolder
     * @param {string} filename - File name
     * @returns {Promise<object|null>} File content or null
     */
    async downloadFile(filename) {
        try {
            // Find file
            const file = await this.findFile(filename);

            if (!file) {
                console.log(`File not found: ${filename}`);
                return null;
            }

            // Download content
            const response = await gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media'
            });

            return response.result;

        } catch (error) {
            console.error(`Failed to download file ${filename}:`, error);
            return null;
        }
    },

    /**
     * Find file in appDataFolder
     * @param {string} filename - File name
     * @returns {Promise<object|null>} File metadata or null
     */
    async findFile(filename) {
        try {
            const response = await gapi.client.drive.files.list({
                spaces: 'appDataFolder',
                fields: 'files(id, name, modifiedTime)',
                pageSize: 100,
                q: `name='${filename}'`
            });

            const files = response.result.files;
            return files && files.length > 0 ? files[0] : null;

        } catch (error) {
            console.error(`Failed to find file ${filename}:`, error);
            return null;
        }
    },

    /**
     * List all files in appDataFolder
     * @returns {Promise<array>} List of files
     */
    async listFiles() {
        try {
            const response = await gapi.client.drive.files.list({
                spaces: 'appDataFolder',
                fields: 'files(id, name, modifiedTime, size)',
                pageSize: 100
            });

            return response.result.files || [];

        } catch (error) {
            console.error('Failed to list files:', error);
            return [];
        }
    },

    /**
     * Sync all data TO Google Drive
     * @returns {Promise<boolean>} Success status
     */
    async syncToCloud() {
        if (!this.isAuthenticated) {
            console.log('Not authenticated, attempting to authenticate...');
            try {
                await this.authenticate();
            } catch (error) {
                Utils.showNotification('Please authenticate with Google Drive', 'error');
                return false;
            }
        }

        try {
            Utils.showNotification('Syncing to Google Drive...', 'info', 1000);
            console.log('Starting cloud sync...');

            // Get all data from localStorage
            const dataToSync = {};
            for (const key of Object.values(StorageManager.KEYS)) {
                if (key !== 'CLOUD_FOLDER') {
                    dataToSync[key] = StorageManager.loadFromLocal(key);
                }
            }

            // Upload each data type
            let uploadedCount = 0;
            for (const [key, data] of Object.entries(dataToSync)) {
                const filename = `${key}.json`;
                await this.uploadFile(filename, data);
                uploadedCount++;
            }

            // Update last sync time
            const settings = StorageManager.getSettings();
            settings.lastSync = new Date().toISOString();
            StorageManager.saveSettings(settings);

            console.log(`✓ Synced ${uploadedCount} files to Google Drive`);
            Utils.showNotification('✓ Synced to Google Drive', 'success');
            return true;

        } catch (error) {
            console.error('Cloud sync failed:', error);
            Utils.showNotification('Failed to sync to Google Drive', 'error');
            return false;
        }
    },

    /**
     * Load all data FROM Google Drive
     * @returns {Promise<boolean>} Success status
     */
    async loadFromCloud() {
        if (!this.isAuthenticated) {
            console.log('Not authenticated, attempting to authenticate...');
            try {
                await this.authenticate();
            } catch (error) {
                Utils.showNotification('Please authenticate with Google Drive', 'error');
                return false;
            }
        }

        try {
            Utils.showNotification('Loading from Google Drive...', 'info', 1000);
            console.log('Loading data from cloud...');

            let filesLoaded = 0;

            // Load each data type
            for (const key of Object.values(StorageManager.KEYS)) {
                if (key !== 'CLOUD_FOLDER') {
                    const filename = `${key}.json`;
                    const data = await this.downloadFile(filename);

                    if (data !== null) {
                        StorageManager.saveToLocal(key, data);
                        filesLoaded++;
                    }
                }
            }

            if (filesLoaded > 0) {
                console.log(`✓ Loaded ${filesLoaded} files from Google Drive`);
                Utils.showNotification(`✓ Loaded ${filesLoaded} files from cloud`, 'success');

                // Reload page to reflect changes
                if (confirm('Data loaded successfully. Reload page to see changes?')) {
                    window.location.reload();
                }
                return true;
            } else {
                Utils.showNotification('No data found in Google Drive', 'warning');
                return false;
            }

        } catch (error) {
            console.error('Failed to load from cloud:', error);
            Utils.showNotification('Failed to load from Google Drive', 'error');
            return false;
        }
    },

    /**
     * Sign out from Google
     */
    signOut() {
        const token = sessionStorage.getItem('gdrive_token');

        if (token) {
            // Revoke token
            google.accounts.oauth2.revoke(token, () => {
                console.log('Google Drive token revoked');
            });
        }

        // Clear stored credentials
        sessionStorage.removeItem('gdrive_token');
        sessionStorage.removeItem('gdrive_token_expiry');
        gapi.client.setToken(null);

        this.isAuthenticated = false;

        // Clear email from settings
        const settings = StorageManager.getSettings();
        delete settings.googleEmail;
        StorageManager.saveSettings(settings);

        console.log('✓ Signed out from Google Drive');
        Utils.showNotification('Signed out from Google Drive', 'success');
    }
};

// Export for use in other modules
window.GoogleDriveManager = GoogleDriveManager;

console.log('✓ Google Drive Manager loaded');
