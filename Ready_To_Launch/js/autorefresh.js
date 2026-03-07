/* ============================================================================
   AUTO-REFRESH MANAGER
   Background price updates and cloud sync
   ============================================================================ */

const AutoRefreshManager = {
    priceIntervalId: null,
    syncIntervalId: null,
    priceRefreshInterval: 15 * 60 * 1000, // 15 minutes
    syncRefreshInterval: 30 * 60 * 1000, // 30 minutes

    /**
     * Start auto-refresh (prices and sync)
     */
    start() {
        const settings = StorageManager.getSettings();

        // Start price refresh if enabled
        if (settings.autoRefreshEnabled !== false) { // Default to true
            this.startPriceRefresh();
        }

        // Start auto-sync if Google Drive is authenticated
        if (typeof GoogleDriveManager !== 'undefined' && GoogleDriveManager.isAuthenticated) {
            this.startAutoSync();
        }

        console.log('✓ Auto-refresh started');
    },

    /**
     * Stop all auto-refresh
     */
    stop() {
        this.stopPriceRefresh();
        this.stopAutoSync();
        console.log('Auto-refresh stopped');
    },

    /**
     * Start price refresh
     */
    startPriceRefresh() {
        if (this.priceIntervalId) return; // Already running

        this.priceIntervalId = setInterval(() => {
            this.refreshPrices();
        }, this.priceRefreshInterval);

        console.log('Price auto-refresh started (15 min interval)');
    },

    /**
     * Stop price refresh
     */
    stopPriceRefresh() {
        if (this.priceIntervalId) {
            clearInterval(this.priceIntervalId);
            this.priceIntervalId = null;
        }
    },

    /**
     * Start auto-sync
     */
    startAutoSync() {
        if (this.syncIntervalId) return; // Already running

        this.syncIntervalId = setInterval(() => {
            this.autoSync();
        }, this.syncRefreshInterval);

        console.log('Auto-sync started (30 min interval)');
    },

    /**
     * Stop auto-sync
     */
    stopAutoSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    },

    /**
     * Refresh prices (only if page is visible)
     */
    async refreshPrices() {
        // Only refresh if page is visible (don't waste API calls)
        if (document.hidden) {
            console.log('Page hidden, skipping price refresh');
            return;
        }

        console.log('Auto-refreshing prices...');

        try {
            const portfolios = StorageManager.getPortfolios();
            if (portfolios.length === 0) return;

            let totalSuccess = 0;

            for (const portfolio of portfolios) {
                try {
                    const results = await PriceManager.updateAllPrices(portfolio.id);
                    totalSuccess += results.success;
                } catch (error) {
                    console.error(`Failed to update prices for ${portfolio.name}:`, error);
                }
            }

            if (totalSuccess > 0) {
                console.log(`✓ Auto-refreshed ${totalSuccess} prices`);

                // Reload current page if app is loaded
                if (typeof App !== 'undefined' && App.currentPage) {
                    App.loadPageContent(App.currentPage);
                }
            }

        } catch (error) {
            console.error('Auto price refresh failed:', error);
        }
    },

    /**
     * Auto-sync to Google Drive
     */
    async autoSync() {
        // Only sync if page is visible
        if (document.hidden) {
            console.log('Page hidden, skipping auto-sync');
            return;
        }

        // Check if Google Drive is authenticated
        if (typeof GoogleDriveManager === 'undefined' || !GoogleDriveManager.isAuthenticated) {
            console.log('Google Drive not authenticated, skipping auto-sync');
            return;
        }

        console.log('Auto-syncing to Google Drive...');

        try {
            await StorageManager.syncToCloud();
            console.log('✓ Auto-sync completed');

            // Update sync status UI
            const syncStatus = document.getElementById('syncStatus');
            if (syncStatus) {
                syncStatus.className = 'sync-status synced';
                setTimeout(() => {
                    syncStatus.className = 'sync-status';
                }, 3000);
            }

        } catch (error) {
            console.error('Auto-sync failed:', error);
        }
    },

    /**
     * Trigger debounced sync after data change
     */
    triggerDebouncedSync() {
        if (typeof GoogleDriveManager === 'undefined' || !GoogleDriveManager.isAuthenticated) {
            return;
        }

        // Clear existing timer
        if (this._debounceSyncTimer) {
            clearTimeout(this._debounceSyncTimer);
        }

        // Set new timer
        this._debounceSyncTimer = setTimeout(() => {
            this.autoSync();
        }, 30000); // 30 seconds after last change
    }
};

// Start on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to complete
    setTimeout(() => {
        if (sessionStorage.getItem('sessionActive') === 'true') {
            AutoRefreshManager.start();
        }
    }, 3000);
});

// Stop when page hidden (battery saving)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing auto-refresh');
    } else {
        console.log('Page visible - resuming auto-refresh');
        // Refresh immediately when page becomes visible
        setTimeout(() => {
            AutoRefreshManager.refreshPrices();
        }, 1000);
    }
});

// Export for use in other modules
window.AutoRefreshManager = AutoRefreshManager;

console.log('✓ Auto-refresh Manager loaded');
