/* ============================================================================
   FIFO MANAGER
   First-In-First-Out lot-level tracking for cost basis and gain/loss analysis
   ============================================================================ */

const FIFOManager = {
    /**
     * Initialize FIFO manager
     */
    init() {
        console.log('FIFO Manager initialized');
    },

    /**
     * Create a lot when a BUY transaction occurs
     * @param {object} transaction - The BUY transaction
     * @returns {object} Created lot
     */
    createLot(transaction) {
        if (transaction.type !== 'BUY') {
            throw new Error('Can only create lots from BUY transactions');
        }

        const lot = {
            id: Utils.generateId(),
            portfolioId: transaction.portfolioId,
            assetId: transaction.assetId,
            transactionId: transaction.id,
            purchaseDate: transaction.date,
            quantity: transaction.quantity,
            remainingQuantity: transaction.quantity,
            pricePerUnit: transaction.pricePerUnit,
            currency: transaction.currency,
            exchangeRate: transaction.exchangeRate || 1,
            costBasisTHB: this.calculateCostBasis(transaction),
            status: 'OPEN',
            createdAt: new Date().toISOString()
        };

        // Save lot
        const lots = this.getAllLots();
        lots.push(lot);
        this.saveLots(lots);

        console.log('FIFO lot created:', lot.id);
        return lot;
    },

    /**
     * Calculate cost basis in THB for a transaction
     * @param {object} transaction - Transaction object
     * @returns {number} Cost basis in THB
     */
    calculateCostBasis(transaction) {
        const subtotal = transaction.quantity * transaction.pricePerUnit;
        const total = subtotal + (transaction.fee || 0);
        
        if (transaction.currency === 'USD') {
            return total * transaction.exchangeRate;
        }
        
        return total;
    },

    /**
     * Process a SELL transaction using FIFO logic
     * @param {object} transaction - The SELL transaction
     * @returns {object} Sale record with lots sold
     */
    processFIFOSale(transaction) {
        if (transaction.type !== 'SELL') {
            throw new Error('Can only process SELL transactions');
        }

        // Get available lots for this asset (oldest first)
        const availableLots = this.getAssetLots(transaction.portfolioId, transaction.assetId)
            .filter(lot => lot.status === 'OPEN' && lot.remainingQuantity > 0)
            .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

        if (availableLots.length === 0) {
            throw new Error('No lots available to sell from');
        }

        // Check if we have enough quantity
        const totalAvailable = availableLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
        if (totalAvailable < transaction.quantity) {
            throw new Error(`Insufficient quantity. Available: ${totalAvailable}, Requested: ${transaction.quantity}`);
        }

        // Process sale using FIFO
        let remainingToSell = transaction.quantity;
        const lotsSold = [];
        const lots = this.getAllLots();

        for (const lot of availableLots) {
            if (remainingToSell <= 0) break;

            const quantityFromThisLot = Math.min(lot.remainingQuantity, remainingToSell);
            const costPerUnit = lot.pricePerUnit;
            const salePrice = transaction.pricePerUnit;
            
            // Calculate gain/loss for this lot portion
            const purchaseCostTHB = (quantityFromThisLot * costPerUnit) * lot.exchangeRate;
            const saleProceedsTHB = (quantityFromThisLot * salePrice) * transaction.exchangeRate;
            const realizedGainTHB = saleProceedsTHB - purchaseCostTHB;

            lotsSold.push({
                lotId: lot.id,
                purchaseDate: lot.purchaseDate,
                quantitySold: quantityFromThisLot,
                purchasePrice: costPerUnit,
                purchaseCurrency: lot.currency,
                purchaseExchangeRate: lot.exchangeRate,
                salePrice: salePrice,
                saleCurrency: transaction.currency,
                saleExchangeRate: transaction.exchangeRate,
                costBasisTHB: purchaseCostTHB,
                proceedsTHB: saleProceedsTHB,
                realizedGainTHB: realizedGainTHB,
                holdingPeriodDays: this.calculateHoldingPeriod(lot.purchaseDate, transaction.date)
            });

            // Update lot
            const lotIndex = lots.findIndex(l => l.id === lot.id);
            if (lotIndex !== -1) {
                lots[lotIndex].remainingQuantity -= quantityFromThisLot;
                
                if (lots[lotIndex].remainingQuantity <= 0) {
                    lots[lotIndex].status = 'CLOSED';
                    lots[lotIndex].closedAt = new Date().toISOString();
                }
            }

            remainingToSell -= quantityFromThisLot;
        }

        // Save updated lots
        this.saveLots(lots);

        // Create sale record
        const totalCostBasis = lotsSold.reduce((sum, lot) => sum + lot.costBasisTHB, 0);
        const totalProceeds = lotsSold.reduce((sum, lot) => sum + lot.proceedsTHB, 0);
        const totalRealizedGain = totalProceeds - totalCostBasis;
        const avgPurchasePrice = totalCostBasis / transaction.quantity / (transaction.exchangeRate || 1);

        const saleRecord = {
            id: Utils.generateId(),
            portfolioId: transaction.portfolioId,
            assetId: transaction.assetId,
            saleTransactionId: transaction.id,
            saleDate: transaction.date,
            quantitySold: transaction.quantity,
            avgPurchasePrice: avgPurchasePrice,
            salePrice: transaction.pricePerUnit,
            currency: transaction.currency,
            exchangeRate: transaction.exchangeRate || 1,
            totalCostBasisTHB: totalCostBasis,
            totalProceedsTHB: totalProceeds,
            realizedGainTHB: totalRealizedGain,
            lotsSold: lotsSold,
            createdAt: new Date().toISOString()
        };

        // Save sale record
        const sales = this.getAllSales();
        sales.push(saleRecord);
        this.saveSales(sales);

        console.log('FIFO sale processed:', saleRecord.id, 'Realized gain:', totalRealizedGain);
        return saleRecord;
    },

    /**
     * Calculate holding period in days
     * @param {string} purchaseDate - Purchase date
     * @param {string} saleDate - Sale date
     * @returns {number} Days held
     */
    calculateHoldingPeriod(purchaseDate, saleDate) {
        const purchase = new Date(purchaseDate);
        const sale = new Date(saleDate);
        const diffTime = Math.abs(sale - purchase);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },

    /**
     * Get all lots for an asset
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID
     * @returns {array} Array of lots
     */
    getAssetLots(portfolioId, assetId) {
        const lots = this.getAllLots();
        return lots.filter(lot => 
            lot.portfolioId === portfolioId && 
            lot.assetId === assetId
        );
    },

    /**
     * Get active (open) lots for an asset
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID
     * @returns {array} Array of open lots
     */
    getActiveLots(portfolioId, assetId) {
        return this.getAssetLots(portfolioId, assetId)
            .filter(lot => lot.status === 'OPEN' && lot.remainingQuantity > 0)
            .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
    },

    /**
     * Get lot details with current value and unrealized gains
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID
     * @param {number} currentPrice - Current price of asset
     * @param {string} currentCurrency - Currency of current price
     * @returns {array} Array of lot details
     */
    getLotDetails(portfolioId, assetId, currentPrice, currentCurrency = 'USD') {
        const activeLots = this.getActiveLots(portfolioId, assetId);
        const exchangeRate = window.getExchangeRate ? window.getExchangeRate() : 35;

        return activeLots.map(lot => {
            // Calculate current value in THB
            let currentValueTHB;
            if (currentCurrency === 'USD') {
                currentValueTHB = lot.remainingQuantity * currentPrice * exchangeRate;
            } else {
                currentValueTHB = lot.remainingQuantity * currentPrice;
            }

            // Calculate cost basis for remaining quantity
            const costBasisPerUnit = lot.costBasisTHB / lot.quantity;
            const remainingCostBasis = costBasisPerUnit * lot.remainingQuantity;

            // Calculate unrealized gain/loss
            const unrealizedGainTHB = currentValueTHB - remainingCostBasis;
            const unrealizedGainPercent = (unrealizedGainTHB / remainingCostBasis) * 100;

            // Calculate holding period
            const holdingDays = this.calculateHoldingPeriod(lot.purchaseDate, new Date().toISOString());

            return {
                ...lot,
                currentPrice: currentPrice,
                currentCurrency: currentCurrency,
                currentValueTHB: currentValueTHB,
                remainingCostBasisTHB: remainingCostBasis,
                unrealizedGainTHB: unrealizedGainTHB,
                unrealizedGainPercent: unrealizedGainPercent,
                holdingDays: holdingDays,
                costPerUnitTHB: costBasisPerUnit / lot.quantity
            };
        });
    },

    /**
     * Calculate total unrealized gains for an asset
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID
     * @param {number} currentPrice - Current price
     * @param {string} currentCurrency - Currency of current price
     * @returns {object} Unrealized gains summary
     */
    calculateUnrealizedGains(portfolioId, assetId, currentPrice, currentCurrency = 'USD') {
        const lotDetails = this.getLotDetails(portfolioId, assetId, currentPrice, currentCurrency);

        const totalQuantity = lotDetails.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
        const totalCostBasis = lotDetails.reduce((sum, lot) => sum + lot.remainingCostBasisTHB, 0);
        const totalCurrentValue = lotDetails.reduce((sum, lot) => sum + lot.currentValueTHB, 0);
        const totalUnrealizedGain = totalCurrentValue - totalCostBasis;
        const avgCostPerUnit = totalQuantity > 0 ? totalCostBasis / totalQuantity : 0;

        return {
            totalQuantity: totalQuantity,
            totalCostBasisTHB: totalCostBasis,
            totalCurrentValueTHB: totalCurrentValue,
            totalUnrealizedGainTHB: totalUnrealizedGain,
            unrealizedGainPercent: totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0,
            avgCostPerUnitTHB: avgCostPerUnit,
            currentPrice: currentPrice,
            lotsCount: lotDetails.length
        };
    },

    /**
     * Get sale history for an asset
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID (optional)
     * @returns {array} Array of sale records
     */
    getSaleHistory(portfolioId, assetId = null) {
        let sales = this.getAllSales();
        
        sales = sales.filter(sale => sale.portfolioId === portfolioId);
        
        if (assetId) {
            sales = sales.filter(sale => sale.assetId === assetId);
        }

        // Sort by date (newest first)
        sales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

        return sales;
    },

    /**
     * Get all lots from storage
     * @returns {array} Array of all lots
     */
    getAllLots() {
        return StorageManager.loadFromLocal('PM_FIFO_LOTS') || [];
    },

    /**
     * Save lots to storage
     * @param {array} lots - Array of lots to save
     */
    saveLots(lots) {
        StorageManager.saveToLocal('PM_FIFO_LOTS', lots);
    },

    /**
     * Get all sales from storage
     * @returns {array} Array of all sales
     */
    getAllSales() {
        return StorageManager.loadFromLocal('PM_FIFO_SALES') || [];
    },

    /**
     * Save sales to storage
     * @param {array} sales - Array of sales to save
     */
    saveSales(sales) {
        StorageManager.saveToLocal('PM_FIFO_SALES', sales);
    },

    /**
     * Create a currency lot when transferring THB → USD
     * @param {object} transaction - The TRANSFER transaction
     * @returns {object} Created USD lot
     */
    createCurrencyLot(transaction) {
        if (transaction.type !== 'TRANSFER') {
            throw new Error('Can only create currency lots from TRANSFER transactions');
        }

        const lot = {
            id: Utils.generateId(),
            portfolioId: transaction.portfolioId,
            assetId: 'USD_CURRENCY',
            transactionId: transaction.id,
            purchaseDate: transaction.date,
            quantity: transaction.destinationAmount,
            remainingQuantity: transaction.destinationAmount,
            pricePerUnit: transaction.exchangeRate,
            currency: 'USD',
            exchangeRate: transaction.exchangeRate,
            costBasisTHB: transaction.totalAmount,
            status: 'OPEN',
            accountId: transaction.destinationAccountId,
            createdAt: new Date().toISOString()
        };

        // Save lot
        const lots = this.getAllLots();
        lots.push(lot);
        this.saveLots(lots);

        console.log('USD lot created:', lot.quantity, 'USD @', lot.pricePerUnit, 'THB/USD');
        return lot;
    },

    /**
     * Consume USD lots using FIFO when buying USD-denominated assets
     * @param {string} portfolioId - Portfolio ID
     * @param {string} accountId - Account ID (FCD account)
     * @param {number} usdAmount - Amount of USD needed
     * @returns {object} Consumption details with weighted exchange rate
     */
    consumeUSDLots(portfolioId, accountId, usdAmount) {
        // Get available USD lots for this account (oldest first)
        const usdLots = this.getAllLots()
            .filter(lot => 
                lot.portfolioId === portfolioId &&
                lot.assetId === 'USD_CURRENCY' &&
                lot.accountId === accountId &&
                lot.status === 'OPEN' &&
                lot.remainingQuantity > 0
            )
            .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

        // Check if enough USD available
        const totalAvailable = usdLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
        if (totalAvailable < usdAmount) {
            throw new Error(`Insufficient USD in account. Need ${usdAmount}, have ${totalAvailable}`);
        }

        // Consume USD using FIFO
        let remainingToConsume = usdAmount;
        const lotsUsed = [];
        let totalCostTHB = 0;
        const lots = this.getAllLots();

        for (const lot of usdLots) {
            if (remainingToConsume <= 0) break;

            const quantityFromThisLot = Math.min(lot.remainingQuantity, remainingToConsume);
            const costForThisPortion = quantityFromThisLot * lot.pricePerUnit;

            lotsUsed.push({
                lotId: lot.id,
                quantity: quantityFromThisLot,
                rate: lot.pricePerUnit,
                costTHB: costForThisPortion
            });

            totalCostTHB += costForThisPortion;

            // Update lot
            const lotIndex = lots.findIndex(l => l.id === lot.id);
            if (lotIndex !== -1) {
                lots[lotIndex].remainingQuantity -= quantityFromThisLot;
                
                if (lots[lotIndex].remainingQuantity <= 0) {
                    lots[lotIndex].status = 'CLOSED';
                    lots[lotIndex].closedAt = new Date().toISOString();
                }
            }

            remainingToConsume -= quantityFromThisLot;
        }

        // Save updated lots
        this.saveLots(lots);

        // Calculate weighted exchange rate
        const weightedRate = totalCostTHB / usdAmount;

        console.log(`Consumed ${usdAmount} USD from ${lotsUsed.length} lot(s), weighted rate: ${weightedRate.toFixed(4)} THB/USD`);

        return {
            lotsUsed,
            totalCostTHB,
            weightedExchangeRate: weightedRate
        };
    },

    /**
     * Get available USD balance in an account
     * @param {string} portfolioId - Portfolio ID
     * @param {string} accountId - Account ID
     * @returns {number} Available USD amount
     */
    getAvailableUSD(portfolioId, accountId) {
        const usdLots = this.getAllLots()
            .filter(lot => 
                lot.portfolioId === portfolioId &&
                lot.assetId === 'USD_CURRENCY' &&
                lot.accountId === accountId &&
                lot.status === 'OPEN'
            );
        
        return usdLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
    },

    /**
     * Delete a lot (admin function)
     * @param {string} lotId - Lot ID to delete
     * @returns {boolean} Success status
     */
    deleteLot(lotId) {
        const lots = this.getAllLots();
        const filtered = lots.filter(lot => lot.id !== lotId);
        
        if (filtered.length < lots.length) {
            this.saveLots(filtered);
            console.log('Lot deleted:', lotId);
            return true;
        }
        
        return false;
    },

    /**
     * Clear all FIFO data (use with caution)
     */
    clearAllData() {
        if (confirm('Are you sure you want to clear all FIFO lot data? This cannot be undone.')) {
            this.saveLots([]);
            this.saveSales([]);
            Utils.showNotification('FIFO data cleared', 'info');
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    FIFOManager.init();
});

// Export for use in other modules
window.FIFOManager = FIFOManager;