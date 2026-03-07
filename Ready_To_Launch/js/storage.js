/* ============================================================================
   STORAGE MANAGER
   Two-layer storage: localStorage (fast cache) + Cloud sync (multi-device)
   ============================================================================ */

const StorageManager = {
    // Storage keys
    KEYS: {
        PORTFOLIOS: 'portfolios',
        ACCOUNTS: 'accounts',
        TRANSACTIONS: 'transactions',
        DEPOSITS: 'deposits',
        PRICES: 'assetPrices',
        PLANS: 'investmentPlans',
        POSITIONS: 'positions',
        RATES: 'conversionRates',
        SETTINGS: 'settings',
        CLOUD_FOLDER: 'cloudFolderHandle'
    },

    cloudFolderHandle: null,
    isCloudEnabled: false,

    /**
     * Initialize storage system
     */
    init() {
        console.log('Initializing Storage Manager...');
        
        // Check localStorage availability
        if (!Utils.isLocalStorageAvailable()) {
            console.error('localStorage is not available!');
            Utils.showNotification('Browser storage is not available', 'error');
            return false;
        }

        // Initialize default data structures if they don't exist
        this.initializeDefaults();

        // Load cloud folder handle if exists
        this.loadCloudFolderHandle();

        console.log('Storage Manager initialized');
        return true;
    },

    /**
     * Initialize default data structures
     */
    initializeDefaults() {
        const defaults = {
            [this.KEYS.PORTFOLIOS]: [],
            [this.KEYS.ACCOUNTS]: [],
            [this.KEYS.TRANSACTIONS]: [],
            [this.KEYS.DEPOSITS]: [],
            [this.KEYS.PRICES]: {},
            [this.KEYS.PLANS]: [],
            [this.KEYS.POSITIONS]: [],
            [this.KEYS.RATES]: [],
            [this.KEYS.SETTINGS]: {
                currency: 'THB',
                theme: 'light',
                autoSync: false,
                lastSync: null
            }
        };

        for (const [key, defaultValue] of Object.entries(defaults)) {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(defaultValue));
            }
        }
    },

    // ========================================================================
    // LOCAL STORAGE OPERATIONS (Fast, device-specific)
    // ========================================================================

    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {boolean} Success status
     */
    saveToLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving to localStorage (${key}):`, error);
            
            // Check if quota exceeded
            if (error.name === 'QuotaExceededError') {
                Utils.showNotification('Storage limit reached! Please export and clear old data.', 'error', 5000);
            }
            return false;
        }
    },

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @returns {any} Loaded data or default
     */
    loadFromLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading from localStorage (${key}):`, error);
            return null;
        }
    },

    /**
     * Delete data from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    deleteFromLocal(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error deleting from localStorage (${key}):`, error);
            return false;
        }
    },

    // ========================================================================
    // CLOUD STORAGE OPERATIONS (File System Access API)
    // ========================================================================

    /**
     * Select cloud folder for sync
     * @returns {Promise<boolean>} Success status
     */
    async selectCloudFolder() {
        try {
            // Check if File System Access API is supported
            if (!('showDirectoryPicker' in window)) {
                Utils.showNotification('Cloud sync requires a modern browser (Chrome 86+)', 'error');
                return false;
            }

            // Show directory picker
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });

            this.cloudFolderHandle = dirHandle;
            this.isCloudEnabled = true;

            // Save folder name to localStorage (can't save handle directly)
            const settings = this.loadFromLocal(this.KEYS.SETTINGS);
            settings.cloudFolderName = dirHandle.name;
            settings.cloudFolderPath = dirHandle.name; // Approximate path
            this.saveToLocal(this.KEYS.SETTINGS, settings);

            Utils.showNotification(`Cloud folder selected: ${dirHandle.name}`, 'success');
            return true;

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting cloud folder:', error);
                Utils.showNotification('Failed to select cloud folder', 'error');
            }
            return false;
        }
    },

    /**
     * Load cloud folder handle from previous session
     */
    async loadCloudFolderHandle() {
        const settings = this.loadFromLocal(this.KEYS.SETTINGS);
        if (settings && settings.cloudFolderName) {
            // Note: Due to browser security, we can't restore the handle
            // User will need to re-select the folder
            console.log('Previous cloud folder:', settings.cloudFolderName);
        }
    },

    /**
     * Sync data to cloud folder
     * @returns {Promise<boolean>} Success status
     */
    async syncToCloud() {
        if (!this.cloudFolderHandle) {
            const result = await this.selectCloudFolder();
            if (!result) return false;
        }

        try {
            Utils.showNotification('Syncing to cloud...', 'info', 1000);

            // Get all data from localStorage
            const dataToSync = {};
            for (const key of Object.values(this.KEYS)) {
                if (key !== 'CLOUD_FOLDER') {
                    dataToSync[key] = this.loadFromLocal(key);
                }
            }

            // Save each data type to separate JSON file
            for (const [key, data] of Object.entries(dataToSync)) {
                const fileName = `${key}.json`;
                await this.writeCloudFile(fileName, data);
            }

            // Update last sync time
            const settings = this.loadFromLocal(this.KEYS.SETTINGS);
            settings.lastSync = new Date().toISOString();
            this.saveToLocal(this.KEYS.SETTINGS, settings);

            Utils.showNotification('Successfully synced to cloud', 'success');
            return true;

        } catch (error) {
            console.error('Error syncing to cloud:', error);
            Utils.showNotification('Failed to sync to cloud', 'error');
            return false;
        }
    },

    /**
     * Load data from cloud folder
     * @returns {Promise<boolean>} Success status
     */
    async loadFromCloud() {
        if (!this.cloudFolderHandle) {
            const result = await this.selectCloudFolder();
            if (!result) return false;
        }

        try {
            Utils.showNotification('Loading from cloud...', 'info', 1000);

            let filesLoaded = 0;

            // Load each data type from JSON files
            for (const key of Object.values(this.KEYS)) {
                if (key !== 'CLOUD_FOLDER') {
                    const fileName = `${key}.json`;
                    const data = await this.readCloudFile(fileName);
                    
                    if (data !== null) {
                        this.saveToLocal(key, data);
                        filesLoaded++;
                    }
                }
            }

            if (filesLoaded > 0) {
                Utils.showNotification(`Loaded ${filesLoaded} files from cloud`, 'success');
                
                // Reload the page to reflect changes
                if (Utils.confirm('Data loaded successfully. Reload page to see changes?')) {
                    window.location.reload();
                }
                return true;
            } else {
                Utils.showNotification('No data found in cloud folder', 'warning');
                return false;
            }

        } catch (error) {
            console.error('Error loading from cloud:', error);
            Utils.showNotification('Failed to load from cloud', 'error');
            return false;
        }
    },

    /**
     * Write file to cloud folder
     * @param {string} fileName - File name
     * @param {any} data - Data to write
     */
    async writeCloudFile(fileName, data) {
        try {
            const fileHandle = await this.cloudFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            return true;
        } catch (error) {
            console.error(`Error writing file ${fileName}:`, error);
            throw error;
        }
    },

    /**
     * Read file from cloud folder
     * @param {string} fileName - File name
     * @returns {any} File contents or null
     */
    async readCloudFile(fileName) {
        try {
            const fileHandle = await this.cloudFolderHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const contents = await file.text();
            return JSON.parse(contents);
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                console.error(`Error reading file ${fileName}:`, error);
            }
            return null;
        }
    },

    // ========================================================================
    // DATA MANAGEMENT METHODS
    // ========================================================================

    // Portfolios
    getPortfolios() {
        return this.loadFromLocal(this.KEYS.PORTFOLIOS) || [];
    },

    savePortfolios(portfolios) {
        return this.saveToLocal(this.KEYS.PORTFOLIOS, portfolios);
    },

    addPortfolio(portfolio) {
        const portfolios = this.getPortfolios();
        portfolio.id = portfolio.id || Utils.generateId();
        portfolio.createdDate = portfolio.createdDate || new Date().toISOString();
        portfolios.push(portfolio);
        return this.savePortfolios(portfolios);
    },

    updatePortfolio(portfolioId, updates) {
        const portfolios = this.getPortfolios();
        const index = portfolios.findIndex(p => p.id === portfolioId);
        if (index !== -1) {
            portfolios[index] = { ...portfolios[index], ...updates };
            return this.savePortfolios(portfolios);
        }
        return false;
    },

    deletePortfolio(portfolioId) {
        const portfolios = this.getPortfolios();
        const filtered = portfolios.filter(p => p.id !== portfolioId);
        return this.savePortfolios(filtered);
    },

    // Accounts
    getAccounts() {
        return this.loadFromLocal(this.KEYS.ACCOUNTS) || [];
    },

    saveAccounts(accounts) {
        return this.saveToLocal(this.KEYS.ACCOUNTS, accounts);
    },

    addAccount(account) {
        const accounts = this.getAccounts();
        account.id = account.id || Utils.generateId();
        account.createdDate = account.createdDate || new Date().toISOString();
        accounts.push(account);
        return this.saveAccounts(accounts);
    },

    updateAccount(accountId, updates) {
        const accounts = this.getAccounts();
        const index = accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            accounts[index] = { ...accounts[index], ...updates };
            return this.saveAccounts(accounts);
        }
        return false;
    },

    deleteAccount(accountId) {
        const accounts = this.getAccounts();
        const filtered = accounts.filter(a => a.id !== accountId);
        return this.saveAccounts(filtered);
    },

    // Transactions
    getTransactions() {
        return this.loadFromLocal(this.KEYS.TRANSACTIONS) || [];
    },

    saveTransactions(transactions) {
        return this.saveToLocal(this.KEYS.TRANSACTIONS, transactions);
    },

    addTransaction(transaction) {
        const transactions = this.getTransactions();
        transaction.id = transaction.id || Utils.generateId();
        transaction.date = transaction.date || new Date().toISOString();
        transactions.push(transaction);
        return this.saveTransactions(transactions);
    },

    // Settings
    getSettings() {
        return this.loadFromLocal(this.KEYS.SETTINGS) || {};
    },

    saveSettings(settings) {
        return this.saveToLocal(this.KEYS.SETTINGS, settings);
    },

    updateSettings(updates) {
        const settings = this.getSettings();
        const updated = { ...settings, ...updates };
        return this.saveSettings(updated);
    },

    // Exchange Rate
    getExchangeRate() {
        const defaultRate = {
            rate: 35.00,
            lastUpdated: null,
            source: 'default',
            fcdAccountId: null
        };
        const stored = this.loadFromLocal('exchangeRate');
        return stored || defaultRate;
    },

    saveExchangeRate(rateData) {
        return this.saveToLocal('exchangeRate', rateData);
    },

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Export all data as JSON
     * @returns {object} All data
     */
    exportAllData() {
        const data = {};
        for (const key of Object.values(this.KEYS)) {
            if (key !== 'CLOUD_FOLDER') {
                data[key] = this.loadFromLocal(key);
            }
        }
        data.exportDate = new Date().toISOString();
        data.version = '1.0';
        return data;
    },

    /**
     * Import data from JSON
     * @param {object} data - Data to import
     * @returns {boolean} Success status
     */
    importData(data) {
        try {
            for (const key of Object.values(this.KEYS)) {
                if (key !== 'CLOUD_FOLDER' && data[key]) {
                    this.saveToLocal(key, data[key]);
                }
            }
            Utils.showNotification('Data imported successfully', 'success');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            Utils.showNotification('Failed to import data', 'error');
            return false;
        }
    },

    /**
     * Clear all data (factory reset)
     * @returns {boolean} Success status
     */
    clearAllData() {
        try {
            for (const key of Object.values(this.KEYS)) {
                this.deleteFromLocal(key);
            }
            this.initializeDefaults();
            Utils.showNotification('All data cleared', 'success');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    },

    /**
     * Get storage usage statistics
     * @returns {object} Storage usage info
     */
    getStorageStats() {
        const usage = Utils.getStorageUsage();
        const dataBreakdown = {};
        
        for (const key of Object.values(this.KEYS)) {
            const data = localStorage.getItem(key);
            if (data) {
                dataBreakdown[key] = {
                    sizeKB: (data.length / 1024).toFixed(2),
                    items: JSON.parse(data).length || 0
                };
            }
        }

        return {
            ...usage,
            breakdown: dataBreakdown
        };
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    StorageManager.init();
});

// Export for use in other modules
window.StorageManager = StorageManager;