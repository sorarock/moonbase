/* ============================================================================
   STORAGE MANAGER
   Two-layer storage: localStorage (fast cache) + Cloud sync (multi-device)
   ============================================================================ */

const StorageManager = {
    // Storage keys
    KEYS: {
        PORTFOLIOS: 'portfolios',
        ACCOUNTS: 'accounts',
        TRANSACTIONS: 'transactions',  // Legacy key, kept for backward compatibility
        ACCOUNT_TRANSACTIONS: 'accountTransactions',  // New: DEPOSIT, WITHDRAW, TRANSFER, INTEREST
        ASSET_TRANSACTIONS: 'assetTransactions',      // New: BUY, SELL, DIVIDEND
        DEPOSITS: 'deposits',
        PRICES: 'assetPrices',
        PLANS: 'investmentPlans',
        POSITIONS: 'positions',
        RATES: 'conversionRates',
        SETTINGS: 'settings',
        FIFO_LOTS: 'PM_FIFO_LOTS',
        FIFO_SALES: 'PM_FIFO_SALES',
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
            [this.KEYS.TRANSACTIONS]: [],  // Legacy, kept for migration
            [this.KEYS.ACCOUNT_TRANSACTIONS]: [],  // New split array
            [this.KEYS.ASSET_TRANSACTIONS]: [],    // New split array
            [this.KEYS.DEPOSITS]: [],
            [this.KEYS.PRICES]: {},
            [this.KEYS.PLANS]: [],
            [this.KEYS.POSITIONS]: [],
            [this.KEYS.RATES]: [],
            [this.KEYS.FIFO_LOTS]: [],
            [this.KEYS.FIFO_SALES]: [],
            [this.KEYS.SETTINGS]: {
                currency: 'THB',
                theme: 'light',
                autoSync: false,
                lastSync: null,
                dataVersion: '2.0',           // Track data structure version
                migrationCompleted: false     // Track if v2.0 migration completed
            }
        };

        for (const [key, defaultValue] of Object.entries(defaults)) {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(defaultValue));
            }
        }

        // Check if migration is needed (existing data without v2.0 structure)
        this.checkAndMigrate();
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
     * @param {boolean} skipReload - If true, don't reload page (for login sync)
     * @returns {Promise<boolean>} Success status
     */
    async loadFromCloud(silent = false, skipReload = false) {
        if (typeof GoogleDriveManager === 'undefined') {
            Utils.showNotification('Google Drive not available', 'error');
            return false;
        }

        return await GoogleDriveManager.loadFromCloud(silent, skipReload);
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

    // Transactions (Legacy - kept for backward compatibility)
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

    // Account Transactions (New split storage)
    getAccountTransactions() {
        return this.loadFromLocal(this.KEYS.ACCOUNT_TRANSACTIONS) || [];
    },

    saveAccountTransactions(transactions) {
        return this.saveToLocal(this.KEYS.ACCOUNT_TRANSACTIONS, transactions);
    },

    addAccountTransaction(transaction) {
        const transactions = this.getAccountTransactions();
        transaction.id = transaction.id || Utils.generateId();
        transaction.date = transaction.date || new Date().toISOString();
        transactions.push(transaction);
        return this.saveAccountTransactions(transactions);
    },

    // Asset Transactions (New split storage)
    getAssetTransactions() {
        return this.loadFromLocal(this.KEYS.ASSET_TRANSACTIONS) || [];
    },

    saveAssetTransactions(transactions) {
        return this.saveToLocal(this.KEYS.ASSET_TRANSACTIONS, transactions);
    },

    addAssetTransaction(transaction) {
        const transactions = this.getAssetTransactions();
        transaction.id = transaction.id || Utils.generateId();
        transaction.date = transaction.date || new Date().toISOString();
        transactions.push(transaction);
        return this.saveAssetTransactions(transactions);
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
    },

    // ========================================================================
    // MIGRATION METHODS (v1.0 → v2.0)
    // ========================================================================

    /**
     * Check if migration is needed and trigger it
     */
    checkAndMigrate() {
        const settings = this.getSettings();
        const legacyTransactions = this.getTransactions();

        // Check if migration is needed
        const needsMigration =
            !settings.dataVersion ||                        // No version = v1.0
            settings.dataVersion < '2.0' ||                 // Old version
            (!settings.migrationCompleted &&                // Migration not completed
             legacyTransactions.length > 0);                // Has data to migrate

        if (needsMigration) {
            console.log('🔄 Migration needed: v1.0 → v2.0 (split transaction storage)');

            // Auto-migrate if data exists
            if (legacyTransactions.length > 0) {
                this.migrateTransactions();
            } else {
                // No data to migrate, just update version
                this.updateSettings({
                    dataVersion: '2.0',
                    migrationCompleted: true
                });
                console.log('✓ No data to migrate, version updated to 2.0');
            }
        }
    },

    /**
     * Migrate transactions from single array to split storage
     * v1.0: transactions = [all mixed]
     * v2.0: accountTransactions + assetTransactions
     */
    migrateTransactions() {
        console.log('Starting transaction migration...');

        try {
            // 1. Load existing transactions
            const legacyTransactions = this.getTransactions();

            if (legacyTransactions.length === 0) {
                console.log('No transactions to migrate');
                this.updateSettings({
                    dataVersion: '2.0',
                    migrationCompleted: true
                });
                return true;
            }

            console.log(`Found ${legacyTransactions.length} transactions to migrate`);

            // 2. Create backup with timestamp
            const backupKey = '_backup_transactions_v1';
            const backup = {
                transactions: legacyTransactions,
                timestamp: new Date().toISOString(),
                count: legacyTransactions.length
            };
            this.saveToLocal(backupKey, backup);
            console.log(`✓ Backup created: ${backupKey}`);

            // 3. Split transactions by type
            const accountTypes = ['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'INTEREST'];
            const assetTypes = ['BUY', 'SELL', 'DIVIDEND'];

            const accountTransactions = [];
            const assetTransactions = [];

            for (const txn of legacyTransactions) {
                if (accountTypes.includes(txn.type)) {
                    accountTransactions.push(txn);
                } else if (assetTypes.includes(txn.type)) {
                    assetTransactions.push(txn);
                } else {
                    console.warn(`Unknown transaction type: ${txn.type}`, txn);
                    // Default to asset transactions for unknown types
                    assetTransactions.push(txn);
                }
            }

            console.log(`Split: ${accountTransactions.length} account + ${assetTransactions.length} asset`);

            // 4. Validate split
            const totalAfterSplit = accountTransactions.length + assetTransactions.length;
            if (totalAfterSplit !== legacyTransactions.length) {
                throw new Error(`Validation failed: ${legacyTransactions.length} → ${totalAfterSplit}`);
            }

            // 5. Save split arrays
            this.saveAccountTransactions(accountTransactions);
            this.saveAssetTransactions(assetTransactions);
            console.log('✓ Split arrays saved to storage');

            // 6. Update settings
            this.updateSettings({
                dataVersion: '2.0',
                migrationCompleted: true,
                migrationDate: new Date().toISOString(),
                migrationCount: legacyTransactions.length
            });

            // 7. Keep legacy array for rollback capability (don't delete yet)
            console.log('✓ Legacy transactions array kept for rollback');

            // 8. Show success notification
            Utils.showNotification(
                `✓ Migration complete: ${accountTransactions.length} account + ${assetTransactions.length} asset transactions`,
                'success',
                5000
            );

            console.log('✓ Migration completed successfully');
            return true;

        } catch (error) {
            console.error('Migration failed:', error);
            Utils.showNotification('Migration failed! Data preserved. Check console.', 'error', 10000);
            return false;
        }
    },

    /**
     * Rollback migration - restore from backup
     * Use in console: StorageManager.rollbackMigration()
     */
    rollbackMigration() {
        console.log('Rolling back migration...');

        try {
            // 1. Load backup
            const backup = this.loadFromLocal('_backup_transactions_v1');

            if (!backup || !backup.transactions) {
                console.error('No backup found!');
                Utils.showNotification('No backup found to rollback', 'error');
                return false;
            }

            console.log(`Found backup: ${backup.count} transactions from ${backup.timestamp}`);

            // 2. Restore legacy transactions
            this.saveTransactions(backup.transactions);
            console.log('✓ Restored legacy transactions array');

            // 3. Clear split arrays
            this.saveAccountTransactions([]);
            this.saveAssetTransactions([]);
            console.log('✓ Cleared split arrays');

            // 4. Reset settings
            this.updateSettings({
                dataVersion: '1.0',
                migrationCompleted: false,
                rollbackDate: new Date().toISOString()
            });
            console.log('✓ Settings reset to v1.0');

            // 5. Show success
            Utils.showNotification(
                `✓ Rollback complete: ${backup.count} transactions restored`,
                'success',
                5000
            );

            console.log('✓ Rollback completed. Please reload the page.');
            return true;

        } catch (error) {
            console.error('Rollback failed:', error);
            Utils.showNotification('Rollback failed! Check console.', 'error');
            return false;
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    StorageManager.init();
});

// Export for use in other modules
window.StorageManager = StorageManager;