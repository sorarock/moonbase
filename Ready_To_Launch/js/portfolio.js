/* ============================================================================
   PORTFOLIO MANAGER
   Create, manage, and analyze investment portfolios
   ============================================================================ */

const PortfolioManager = {
    currentPortfolio: null,

    /**
     * Initialize portfolio manager
     */
    init() {
        console.log('Portfolio Manager initialized');
    },

    /**
     * Create new portfolio
     * @param {object} portfolioData - Portfolio configuration
     * @returns {object} Created portfolio
     */
    createPortfolio(portfolioData) {
        // Validate portfolio data
        if (!portfolioData.name || !portfolioData.assets || portfolioData.assets.length === 0) {
            throw new Error('Portfolio must have a name and at least one asset');
        }

        // Validate allocations - allow 0% for savings accounts, require > 0% for others
        portfolioData.assets.forEach(asset => {
            const isSavingsType = asset.type === 'thb_savings' || asset.type === 'fcd_account';
            if (!isSavingsType && asset.allocation <= 0) {
                throw new Error(`Non-savings assets must have allocation > 0% (${asset.name} has ${asset.allocation}%)`);
            }
        });

        // Validate total allocation doesn't exceed 100%
        const totalAllocation = portfolioData.assets.reduce((sum, asset) => sum + parseFloat(asset.allocation), 0);
        if (totalAllocation > 100.01) {
            throw new Error(`Total allocation cannot exceed 100% (currently ${totalAllocation.toFixed(2)}%)`);
        }

        // Create portfolio object
        const portfolio = {
            id: Utils.generateId(),
            name: portfolioData.name,
            description: portfolioData.description || '',
            createdDate: new Date().toISOString(),
            assets: portfolioData.assets.map(asset => ({
                id: Utils.generateId(),
                name: asset.name,
                ticker: asset.ticker || asset.name,
                type: asset.type, // stock, mutual_fund, crypto, bond, etf, reit, thb_savings, fcd_account
                subType: asset.subType || '', // rmf, ltf, regular, individual_stock, etf, index_fund
                allocation: parseFloat(asset.allocation),
                riskLevel: asset.riskLevel || 'medium', // low, medium, high
                currency: asset.currency || 'THB',
                expectedReturn: parseFloat(asset.expectedReturn || 0),
                returnSource: asset.returnSource || 'Manual',
                returnDate: asset.returnDate || new Date().toISOString(),
                returnTimeframe: asset.returnTimeframe || '5-year',
                platform: asset.platform || '',
                accountNumber: asset.accountNumber || '',
                linkedAccountId: asset.linkedAccountId || null, // NEW: Linked savings account ID
                notes: asset.notes || ''
            })),
            totalAllocation: 100,
            weightedReturn: this.calculateWeightedReturn(portfolioData.assets)
        };

        // Save to storage
        StorageManager.addPortfolio(portfolio);
        
        Utils.showNotification(`Portfolio "${portfolio.name}" created successfully!`, 'success');
        return portfolio;
    },

    /**
     * Update existing portfolio
     * @param {string} portfolioId - Portfolio ID
     * @param {object} updates - Updates to apply
     * @returns {boolean} Success status
     */
    updatePortfolio(portfolioId, updates) {
        // Validate allocation if assets are being updated
        if (updates.assets) {
            const totalAllocation = updates.assets.reduce((sum, asset) => sum + parseFloat(asset.allocation), 0);
            if (Math.abs(totalAllocation - 100) > 0.01) {
                throw new Error(`Total allocation must equal 100% (currently ${totalAllocation.toFixed(2)}%)`);
            }
            updates.weightedReturn = this.calculateWeightedReturn(updates.assets);
        }

        const success = StorageManager.updatePortfolio(portfolioId, updates);
        if (success) {
            Utils.showNotification('Portfolio updated successfully', 'success');
        }
        return success;
    },

    /**
     * Delete portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {boolean} Success status
     */
    deletePortfolio(portfolioId) {
        // Check if portfolio has transactions
        const transactions = StorageManager.getTransactions();
        const hasTransactions = transactions.some(t => t.portfolioId === portfolioId);
        
        if (hasTransactions) {
            if (!Utils.confirm('This portfolio has transactions. Are you sure you want to delete it?')) {
                return false;
            }
        }

        const success = StorageManager.deletePortfolio(portfolioId);
        if (success) {
            Utils.showNotification('Portfolio deleted', 'info');
        }
        return success;
    },

    /**
     * Get portfolio by ID
     * @param {string} portfolioId - Portfolio ID
     * @returns {object|null} Portfolio object
     */
    getPortfolio(portfolioId) {
        const portfolios = StorageManager.getPortfolios();
        return portfolios.find(p => p.id === portfolioId) || null;
    },

    /**
     * Get all portfolios
     * @returns {array} Array of portfolios
     */
    getAllPortfolios() {
        return StorageManager.getPortfolios();
    },

    /**
     * Calculate weighted return for portfolio
     * @param {array} assets - Array of assets
     * @returns {number} Weighted return percentage
     */
    calculateWeightedReturn(assets) {
        let weightedReturn = 0;
        assets.forEach(asset => {
            const allocation = parseFloat(asset.allocation) / 100;
            const expectedReturn = parseFloat(asset.expectedReturn || 0);
            weightedReturn += allocation * expectedReturn;
        });
        return parseFloat(weightedReturn.toFixed(2));
    },

    /**
     * Calculate risk distribution
     * @param {array} assets - Array of assets
     * @returns {object} Risk distribution percentages
     */
    calculateRiskDistribution(assets) {
        const distribution = { low: 0, medium: 0, high: 0 };
        
        assets.forEach(asset => {
            const riskLevel = asset.riskLevel.toLowerCase();
            if (distribution.hasOwnProperty(riskLevel)) {
                distribution[riskLevel] += parseFloat(asset.allocation);
            }
        });

        return {
            low: parseFloat(distribution.low.toFixed(2)),
            medium: parseFloat(distribution.medium.toFixed(2)),
            high: parseFloat(distribution.high.toFixed(2))
        };
    },

    /**
     * Get portfolio value (sum of all asset values)
     * @param {string} portfolioId - Portfolio ID
     * @param {string} asOfDate - Optional as of date (YYYY-MM-DD)
     * @returns {number} Total portfolio value in THB
     */
    getPortfolioValue(portfolioId, asOfDate = null) {
        let totalValue = 0;
        
        // Get actual exchange rates from transfer transactions
        const exchangeRates = this.getExchangeRatesFromTransfers(portfolioId);
        
        // Add all account balances (using as of date if provided)
        const accounts = AccountManager.getAllAccounts().filter(acc => acc.portfolioId === portfolioId);
        accounts.forEach(account => {
            // Calculate balance as of date
            const balance = asOfDate 
                ? AccountManager.calculateBalanceAsOfDate(account.id, asOfDate)
                : account.balance;
            
            if (account.currency === 'THB') {
                totalValue += balance;
            } else if (account.currency === 'USD') {
                // Use actual exchange rate from transfers, or default to 35.5
                const rate = exchangeRates.USD_TO_THB || 35.5;
                totalValue += balance * rate;
            } else {
                // For other currencies, just add as-is (will enhance later)
                totalValue += balance;
            }
        });
        
        // Calculate position values from transactions (respecting as-of-date)
        const transactions = TransactionManager.getTransactions({ portfolioId });
        const filteredTxns = asOfDate 
            ? Utils.filterTransactionsByAsOfDate(transactions, asOfDate)
            : transactions;
        
        // Calculate total invested in assets from BUY transactions
        filteredTxns.forEach(txn => {
            if (txn.type === 'BUY') {
                // Add cost basis (already in THB or converted)
                let costInTHB = txn.totalAmount + (txn.fee || 0);
                
                if (txn.currency === 'USD') {
                    const rate = exchangeRates.USD_TO_THB || 35.5;
                    costInTHB = (txn.totalAmount + (txn.fee || 0)) * rate;
                }
                
                totalValue += costInTHB;
            } else if (txn.type === 'SELL') {
                // Subtract proceeds (asset was sold)
                let proceedsInTHB = txn.totalAmount - (txn.fee || 0);
                
                if (txn.currency === 'USD') {
                    const rate = exchangeRates.USD_TO_THB || 35.5;
                    proceedsInTHB = (txn.totalAmount - (txn.fee || 0)) * rate;
                }
                
                totalValue -= proceedsInTHB;
            }
        });

        return totalValue;
    },

    /**
     * Get exchange rates from transfer transactions
     * @param {string} portfolioId - Portfolio ID
     * @returns {object} Exchange rates map
     */
    getExchangeRatesFromTransfers(portfolioId) {
        const transactions = TransactionManager.getTransactions({ 
            portfolioId: portfolioId,
            type: 'TRANSFER'
        });
        
        const rates = {};
        
        // Find most recent transfer for each currency pair
        transactions.forEach(txn => {
            if (txn.currency && txn.destinationCurrency && txn.currency !== txn.destinationCurrency) {
                const pairKey = `${txn.destinationCurrency}_TO_${txn.currency}`;
                
                // Store the exchange rate (inverted if needed)
                // txn.exchangeRate = how many source units = 1 dest unit
                // We want: how many dest units = 1 source unit for display
                if (!rates[pairKey] || new Date(txn.date) > new Date(rates[pairKey].date)) {
                    rates[pairKey] = {
                        rate: txn.exchangeRate,
                        date: txn.date
                    };
                }
            }
        });
        
        // Convert to simple rate map
        const rateMap = {};
        Object.keys(rates).forEach(key => {
            rateMap[key] = rates[key].rate;
        });
        
        return rateMap;
    },

    /**
     * Get asset current value
     * @param {string} assetId - Asset ID
     * @returns {number} Asset value in THB
     */
    getAssetValue(assetId) {
        const transactions = StorageManager.getTransactions();
        const assetTransactions = transactions.filter(t => t.assetId === assetId);
        
        // Calculate total invested/current value
        let totalValue = 0;
        const exchangeRate = 35.5; // THB per USD (could be fetched dynamically later)
        
        assetTransactions.forEach(t => {
            const amount = t.totalAmount || 0;
            
            if (t.type === 'BUY') {
                // Add purchase cost
                if (t.currency === 'USD') {
                    totalValue += amount * exchangeRate;
                } else {
                    totalValue += amount;
                }
            } else if (t.type === 'SELL') {
                // Subtract sale proceeds
                if (t.currency === 'USD') {
                    totalValue -= amount * exchangeRate;
                } else {
                    totalValue -= amount;
                }
            }
        });

        // Get current price and calculate current value
        // For now, return invested amount (will be enhanced with price tracking in Phase 2.4)
        return totalValue;
    },

    /**
     * Fetch expected return rate from internet
     * @param {string} ticker - Asset ticker/symbol
     * @param {string} type - Asset type (stock, crypto, etc.)
     * @returns {Promise<object>} Return rate data
     */
    async fetchExpectedReturn(ticker, type) {
        try {
            if (type === 'stock' || type === 'etf') {
                return await this.fetchStockReturn(ticker);
            } else if (type === 'crypto') {
                return await this.fetchCryptoReturn(ticker);
            } else {
                return {
                    rate: 0,
                    source: 'Manual',
                    date: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Error fetching return rate:', error);
            return {
                rate: 0,
                source: 'Error',
                date: new Date().toISOString(),
                error: error.message
            };
        }
    },

    /**
     * Fetch stock return rate from Yahoo Finance
     * @param {string} ticker - Stock ticker
     * @returns {Promise<object>} Return data
     */
    async fetchStockReturn(ticker) {
        // Note: This is a simplified implementation
        // Real implementation would fetch historical data and calculate CAGR
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=5y`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.chart.result && data.chart.result[0]) {
                // Simplified CAGR calculation
                // In production, calculate from historical prices
                const rate = 8.5; // Placeholder
                
                return {
                    rate: rate,
                    source: 'Yahoo Finance',
                    date: new Date().toISOString(),
                    timeframe: '5-year'
                };
            }
        } catch (error) {
            console.error('Yahoo Finance error:', error);
        }
        
        return { rate: 0, source: 'Manual', date: new Date().toISOString() };
    },

    /**
     * Fetch crypto return rate from CoinGecko
     * @param {string} symbol - Crypto symbol
     * @returns {Promise<object>} Return data
     */
    async fetchCryptoReturn(symbol) {
        const coinId = symbol.toLowerCase();
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.market_data) {
                // Use price change percentage
                const rate = data.market_data.price_change_percentage_1y || 0;
                
                return {
                    rate: parseFloat(rate.toFixed(2)),
                    source: 'CoinGecko',
                    date: new Date().toISOString(),
                    timeframe: '1-year'
                };
            }
        } catch (error) {
            console.error('CoinGecko error:', error);
        }
        
        return { rate: 0, source: 'Manual', date: new Date().toISOString() };
    },

    /**
     * Validate portfolio allocation
     * @param {array} assets - Array of assets
     * @returns {object} Validation result
     */
    validateAllocation(assets) {
        const total = assets.reduce((sum, asset) => sum + parseFloat(asset.allocation), 0);
        const isValid = Math.abs(total - 100) < 0.01;
        
        return {
            isValid: isValid,
            total: parseFloat(total.toFixed(2)),
            difference: parseFloat((total - 100).toFixed(2))
        };
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    PortfolioManager.init();
});

// Export for use in other modules
window.PortfolioManager = PortfolioManager;