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

    // Google Drive integration (replaces File System Access API)
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

        // Initialize Google Drive
        this.initGoogleDrive();

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
    // CLOUD STORAGE OPERATIONS (Google Drive API)
    // ========================================================================

    /**
     * Initialize Google Drive
     */
    async initGoogleDrive() {
        try {
            // Initialize Google Drive API
            if (typeof GoogleDriveManager !== 'undefined') {
                await GoogleDriveManager.init();
                this.isCloudEnabled = true;
                console.log('✓ Google Drive ready for sync');
            }
        } catch (error) {
            console.error('Failed to initialize Google Drive:', error);
        }
    },

    /**
     * Sync data to cloud (Google Drive)
     * @returns {Promise<boolean>} Success status
     */
    async syncToCloud() {
        if (typeof GoogleDriveManager === 'undefined') {
            Utils.showNotification('Google Drive not available', 'error');
            return false;
        }

        return await GoogleDriveManager.syncToCloud();
    },

    /**
     * Load data from cloud (Google Drive)
     * @param {boolean} silent - If true, skip reload prompt (for auto-sync)
     * @returns {Promise<boolean>} Success status
     */
    async loadFromCloud(silent = false) {
        if (typeof GoogleDriveManager === 'undefined') {
            Utils.showNotification('Google Drive not available', 'error');
            return false;
        }

        return await GoogleDriveManager.loadFromCloud(silent);
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