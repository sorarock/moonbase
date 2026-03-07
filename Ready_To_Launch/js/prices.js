/* ============================================================================
   PRICE TRACKING SYSTEM
   Fetch and manage asset prices from external APIs
   ============================================================================ */

const PriceManager = {
    /**
     * Fetch price from Yahoo Finance
     * @param {string} ticker - Stock ticker symbol (e.g., 'VOO', 'AAPL')
     * @param {string} currency - Target currency (THB or USD)
     * @returns {Promise<object>} Price data
     */
    async fetchYahooPrice(ticker, currency = 'USD') {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Yahoo Finance API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('Invalid response from Yahoo Finance');
            }

            const result = data.chart.result[0];
            const quote = result.meta;
            const currentPrice = quote.regularMarketPrice;
            const previousClose = quote.previousClose || quote.chartPreviousClose;
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;

            // If requesting THB and this is a USD asset, convert
            let finalPrice = currentPrice;
            let finalCurrency = quote.currency || 'USD';
            
            if (currency === 'THB' && finalCurrency === 'USD') {
                // Use approximate exchange rate (in real app, would fetch current rate)
                finalPrice = currentPrice * 35.5;
                finalCurrency = 'THB';
            }

            return {
                price: finalPrice,
                currency: finalCurrency,
                change: change,
                changePercent: changePercent,
                previousClose: previousClose,
                timestamp: new Date().toISOString(),
                source: 'yahoo',
                ticker: ticker
            };

        } catch (error) {
            console.error('Yahoo Finance fetch error:', error);
            throw new Error(`Failed to fetch price for ${ticker}: ${error.message}`);
        }
    },

    /**
     * Fetch cryptocurrency price from CoinGecko
     * @param {string} coinId - CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
     * @param {string} currency - Target currency (thb or usd)
     * @returns {Promise<object>} Price data
     */
    async fetchCoinGeckoPrice(coinId, currency = 'usd') {
        try {
            const vsCurrency = currency.toLowerCase();
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data[coinId]) {
                throw new Error(`Coin not found: ${coinId}`);
            }

            const coinData = data[coinId];
            const price = coinData[vsCurrency];
            const changePercent = coinData[`${vsCurrency}_24h_change`] || 0;

            return {
                price: price,
                currency: currency.toUpperCase(),
                change: null,
                changePercent: changePercent,
                previousClose: null,
                timestamp: new Date().toISOString(),
                source: 'coingecko',
                coinId: coinId
            };

        } catch (error) {
            console.error('CoinGecko fetch error:', error);
            throw new Error(`Failed to fetch price for ${coinId}: ${error.message}`);
        }
    },

    /**
     * Fetch price for an asset based on its type
     * @param {object} asset - Asset object with ticker, type, etc.
     * @returns {Promise<object>} Price data
     */
    async fetchPrice(asset) {
        try {
            // Check if we have recent cached price (less than 15 minutes old)
            const cachedPrice = this.getCachedPrice(asset.id);
            if (cachedPrice && this.isCacheValid(cachedPrice.timestamp, 15)) {
                console.log(`Using cached price for ${asset.name}`);
                return cachedPrice;
            }

            let priceData;

            if (asset.type === 'crypto') {
                // Map common crypto names to CoinGecko IDs
                const coinIdMap = {
                    'bitcoin': 'bitcoin',
                    'btc': 'bitcoin',
                    'ethereum': 'ethereum',
                    'eth': 'ethereum',
                    'ripple': 'ripple',
                    'xrp': 'ripple'
                };
                
                const coinId = coinIdMap[asset.ticker.toLowerCase()] || asset.ticker.toLowerCase();
                priceData = await this.fetchCoinGeckoPrice(coinId, asset.currency);
            } else {
                // Stocks, ETFs, Mutual Funds
                priceData = await this.fetchYahooPrice(asset.ticker, asset.currency);
            }

            // Save to cache
            this.savePriceToCache(asset.id, priceData);

            return priceData;

        } catch (error) {
            console.error(`Failed to fetch price for ${asset.name}:`, error);
            
            // Return last known price if available
            const lastKnown = this.getLastKnownPrice(asset.id);
            if (lastKnown) {
                Utils.showNotification(
                    `Using last known price for ${asset.name} (${error.message})`,
                    'warning'
                );
                return lastKnown;
            }

            throw error;
        }
    },

    /**
     * Update prices for all assets in a portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {Promise<object>} Results object with success/failure counts
     */
    async updateAllPrices(portfolioId) {
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Update prices sequentially to avoid rate limiting
        for (const asset of portfolio.assets) {
            // Skip savings accounts
            if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
                continue;
            }

            try {
                await this.fetchPrice(asset);
                results.success++;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                results.failed++;
                results.errors.push({
                    asset: asset.name,
                    error: error.message
                });
            }
        }

        return results;
    },

    /**
     * Set manual price for an asset
     * @param {string} assetId - Asset ID
     * @param {number} price - Price value
     * @param {string} currency - Currency (THB or USD)
     */
    setManualPrice(assetId, price, currency) {
        const priceData = {
            price: parseFloat(price),
            currency: currency,
            change: null,
            changePercent: null,
            previousClose: null,
            timestamp: new Date().toISOString(),
            source: 'manual'
        };

        this.savePriceToCache(assetId, priceData);
        return priceData;
    },

    /**
     * Get current price for an asset
     * @param {string} assetId - Asset ID
     * @returns {object|null} Current price data or null
     */
    getCurrentPrice(assetId) {
        return this.getCachedPrice(assetId);
    },

    /**
     * Get last known price (even if stale)
     * @param {string} assetId - Asset ID
     * @returns {object|null} Last known price or null
     */
    getLastKnownPrice(assetId) {
        return this.getCachedPrice(assetId);
    },

    /**
     * Get cached price from storage
     * @param {string} assetId - Asset ID
     * @returns {object|null} Cached price data or null
     */
    getCachedPrice(assetId) {
        const prices = StorageManager.loadFromLocal(StorageManager.KEYS.PRICES) || {};
        return prices[assetId] || null;
    },

    /**
     * Save price to cache
     * @param {string} assetId - Asset ID
     * @param {object} priceData - Price data to save
     */
    savePriceToCache(assetId, priceData) {
        const prices = StorageManager.loadFromLocal(StorageManager.KEYS.PRICES) || {};
        prices[assetId] = priceData;
        StorageManager.saveToLocal(StorageManager.KEYS.PRICES, prices);
    },

    /**
     * Check if cached data is still valid
     * @param {string} timestamp - ISO timestamp
     * @param {number} maxAgeMinutes - Maximum age in minutes
     * @returns {boolean} True if cache is valid
     */
    isCacheValid(timestamp, maxAgeMinutes) {
        const cacheTime = new Date(timestamp);
        const now = new Date();
        const diffMinutes = (now - cacheTime) / (1000 * 60);
        return diffMinutes < maxAgeMinutes;
    },

    /**
     * Get time since last update
     * @param {string} assetId - Asset ID
     * @returns {string} Human-readable time string
     */
    getTimeSinceUpdate(assetId) {
        const price = this.getCachedPrice(assetId);
        if (!price || !price.timestamp) {
            return 'Never';
        }

        const updateTime = new Date(price.timestamp);
        const now = new Date();
        const diffMs = now - updateTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    },

    /**
     * Clear all cached prices
     */
    clearCache() {
        StorageManager.saveToLocal(StorageManager.KEYS.PRICES, {});
        console.log('Price cache cleared');
    },

    /**
     * Get all cached prices
     * @returns {object} All cached price data
     */
    getAllPrices() {
        return StorageManager.loadFromLocal(StorageManager.KEYS.PRICES) || {};
    }
};

// Export for use in other modules
window.PriceManager = PriceManager;

console.log('✓ Price Management System loaded');