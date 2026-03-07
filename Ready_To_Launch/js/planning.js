/* ============================================================================
   PLANNING MANAGER
   Investment planning tools and calculators
   ============================================================================ */

const PlanningManager = {
    /**
     * Calculate DCA (Dollar Cost Averaging) strategy
     * @param {object} params - DCA parameters
     * @returns {object} DCA results
     */
    calculateDCA(params) {
        const {
            portfolioId,
            assetId,
            monthlyAmount,
            frequency, // 'weekly', 'monthly', 'quarterly'
            durationMonths,
            startDate,
            startingPrice,
            expectedChangeMin, // e.g., -0.05 for -5%
            expectedChangeMax, // e.g., 0.10 for +10%
            volatility // e.g., 0.15 for ±15%
        } = params;

        // Validate inputs
        if (!portfolioId || !assetId || !monthlyAmount || monthlyAmount <= 0) {
            throw new Error('Invalid DCA parameters');
        }

        // Get asset details
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        const asset = portfolio.assets.find(a => a.id === assetId);
        if (!asset) {
            throw new Error('Asset not found in portfolio');
        }

        // Calculate number of purchases based on frequency
        const purchasesPerYear = {
            'weekly': 52,
            'monthly': 12,
            'quarterly': 4
        }[frequency] || 12;

        const totalPurchases = Math.ceil((durationMonths / 12) * purchasesPerYear);
        const daysBetweenPurchases = Math.floor(365 / purchasesPerYear);

        // Generate price simulation
        const priceSimulation = this.simulatePrices({
            startingPrice,
            periods: totalPurchases,
            expectedChangeMin,
            expectedChangeMax,
            volatility
        });

        // Calculate DCA purchases
        const purchases = [];
        let totalInvested = 0;
        let totalShares = 0;
        let currentDate = new Date(startDate);

        for (let i = 0; i < totalPurchases; i++) {
            const purchasePrice = priceSimulation[i];
            const shares = monthlyAmount / purchasePrice;

            totalInvested += monthlyAmount;
            totalShares += shares;

            purchases.push({
                date: currentDate.toISOString().split('T')[0],
                price: purchasePrice,
                amount: monthlyAmount,
                shares: shares,
                cumulativeShares: totalShares,
                cumulativeInvested: totalInvested
            });

            // Move to next purchase date
            currentDate.setDate(currentDate.getDate() + daysBetweenPurchases);
        }

        // Calculate final metrics
        const finalPrice = priceSimulation[priceSimulation.length - 1];
        const currentValue = totalShares * finalPrice;
        const avgCostPerShare = totalInvested / totalShares;
        const gainLoss = currentValue - totalInvested;
        const returnPercent = (gainLoss / totalInvested) * 100;

        return {
            strategy: 'DCA',
            asset: asset,
            totalInvested,
            totalShares,
            avgCostPerShare,
            currentValue,
            gainLoss,
            returnPercent,
            purchases,
            finalPrice
        };
    },

    /**
     * Calculate Lump Sum strategy for comparison
     * @param {object} params - Lump sum parameters
     * @returns {object} Lump sum results
     */
    calculateLumpSum(params) {
        const {
            portfolioId,
            assetId,
            totalAmount,
            startingPrice,
            finalPrice
        } = params;

        // Validate inputs
        if (!portfolioId || !assetId || !totalAmount || totalAmount <= 0) {
            throw new Error('Invalid lump sum parameters');
        }

        // Get asset details
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        const asset = portfolio.assets.find(a => a.id === assetId);
        if (!asset) {
            throw new Error('Asset not found in portfolio');
        }

        // Calculate lump sum investment
        const shares = totalAmount / startingPrice;
        const currentValue = shares * finalPrice;
        const gainLoss = currentValue - totalAmount;
        const returnPercent = (gainLoss / totalAmount) * 100;

        return {
            strategy: 'Lump Sum',
            asset: asset,
            totalInvested: totalAmount,
            totalShares: shares,
            avgCostPerShare: startingPrice,
            currentValue,
            gainLoss,
            returnPercent
        };
    },

    /**
     * Simulate price movements
     * @param {object} params - Simulation parameters
     * @returns {array} Array of simulated prices
     */
    simulatePrices(params) {
        const {
            startingPrice,
            periods,
            expectedChangeMin,
            expectedChangeMax,
            volatility
        } = params;

        const prices = [startingPrice];
        let currentPrice = startingPrice;

        // Calculate average expected return per period
        const avgReturn = (expectedChangeMin + expectedChangeMax) / 2;

        for (let i = 1; i < periods; i++) {
            // Generate random change using normal distribution approximation
            const randomChange = this.normalRandom(avgReturn, volatility);
            
            // Apply change to current price
            currentPrice = currentPrice * (1 + randomChange);
            
            // Ensure price doesn't go negative
            currentPrice = Math.max(currentPrice, startingPrice * 0.1);
            
            prices.push(currentPrice);
        }

        return prices;
    },

    /**
     * Generate random number from normal distribution (Box-Muller transform)
     * @param {number} mean - Mean of distribution
     * @param {number} stdDev - Standard deviation
     * @returns {number} Random number from normal distribution
     */
    normalRandom(mean, stdDev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return mean + z0 * stdDev;
    },

    /**
     * Compare DCA vs Lump Sum strategies
     * @param {object} dcaResult - DCA calculation result
     * @param {object} lumpSumResult - Lump sum calculation result
     * @returns {object} Comparison analysis
     */
    compareStrategies(dcaResult, lumpSumResult) {
        const dcaRisk = this.calculateRisk(dcaResult.purchases.map(p => p.price));
        const lumpSumRisk = {
            volatility: 'N/A',
            maxDrawdown: 0,
            riskLevel: 'High'
        };

        // Determine which strategy performed better
        const dcaBetter = dcaResult.returnPercent > lumpSumResult.returnPercent;
        const returnDifference = Math.abs(dcaResult.returnPercent - lumpSumResult.returnPercent);

        // Generate recommendation
        let recommendation = '';
        if (dcaBetter) {
            recommendation = `DCA outperformed lump sum by ${returnDifference.toFixed(2)}%. `;
            recommendation += 'DCA provided better risk management and reduced timing risk. ';
            recommendation += 'Recommended for volatile markets or when you want to reduce exposure to market timing.';
        } else {
            recommendation = `Lump sum outperformed DCA by ${returnDifference.toFixed(2)}%. `;
            recommendation += 'However, lump sum carries higher timing risk. ';
            recommendation += 'DCA is still recommended for risk-averse investors or uncertain market conditions.';
        }

        return {
            dcaResult,
            lumpSumResult,
            dcaRisk,
            lumpSumRisk,
            winner: dcaBetter ? 'DCA' : 'Lump Sum',
            returnDifference,
            recommendation
        };
    },

    /**
     * Calculate risk metrics from price series
     * @param {array} prices - Array of prices
     * @returns {object} Risk metrics
     */
    calculateRisk(prices) {
        if (prices.length < 2) {
            return {
                volatility: 0,
                maxDrawdown: 0,
                riskLevel: 'Low'
            };
        }

        // Calculate returns
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }

        // Calculate volatility (standard deviation of returns)
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * 100; // Convert to percentage

        // Calculate max drawdown
        let maxDrawdown = 0;
        let peak = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > peak) {
                peak = prices[i];
            }
            const drawdown = (peak - prices[i]) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        maxDrawdown *= 100; // Convert to percentage

        // Determine risk level
        let riskLevel = 'Low';
        if (volatility > 20 || maxDrawdown > 30) {
            riskLevel = 'High';
        } else if (volatility > 10 || maxDrawdown > 15) {
            riskLevel = 'Medium';
        }

        return {
            volatility: volatility.toFixed(2),
            maxDrawdown: maxDrawdown.toFixed(2),
            riskLevel
        };
    },

    /**
     * Generate scenario analysis (best, expected, worst cases)
     * @param {object} baseParams - Base DCA parameters
     * @returns {object} Scenario results
     */
    generateScenarios(baseParams) {
        // Best case: Market goes up significantly
        const bestCase = this.calculateDCA({
            ...baseParams,
            expectedChangeMin: 0.10,
            expectedChangeMax: 0.30,
            volatility: 0.10
        });

        // Expected case: Moderate market growth
        const expectedCase = this.calculateDCA({
            ...baseParams,
            expectedChangeMin: baseParams.expectedChangeMin || -0.05,
            expectedChangeMax: baseParams.expectedChangeMax || 0.10,
            volatility: baseParams.volatility || 0.15
        });

        // Worst case: Market decline
        const worstCase = this.calculateDCA({
            ...baseParams,
            expectedChangeMin: -0.30,
            expectedChangeMax: -0.10,
            volatility: 0.20
        });

        return {
            bestCase: {
                ...bestCase,
                scenario: 'Best Case',
                description: 'Market rises 10-30%'
            },
            expectedCase: {
                ...expectedCase,
                scenario: 'Expected Case',
                description: 'Normal market conditions'
            },
            worstCase: {
                ...worstCase,
                scenario: 'Worst Case',
                description: 'Market declines 10-30%'
            }
        };
    },

    /**
     * Get portfolio assets suitable for DCA
     * @param {string} portfolioId - Portfolio ID
     * @returns {array} Array of suitable assets
     */
    getDCAAssets(portfolioId) {
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        if (!portfolio) {
            return [];
        }

        // Filter out savings accounts (not suitable for DCA)
        return portfolio.assets.filter(asset => 
            asset.type !== 'thb_savings' && asset.type !== 'fcd_account'
        );
    },

    /**
     * Get current price for an asset
     * @param {string} assetId - Asset ID
     * @returns {number|null} Current price or null
     */
    getAssetCurrentPrice(assetId) {
        const priceData = PriceManager.getCurrentPrice(assetId);
        return priceData ? priceData.price : null;
    },

    /**
     * Format DCA results for display
     * @param {object} result - DCA calculation result
     * @returns {object} Formatted result
     */
    formatDCAResult(result) {
        return {
            ...result,
            totalInvestedFormatted: Utils.formatCurrency(result.totalInvested, result.asset.currency),
            totalSharesFormatted: result.totalShares.toFixed(4),
            avgCostPerShareFormatted: Utils.formatCurrency(result.avgCostPerShare, result.asset.currency),
            currentValueFormatted: Utils.formatCurrency(result.currentValue, result.asset.currency),
            gainLossFormatted: Utils.formatCurrency(Math.abs(result.gainLoss), result.asset.currency),
            returnPercentFormatted: result.returnPercent.toFixed(2) + '%',
            gainLossSign: result.gainLoss >= 0 ? '+' : '-',
            gainLossColor: result.gainLoss >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
        };
    }
};

// Export for use in other modules
window.PlanningManager = PlanningManager;