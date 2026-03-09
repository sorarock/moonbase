/* ============================================================================
   TRANSACTION MANAGER
   Record and track investment transactions (BUY/SELL/DIVIDEND)
   ============================================================================ */

const TransactionManager = {
    /**
     * Initialize transaction manager
     */
    init() {
        console.log('Transaction Manager initialized');
    },

    /**
     * Record a new transaction
     * @param {object} data - Transaction data
     */
    recordTransaction(data) {
        // Validate required fields
        if (!data.portfolioId || !data.type) {
            throw new Error('Portfolio ID and transaction type are required');
        }

        // Handle TRANSFER transactions differently
        if (data.type === 'TRANSFER') {
            return this.recordTransfer(data);
        }

        // Validate account if specified
        if (data.accountId) {
            const account = AccountManager.getAccount(data.accountId);
            if (!account) {
                throw new Error('Account not found');
            }
        }

        const transaction = {
            id: Utils.generateId(),
            portfolioId: data.portfolioId,
            accountId: data.accountId || null,
            assetId: data.assetId || null,
            type: data.type, // BUY, SELL, DIVIDEND, DEPOSIT, WITHDRAW, INTEREST, TRANSFER
            assetName: data.assetName || '',
            assetTicker: data.assetTicker || '',
            quantity: parseFloat(data.quantity) || 0,
            pricePerUnit: parseFloat(data.pricePerUnit) || 0,
            totalAmount: parseFloat(data.totalAmount) || 0,
            currency: data.currency || 'THB',
            fee: parseFloat(data.fee) || 0,
            exchangeRate: parseFloat(data.exchangeRate) || 1,
            date: data.date || new Date().toISOString(),
            description: data.description || '',
            notes: data.notes || ''
        };

        // Validate transaction
        const validation = this.validateTransaction(transaction);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Process transaction based on type
        if (transaction.type === 'BUY') {
            this.processBuyTransaction(transaction);
        } else if (transaction.type === 'SELL') {
            this.processSellTransaction(transaction);
        } else if (transaction.type === 'DIVIDEND') {
            this.processDividendTransaction(transaction);
        }

        // Save transaction
        StorageManager.addTransaction(transaction);
        
        Utils.showNotification(`Transaction recorded successfully!`, 'success');
        return transaction;
    },

    /**
     * Process BUY transaction
     * @param {object} transaction - Transaction object
     */
    processBuyTransaction(transaction) {
        let usdLotsConsumed = false;
        
        // NEW: If buying with USD from FCD account, consume USD lots using FIFO
        if (transaction.currency === 'USD' && transaction.accountId && window.FIFOManager) {
            const account = AccountManager.getAccount(transaction.accountId);
            
            if (account && account.currency === 'USD') {
                try {
                    const totalUSDNeeded = transaction.totalAmount + (transaction.fee || 0);
                    const usdConsumption = FIFOManager.consumeUSDLots(
                        transaction.portfolioId,
                        transaction.accountId,
                        totalUSDNeeded
                    );
                    
                    // Use weighted exchange rate from USD lots consumed
                    transaction.exchangeRate = usdConsumption.weightedExchangeRate;
                    transaction.usdLotsUsed = usdConsumption.lotsUsed;
                    usdLotsConsumed = true;
                    
                    console.log(`✓ Consumed ${totalUSDNeeded} USD from ${usdConsumption.lotsUsed.length} lot(s)`);
                    console.log(`✓ Weighted exchange rate: ${usdConsumption.weightedExchangeRate.toFixed(4)} THB/USD`);
                    
                    // When USD lots are consumed, also deduct from account balance to keep it in sync
                    const currentBalance = AccountManager.calculateBalanceAsOfDate(account.id, new Date());
                    const success = StorageManager.updateAccount(transaction.accountId, {
                        balance: currentBalance - totalUSDNeeded
                    });
                    
                    if (!success) {
                        throw new Error('Failed to update account balance');
                    }
                } catch (error) {
                    console.warn('USD FIFO consumption failed:', error.message);
                    usdLotsConsumed = false;
                    // Fall back to using provided exchange rate or default
                    if (!transaction.exchangeRate) {
                        transaction.exchangeRate = window.getExchangeRate ? window.getExchangeRate() : 35;
                    }
                }
            }
        }
        
        // Deduct from account if specified AND USD lots were NOT consumed
        // (to avoid double-deduction when using USD FIFO tracking)
        if (transaction.accountId && !usdLotsConsumed) {
            const account = AccountManager.getAccount(transaction.accountId);
            if (!account) {
                throw new Error('Account not found');
            }

            const totalCost = transaction.totalAmount + transaction.fee;

            // Check sufficient balance using calculated balance from transactions
            const calculatedBalance = AccountManager.calculateBalanceAsOfDate(account.id, new Date());
            if (calculatedBalance < totalCost) {
                throw new Error(`Insufficient balance in account. Required: ${Utils.formatCurrency(totalCost, account.currency)}, Available: ${Utils.formatCurrency(calculatedBalance, account.currency)}`);
            }

            // Update balance directly to avoid duplicate transaction records
            // Use calculated balance to ensure accuracy
            const success = StorageManager.updateAccount(transaction.accountId, {
                balance: calculatedBalance - totalCost
            });
            
            if (!success) {
                throw new Error('Failed to update account balance');
            }
        }

        // Update position (average cost method)
        this.updatePosition(transaction.portfolioId, transaction.assetId, transaction.quantity, transaction.pricePerUnit, 'ADD');
        
        // Create FIFO lot for detailed tracking
        if (window.FIFOManager) {
            try {
                FIFOManager.createLot(transaction);
            } catch (error) {
                console.warn('FIFO lot creation failed:', error.message);
            }
        }
    },

    /**
     * Process SELL transaction
     * @param {object} transaction - Transaction object
     */
    processSellTransaction(transaction) {
        // Check if sufficient shares to sell
        const position = this.getPosition(transaction.portfolioId, transaction.assetId);
        if (!position || position.quantity < transaction.quantity) {
            throw new Error(`Insufficient shares to sell. Available: ${position ? position.quantity : 0}`);
        }

        // Add proceeds to account if specified
        if (transaction.accountId) {
            const account = AccountManager.getAccount(transaction.accountId);
            if (!account) {
                throw new Error('Account not found');
            }
            
            const proceeds = transaction.totalAmount - transaction.fee;

            // Update balance directly to avoid duplicate transaction records
            // Use calculated balance to ensure accuracy
            const calculatedBalance = AccountManager.calculateBalanceAsOfDate(account.id, new Date());
            const success = StorageManager.updateAccount(transaction.accountId, {
                balance: calculatedBalance + proceeds
            });
            
            if (!success) {
                throw new Error('Failed to update account balance');
            }
        }

        // Update position (average cost method)
        this.updatePosition(transaction.portfolioId, transaction.assetId, transaction.quantity, transaction.pricePerUnit, 'REMOVE');
        
        // Process FIFO sale for detailed tracking
        if (window.FIFOManager) {
            try {
                const saleRecord = FIFOManager.processFIFOSale(transaction);
                console.log('FIFO sale recorded. Realized gain:', Utils.formatCurrency(saleRecord.realizedGainTHB, 'THB'));
            } catch (error) {
                console.warn('FIFO sale processing failed:', error.message);
            }
        }
    },

    /**
     * Process DIVIDEND transaction
     * @param {object} transaction - Transaction object
     */
    processDividendTransaction(transaction) {
        // Add dividend to account if specified
        if (transaction.accountId) {
            const account = AccountManager.getAccount(transaction.accountId);
            if (!account) {
                throw new Error('Account not found');
            }
            
            // Update balance directly to avoid duplicate transaction records
            // Use calculated balance to ensure accuracy
            const calculatedBalance = AccountManager.calculateBalanceAsOfDate(account.id, new Date());
            const success = StorageManager.updateAccount(transaction.accountId, {
                balance: calculatedBalance + transaction.totalAmount
            });
            
            if (!success) {
                throw new Error('Failed to update account balance');
            }
        }
    },

    /**
     * Record a transfer between accounts
     * @param {object} data - Transfer data
     */
    recordTransfer(data) {
        // Validate required fields
        if (!data.accountId || !data.destinationAccountId) {
            throw new Error('Source and destination accounts are required for transfers');
        }

        if (data.accountId === data.destinationAccountId) {
            throw new Error('Cannot transfer to the same account');
        }

        if (!data.totalAmount || data.totalAmount <= 0) {
            throw new Error('Transfer amount must be greater than 0');
        }

        // Get accounts
        const sourceAccount = AccountManager.getAccount(data.accountId);
        const destAccount = AccountManager.getAccount(data.destinationAccountId);

        if (!sourceAccount || !destAccount) {
            throw new Error('Source or destination account not found');
        }

        // Check sufficient balance
        const totalCost = data.totalAmount + (data.fee || 0);
        if (sourceAccount.balance < totalCost) {
            throw new Error(`Insufficient balance. Required: ${Utils.formatCurrency(totalCost, sourceAccount.currency)}, Available: ${Utils.formatCurrency(sourceAccount.balance, sourceAccount.currency)}`);
        }

        // Calculate exchange rate and destination amount
        let exchangeRate = parseFloat(data.exchangeRate) || 1;
        let destAmount = data.totalAmount;

        if (sourceAccount.currency !== destAccount.currency) {
            // Use provided exchange rate or default to 1
            if (!data.exchangeRate || data.exchangeRate <= 0) {
                Utils.showNotification(
                    `Warning: No exchange rate provided. Using 1:1 conversion.`,
                    'warning'
                );
                exchangeRate = 1;
            }
            
            // Calculate destination amount based on exchange rate
            // exchangeRate = how many source currency units = 1 destination currency unit
            destAmount = data.totalAmount / exchangeRate;
        }

        // Create transfer transaction
        const transaction = {
            id: Utils.generateId(),
            portfolioId: data.portfolioId,
            accountId: data.accountId,
            destinationAccountId: data.destinationAccountId,
            type: 'TRANSFER',
            assetId: null,
            assetName: '',
            assetTicker: '',
            quantity: 0,
            pricePerUnit: 0,
            totalAmount: data.totalAmount,
            currency: sourceAccount.currency,
            destinationAmount: destAmount,
            destinationCurrency: destAccount.currency,
            fee: data.fee || 0,
            exchangeRate: exchangeRate,
            date: data.date || new Date().toISOString(),
            description: sourceAccount.currency !== destAccount.currency 
                ? `Transfer ${Utils.formatCurrency(data.totalAmount, sourceAccount.currency)} → ${Utils.formatCurrency(destAmount, destAccount.currency)} (rate: ${exchangeRate})`
                : `Transfer from ${sourceAccount.name} to ${destAccount.name}`,
            notes: data.notes || ''
        };

        // Update balances directly to avoid duplicate transaction records
        const success1 = StorageManager.updateAccount(data.accountId, {
            balance: sourceAccount.balance - totalCost
        });

        const success2 = StorageManager.updateAccount(data.destinationAccountId, {
            balance: destAccount.balance + destAmount
        });

        if (!success1 || !success2) {
            throw new Error('Failed to update account balances');
        }

        // Save single transfer transaction
        StorageManager.addTransaction(transaction);
        
        // NEW: If transferring THB → USD, create USD lot for FIFO tracking
        if (sourceAccount.currency === 'THB' && destAccount.currency === 'USD' && window.FIFOManager) {
            try {
                const usdLot = FIFOManager.createCurrencyLot(transaction);
                console.log(`✓ USD lot created: ${usdLot.quantity} USD @ ${usdLot.pricePerUnit} THB/USD (Cost: ${usdLot.costBasisTHB} THB)`);
            } catch (error) {
                console.warn('USD lot creation failed:', error.message);
            }
        }
        
        Utils.showNotification(
            `Transferred ${Utils.formatCurrency(data.totalAmount, sourceAccount.currency)} from ${sourceAccount.name} to ${destAccount.name}`,
            'success'
        );
        
        return transaction;
    },

    /**
     * Update position for an asset
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID
     * @param {number} quantity - Quantity to add/remove
     * @param {number} price - Price per unit
     * @param {string} action - 'ADD' or 'REMOVE'
     */
    updatePosition(portfolioId, assetId, quantity, price, action) {
        const positions = StorageManager.loadFromLocal(StorageManager.KEYS.POSITIONS) || [];
        
        // Find existing position
        let position = positions.find(p => p.portfolioId === portfolioId && p.assetId === assetId);
        
        if (!position) {
            // Create new position
            position = {
                id: Utils.generateId(),
                portfolioId: portfolioId,
                assetId: assetId,
                quantity: 0,
                totalCost: 0,
                averageCost: 0
            };
            positions.push(position);
        }

        if (action === 'ADD') {
            // Add to position
            const newTotalCost = position.totalCost + (quantity * price);
            const newQuantity = position.quantity + quantity;
            
            position.quantity = newQuantity;
            position.totalCost = newTotalCost;
            position.averageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;
            
        } else if (action === 'REMOVE') {
            // Remove from position
            const costToRemove = position.averageCost * quantity;
            
            position.quantity -= quantity;
            position.totalCost -= costToRemove;
            
            if (position.quantity <= 0) {
                // Remove position if quantity is 0
                const index = positions.findIndex(p => p.id === position.id);
                if (index !== -1) {
                    positions.splice(index, 1);
                }
            } else {
                position.averageCost = position.totalCost / position.quantity;
            }
        }

        StorageManager.saveToLocal(StorageManager.KEYS.POSITIONS, positions);
    },

    /**
     * Get position for an asset
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID
     * @returns {object|null} Position object
     */
    getPosition(portfolioId, assetId) {
        const positions = StorageManager.loadFromLocal(StorageManager.KEYS.POSITIONS) || [];
        return positions.find(p => p.portfolioId === portfolioId && p.assetId === assetId) || null;
    },

    /**
     * Get all positions for a portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {array} Array of positions
     */
    getPortfolioPositions(portfolioId) {
        const positions = StorageManager.loadFromLocal(StorageManager.KEYS.POSITIONS) || [];
        return positions.filter(p => p.portfolioId === portfolioId);
    },

    /**
     * Get all transactions
     * @param {object} filters - Filter options
     * @returns {array} Array of transactions
     */
    getTransactions(filters = {}) {
        let transactions = StorageManager.getTransactions();

        // Apply filters
        if (filters.portfolioId) {
            transactions = transactions.filter(t => t.portfolioId === filters.portfolioId);
        }

        if (filters.accountId) {
            transactions = transactions.filter(t => t.accountId === filters.accountId);
        }

        if (filters.assetId) {
            transactions = transactions.filter(t => t.assetId === filters.assetId);
        }

        if (filters.type) {
            transactions = transactions.filter(t => t.type === filters.type);
        }

        if (filters.startDate) {
            transactions = transactions.filter(t => new Date(t.date) >= new Date(filters.startDate));
        }

        if (filters.endDate) {
            transactions = transactions.filter(t => new Date(t.date) <= new Date(filters.endDate));
        }

        // Sort by date (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        return transactions;
    },

    /**
     * Get transaction by ID
     * @param {string} transactionId - Transaction ID
     * @returns {object|null} Transaction object
     */
    getTransaction(transactionId) {
        const transactions = StorageManager.getTransactions();
        return transactions.find(t => t.id === transactionId) || null;
    },

    /**
     * Update transaction
     * @param {string} transactionId - Transaction ID
     * @param {object} updates - Updates to apply
     * @returns {boolean} Success status
     */
    updateTransaction(transactionId, updates) {
        const transactions = StorageManager.getTransactions();
        const index = transactions.findIndex(t => t.id === transactionId);
        
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...updates };
            StorageManager.saveTransactions(transactions);
            Utils.showNotification('Transaction updated successfully', 'success');
            return true;
        }
        
        return false;
    },

    /**
     * Delete transaction
     * @param {string} transactionId - Transaction ID
     * @returns {boolean} Success status
     */
    deleteTransaction(transactionId) {
        const transaction = this.getTransaction(transactionId);
        if (!transaction) return false;

        // Reverse the transaction effects
        if (transaction.type === 'BUY' && transaction.accountId) {
            // Refund to account
            const totalCost = transaction.totalAmount + transaction.fee;
            AccountManager.deposit(transaction.accountId, totalCost, `Reversed: Purchase ${transaction.assetTicker}`, new Date().toISOString());
            
            // Remove from position
            this.updatePosition(transaction.portfolioId, transaction.assetId, transaction.quantity, transaction.pricePerUnit, 'REMOVE');
            
        } else if (transaction.type === 'SELL' && transaction.accountId) {
            // Deduct from account
            const proceeds = transaction.totalAmount - transaction.fee;
            AccountManager.withdraw(transaction.accountId, proceeds, `Reversed: Sale of ${transaction.assetTicker}`, new Date().toISOString());
            
            // Add back to position
            this.updatePosition(transaction.portfolioId, transaction.assetId, transaction.quantity, transaction.pricePerUnit, 'ADD');
        }

        // Delete transaction
        const transactions = StorageManager.getTransactions();
        const filtered = transactions.filter(t => t.id !== transactionId);
        StorageManager.saveTransactions(filtered);
        
        Utils.showNotification('Transaction deleted', 'info');
        return true;
    },

    /**
     * Validate transaction
     * @param {object} transaction - Transaction to validate
     * @returns {object} Validation result
     */
    validateTransaction(transaction) {
        if (!transaction.type) {
            return { isValid: false, error: 'Transaction type is required' };
        }

        if (transaction.type === 'BUY' || transaction.type === 'SELL') {
            if (!transaction.assetId) {
                return { isValid: false, error: 'Asset is required for BUY/SELL transactions' };
            }

            if (transaction.quantity <= 0) {
                return { isValid: false, error: 'Quantity must be greater than 0' };
            }

            if (transaction.pricePerUnit <= 0) {
                return { isValid: false, error: 'Price per unit must be greater than 0' };
            }
        }

        if (transaction.totalAmount < 0) {
            return { isValid: false, error: 'Total amount cannot be negative' };
        }

        return { isValid: true };
    },

    /**
     * Calculate portfolio statistics
     * @param {string} portfolioId - Portfolio ID
     * @returns {object} Portfolio statistics
     */
    calculatePortfolioStats(portfolioId) {
        const transactions = this.getTransactions({ portfolioId });
        
        // Filter transactions by global as of date
        const asOfDate = App.getAsOfDate();
        const filteredTransactions = Utils.filterTransactionsByAsOfDate(transactions, asOfDate);
        
        // Get actual exchange rates from transfer transactions
        const exchangeRates = PortfolioManager.getExchangeRatesFromTransfers(portfolioId);
        
        let totalDeposits = 0;   // Only DEPOSIT transactions
        let totalBuyAmount = 0;  // All BUY transaction amounts
        let totalFees = 0;
        let totalDividends = 0;

        filteredTransactions.forEach(t => {
            // Convert to THB using stored exchange rate
            let amountInTHB = t.totalAmount;
            let feeInTHB = t.fee || 0;
            
            if (t.currency === 'USD') {
                // Use actual exchange rate from transfers, or fallback to 35
                const rate = exchangeRates.USD_TO_THB || 35;
                amountInTHB = t.totalAmount * rate;
                feeInTHB = (t.fee || 0) * rate;
            }

            if (t.type === 'BUY') {
                // Track total amount spent on buying assets (including fees)
                totalBuyAmount += (amountInTHB + feeInTHB);
                totalFees += feeInTHB;
                
            } else if (t.type === 'SELL') {
                // Subtract proceeds from buy amount (asset was sold)
                totalBuyAmount -= (amountInTHB - feeInTHB);
                totalFees += feeInTHB;
                
            } else if (t.type === 'DIVIDEND') {
                // Track dividends separately
                totalDividends += amountInTHB;
                
            } else if (t.type === 'TRANSFER') {
                // Track transfer fees only (amount already moved between accounts)
                totalFees += feeInTHB;
                
            } else if (t.type === 'DEPOSIT') {
                // Only count actual deposits
                totalDeposits += amountInTHB;
            }
        });

        // ===================================================================
        // Calculate Total Asset (Cost) using FIFO historical exchange rates
        // ===================================================================

        let totalCostBasisTHB = 0;

        // Use FIFO lots for accurate historical cost basis (uses historical exchange rates)
        if (window.FIFOManager) {
            const lots = FIFOManager.getAllLots().filter(lot =>
                lot.portfolioId === portfolioId && lot.remainingQuantity > 0
            );

            lots.forEach(lot => {
                // For USD currency lots, use remainingQuantity * exchangeRate
                // For asset lots (stocks/ETFs), use remainingQuantity * pricePerUnit * exchangeRate
                let costInTHB;
                if (lot.currency === 'USD' || lot.assetId === 'USD_CURRENCY') {
                    // USD lots: Just multiply quantity by exchange rate
                    costInTHB = lot.remainingQuantity * lot.exchangeRate;
                } else {
                    // Asset lots: quantity × price × exchange rate
                    costInTHB = lot.remainingQuantity * lot.pricePerUnit * lot.exchangeRate;
                }
                totalCostBasisTHB += costInTHB;
            });

            console.log(`✓ Total cost basis from ${lots.length} FIFO lots: ฿${totalCostBasisTHB.toFixed(2)}`);
        }

        // Fallback: Calculate from BUY transactions if FIFO not available
        if (totalCostBasisTHB === 0 && totalBuyAmount > 0) {
            filteredTransactions.forEach(txn => {
                if (txn.type === 'BUY') {
                    const costInTHB = (txn.totalAmount + (txn.fee || 0)) * (txn.exchangeRate || 1);
                    totalCostBasisTHB += costInTHB;
                }
            });
            console.log('⚠️ Using transaction-based cost calculation (FIFO not available)');
        }

        // Get account balances for "Total Asset Value as of" calculation
        // NOTE: Do NOT add to totalCostBasisTHB as USD FIFO lots already represent the cost basis of USD in accounts
        let accountBalancesTHB = 0;
        const accounts = AccountManager.getAccountsByPortfolio(portfolioId);
        accounts.forEach(acc => {
            // Use calculateBalanceAsOfDate from AccountManager which properly handles as-of-date logic
            const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(acc.id, asOfDate);

            // Convert to THB for total calculation
            if (acc.currency === 'THB') {
                accountBalancesTHB += balanceAsOfDate;
            } else if (acc.currency === 'USD') {
                // Use current exchange rate for cash balances
                const rate = getExchangeRate();
                accountBalancesTHB += balanceAsOfDate * rate;
            } else {
                // For other currencies, add as-is (will be enhanced later)
                accountBalancesTHB += balanceAsOfDate;
            }
        });

        console.log(`=== Total Asset (Cost) Calculation ===`);
        console.log(`Cost basis from FIFO lots: ฿${totalCostBasisTHB.toFixed(2)}`);
        console.log(`Account balances (for reference): ฿${accountBalancesTHB.toFixed(2)}`);

        // Total Asset (Cost) = FIFO cost basis ONLY
        // Do NOT add account balances - they're already represented in FIFO lots for USD
        const totalAssetValue = totalCostBasisTHB;

        console.log(`Total Asset (Cost): ฿${totalAssetValue.toFixed(2)}`);

        // Total Gain/Loss = Total Asset - Total Deposit
        const totalGainLoss = totalAssetValue - totalDeposits;

        // NEW: Calculate Total Asset Value as of using manual prices from portfolio
        let totalAssetValueAsOf = 0;
        
        // Get global exchange rate from dashboard
        const globalExchangeRate = getExchangeRate();
        
        // Get portfolio for asset information
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        
        if (portfolio) {
            portfolio.assets.forEach(asset => {
                // For savings accounts, use account balance
                if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
                    const linkedAccounts = accounts.filter(acc => 
                        acc.linkedAssetId === asset.id || 
                        (acc.linkedAssetType === asset.type && acc.linkedAssetName === asset.name)
                    );
                    linkedAccounts.forEach(acc => {
                        const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(acc.id, asOfDate);
                        if (acc.currency === 'USD') {
                            totalAssetValueAsOf += balanceAsOfDate * globalExchangeRate;
                        } else {
                            totalAssetValueAsOf += balanceAsOfDate;
                        }
                    });
                } else {
                    // For regular assets, calculate quantity from transactions
                    const assetTransactions = filteredTransactions.filter(txn => txn.assetId === asset.id);
                    let quantity = 0;
                    
                    assetTransactions.forEach(txn => {
                        if (txn.type === 'BUY') {
                            quantity += txn.quantity;
                        } else if (txn.type === 'SELL') {
                            quantity -= txn.quantity;
                        }
                    });
                    
                    // Use manual price from PriceManager
                    if (quantity > 0) {
                        const priceData = PriceManager.getCurrentPrice(asset.id);
                        if (priceData) {
                            let assetValue = quantity * priceData.price;
                            // Convert USD to THB using global exchange rate
                            if (priceData.currency === 'USD') {
                                assetValue *= globalExchangeRate;
                            }
                            totalAssetValueAsOf += assetValue;
                        }
                    }
                }
            });
            
            // Add remaining cash balances from accounts not linked to savings assets
            const linkedAccountIds = new Set();
            portfolio.assets.forEach(asset => {
                if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
                    accounts.filter(acc => 
                        acc.linkedAssetId === asset.id || 
                        (acc.linkedAssetType === asset.type && acc.linkedAssetName === asset.name)
                    ).forEach(acc => linkedAccountIds.add(acc.id));
                }
            });
            
            // Add cash from non-linked accounts
            accounts.forEach(acc => {
                if (!linkedAccountIds.has(acc.id)) {
                    const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(acc.id, asOfDate);
                    if (acc.currency === 'USD') {
                        totalAssetValueAsOf += balanceAsOfDate * globalExchangeRate;
                    } else {
                        totalAssetValueAsOf += balanceAsOfDate;
                    }
                }
            });
        }

        console.log(`=== Total Asset Value as of ===`);
        console.log(`Current exchange rate: ${globalExchangeRate.toFixed(4)}`);
        console.log(`Total Asset Value as of: ฿${totalAssetValueAsOf.toFixed(2)}`);
        console.log(`Unrealized Gain/Loss: ฿${(totalAssetValueAsOf - totalAssetValue).toFixed(2)}`);

        // NEW: Total Gain/Loss using manual prices
        const totalGainLossAsOf = totalAssetValueAsOf - totalDeposits;

        return {
            totalDeposits,
            totalAssetValue,           // Cost basis using FIFO historical exchange rates
            totalAssetValueAsOf,       // Current value using current prices + current exchange rate
            totalFees,
            totalGainLoss,             // Based on cost basis
            totalGainLossAsOf,         // Based on current value
            accountBalances: accountBalancesTHB,  // Cash balances in THB
            totalBuyAmount,
            totalDividends,
            transactionCount: filteredTransactions.length
        };
    },

    /**
     * Get transaction summary by type
     * @param {string} portfolioId - Portfolio ID
     * @returns {object} Summary by transaction type
     */
    getTransactionSummary(portfolioId) {
        const transactions = this.getTransactions({ portfolioId });
        
        const summary = {
            BUY: { count: 0, total: 0 },
            SELL: { count: 0, total: 0 },
            DIVIDEND: { count: 0, total: 0 },
            DEPOSIT: { count: 0, total: 0 },
            WITHDRAW: { count: 0, total: 0 },
            INTEREST: { count: 0, total: 0 }
        };

        transactions.forEach(t => {
            if (summary[t.type]) {
                summary[t.type].count++;
                summary[t.type].total += t.totalAmount;
            }
        });

        return summary;
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    TransactionManager.init();
});

// Export for use in other modules
window.TransactionManager = TransactionManager;