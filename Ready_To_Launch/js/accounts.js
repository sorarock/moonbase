/* ============================================================================
   ACCOUNT MANAGER
   Manage savings accounts (THB and FCD) with tiered interest rates
   ============================================================================ */

const AccountManager = {
    /**
     * Initialize account manager
     */
    init() {
        console.log('Account Manager initialized');
    },

    /**
     * Get default interest tiers based on account type
     * @param {string} type - Account type (thb_savings or fcd_account)
     * @returns {array} Interest tier structure
     */
    getDefaultInterestTiers(type) {
        if (type === 'thb_savings') {
            return [
                { min: 0, max: 10000, rate: 3.0 },
                { min: 10001, max: 500000, rate: 1.2 },
                { min: 500001, max: null, rate: 0.5 }
            ];
        } else if (type === 'fcd_account') {
            return [
                { min: 0, max: 3000, rate: 4.5 },
                { min: 3001, max: 30000, rate: 2.5 },
                { min: 30001, max: null, rate: 0.5 }
            ];
        }
        return [];
    },

    /**
     * Create new account
     * @param {object} accountData - Account configuration
     * @returns {object} Created account
     */
    createAccount(accountData) {
        // Validate required fields
        if (!accountData.name || !accountData.type || !accountData.portfolioId) {
            throw new Error('Account must have a name, type, and portfolio ID');
        }

        // Validate portfolio exists
        const portfolios = StorageManager.getPortfolios();
        const portfolioExists = portfolios.some(p => p.id === accountData.portfolioId);
        if (!portfolioExists) {
            throw new Error('Selected portfolio does not exist. Please select a valid portfolio.');
        }

        const account = {
            id: Utils.generateId(),
            portfolioId: accountData.portfolioId,
            name: accountData.name,
            type: accountData.type, // thb_savings or fcd_account
            currency: accountData.type === 'fcd_account' ? 'USD' : 'THB',
            balance: parseFloat(accountData.initialBalance || 0),
            institution: accountData.institution || '',
            accountNumber: accountData.accountNumber || '',
            interestTiers: accountData.interestTiers || this.getDefaultInterestTiers(accountData.type),
            createdDate: new Date().toISOString(),
            lastInterestPayment: null,
            notes: accountData.notes || '',
            linkedAssetId: accountData.linkedAssetId || null,
            linkedAssetName: accountData.linkedAssetName || null,
            linkedAssetType: accountData.linkedAssetType || null
        };

        // Save to storage
        StorageManager.addAccount(account);
        
        // If initial balance > 0, create deposit transaction
        if (account.balance > 0) {
            this.recordTransaction(account.id, 'DEPOSIT', account.balance, 'Initial deposit', new Date().toISOString());
        }

        Utils.showNotification(`Account "${account.name}" created successfully!`, 'success');
        return account;
    },

    /**
     * Update existing account
     * @param {string} accountId - Account ID
     * @param {object} updates - Updates to apply
     * @returns {boolean} Success status
     */
    updateAccount(accountId, updates) {
        const success = StorageManager.updateAccount(accountId, updates);
        if (success) {
            Utils.showNotification('Account updated successfully', 'success');
        }
        return success;
    },

    /**
     * Delete account
     * @param {string} accountId - Account ID
     * @returns {boolean} Success status
     */
    deleteAccount(accountId) {
        const account = this.getAccount(accountId);
        if (!account) return false;

        // Check if account has balance
        if (account.balance > 0) {
            if (!Utils.confirm(`This account has a balance of ${Utils.formatCurrency(account.balance, account.currency)}. Are you sure you want to delete it?`)) {
                return false;
            }
        }

        const success = StorageManager.deleteAccount(accountId);
        if (success) {
            Utils.showNotification('Account deleted', 'info');
        }
        return success;
    },

    /**
     * Get account by ID
     * @param {string} accountId - Account ID
     * @returns {object|null} Account object
     */
    getAccount(accountId) {
        const accounts = StorageManager.getAccounts();
        return accounts.find(a => a.id === accountId) || null;
    },

    /**
     * Get all accounts
     * @returns {array} Array of accounts
     */
    getAllAccounts() {
        return StorageManager.getAccounts();
    },

    /**
     * Get accounts for specific portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {array} Array of accounts
     */
    getAccountsByPortfolio(portfolioId) {
        const accounts = StorageManager.getAccounts();
        return accounts.filter(a => a.portfolioId === portfolioId);
    },

    /**
     * Deposit money to account
     * @param {string} accountId - Account ID
     * @param {number} amount - Amount to deposit
     * @param {string} description - Transaction description
     * @param {string} date - Transaction date
     * @returns {boolean} Success status
     */
    deposit(accountId, amount, description = 'Deposit', date = null, exchangeRate = 1) {
        const account = this.getAccount(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        if (amount <= 0) {
            throw new Error('Deposit amount must be greater than 0');
        }

        // If USD account and no exchange rate provided, use current rate
        if (account.currency === 'USD' && exchangeRate === 1) {
            exchangeRate = window.getExchangeRate ? window.getExchangeRate() : 1;
            console.log(`Using current exchange rate for DEPOSIT: ${exchangeRate.toFixed(4)}`);
        }

        const newBalance = account.balance + amount;
        const success = this.updateAccount(accountId, { balance: newBalance });

        if (success) {
            const txn = this.recordTransaction(accountId, 'DEPOSIT', amount, description, date, exchangeRate);

            // Create USD FIFO lot if USD account (to preserve exchange rate for future withdrawals)
            if (account.currency === 'USD' && window.FIFOManager) {
                try {
                    // Create lot manually (since createCurrencyLot only works with TRANSFER type)
                    const lots = FIFOManager.getAllLots() || [];
                    const lot = {
                        id: Utils.generateId(),
                        portfolioId: account.portfolioId,
                        assetId: 'USD_CURRENCY',
                        accountId: accountId,
                        transactionId: txn?.id || null,
                        purchaseDate: Utils.formatDate(date || new Date()),
                        quantity: amount,
                        remainingQuantity: amount,
                        pricePerUnit: exchangeRate,
                        currency: 'USD',
                        exchangeRate: exchangeRate,
                        costBasisTHB: amount * exchangeRate,
                        status: 'OPEN',
                        createdAt: new Date().toISOString(),
                        source: 'DEPOSIT',
                        description: description || 'Manual deposit'
                    };
                    lots.push(lot);
                    FIFOManager.saveLots(lots);
                    console.log(`✓ Created USD FIFO lot: ${amount} USD @ ${exchangeRate.toFixed(4)} THB/USD`);
                } catch (error) {
                    console.warn('Failed to create USD FIFO lot:', error.message);
                }
            }

            Utils.showNotification(`Deposited ${Utils.formatCurrency(amount, account.currency)} successfully`, 'success');
        }

        return success;
    },

    /**
     * Withdraw money from account
     * @param {string} accountId - Account ID
     * @param {number} amount - Amount to withdraw
     * @param {string} description - Transaction description
     * @param {string} date - Transaction date
     * @returns {boolean} Success status
     */
    withdraw(accountId, amount, description = 'Withdrawal', date = null) {
        const account = this.getAccount(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        if (amount <= 0) {
            throw new Error('Withdrawal amount must be greater than 0');
        }

        if (amount > account.balance) {
            throw new Error(`Insufficient balance. Available: ${Utils.formatCurrency(account.balance, account.currency)}`);
        }

        let exchangeRate = 1;  // Default for THB
        let usdLotsUsed = null;

        // For USD accounts, consume USD FIFO lots to get historical exchange rate
        if (account.currency === 'USD' && window.FIFOManager) {
            try {
                // Consume USD lots using FIFO method
                const usdConsumption = FIFOManager.consumeUSDLots(
                    account.portfolioId,
                    'USD',
                    amount
                );

                // Use weighted average exchange rate from consumed lots
                exchangeRate = usdConsumption.weightedExchangeRate;
                usdLotsUsed = usdConsumption.lotsUsed;

                console.log(`✓ WITHDRAW consumed ${amount} USD from ${usdConsumption.lotsUsed.length} lot(s)`);
                console.log(`✓ Historical weighted exchange rate: ${exchangeRate.toFixed(4)} THB/USD`);
            } catch (error) {
                console.warn('USD FIFO consumption failed:', error.message);
                // Fallback to current exchange rate if FIFO fails
                exchangeRate = window.getExchangeRate ? window.getExchangeRate() : 1;
            }
        }

        const newBalance = account.balance - amount;
        const success = this.updateAccount(accountId, { balance: newBalance });

        if (success) {
            this.recordTransaction(accountId, 'WITHDRAW', amount, description, date, exchangeRate, usdLotsUsed);
            Utils.showNotification(`Withdrawn ${Utils.formatCurrency(amount, account.currency)} successfully`, 'success');
        }

        return success;
    },

    /**
     * Transfer money between accounts
     * @param {string} fromAccountId - Source account ID
     * @param {string} toAccountId - Destination account ID
     * @param {number} amount - Amount to transfer
     * @param {number} exchangeRate - Exchange rate (if different currencies)
     * @param {string} description - Transaction description
     * @returns {boolean} Success status
     */
    transfer(fromAccountId, toAccountId, amount, exchangeRate = 1, description = 'Transfer') {
        const fromAccount = this.getAccount(fromAccountId);
        const toAccount = this.getAccount(toAccountId);

        if (!fromAccount || !toAccount) {
            throw new Error('One or both accounts not found');
        }

        if (amount <= 0) {
            throw new Error('Transfer amount must be greater than 0');
        }

        if (amount > fromAccount.balance) {
            throw new Error(`Insufficient balance in source account. Available: ${Utils.formatCurrency(fromAccount.balance, fromAccount.currency)}`);
        }

        // Calculate amounts
        const fromAmount = amount;
        const toAmount = amount * exchangeRate;

        // Update balances
        const success1 = this.updateAccount(fromAccountId, { 
            balance: fromAccount.balance - fromAmount 
        });
        const success2 = this.updateAccount(toAccountId, { 
            balance: toAccount.balance + toAmount 
        });

        if (success1 && success2) {
            // Record transactions
            this.recordTransaction(fromAccountId, 'TRANSFER_OUT', fromAmount, 
                `Transfer to ${toAccount.name}`, new Date().toISOString());
            this.recordTransaction(toAccountId, 'TRANSFER_IN', toAmount, 
                `Transfer from ${fromAccount.name}`, new Date().toISOString());

            Utils.showNotification(
                `Transferred ${Utils.formatCurrency(fromAmount, fromAccount.currency)} successfully`, 
                'success'
            );
            return true;
        }

        return false;
    },

    /**
     * Calculate interest for account based on balance and tiers
     * @param {string} accountId - Account ID
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {object} Interest calculation details
     */
    calculateInterest(accountId, startDate, endDate) {
        const account = this.getAccount(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (days <= 0) {
            throw new Error('End date must be after start date');
        }

        // Simplified calculation: use current balance and apply tiered rates
        // In production, this would analyze transaction history for exact calculations
        let totalInterest = 0;
        let remainingBalance = account.balance;

        for (const tier of account.interestTiers) {
            if (remainingBalance <= 0) break;

            const tierMax = tier.max || Infinity;
            const tierAmount = Math.min(remainingBalance, tierMax - tier.min);
            
            if (tierAmount > 0) {
                const tierInterest = (tierAmount * (tier.rate / 100) * days) / 365;
                totalInterest += tierInterest;
                remainingBalance -= tierAmount;
            }
        }

        return {
            accountId: accountId,
            startDate: startDate,
            endDate: endDate,
            days: days,
            balance: account.balance,
            estimatedInterest: parseFloat(totalInterest.toFixed(2)),
            currency: account.currency
        };
    },

    /**
     * Record interest payment
     * @param {string} accountId - Account ID
     * @param {number} amount - Interest amount
     * @param {string} date - Payment date
     * @returns {boolean} Success status
     */
    recordInterestPayment(accountId, amount, date) {
        const account = this.getAccount(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        if (amount < 0) {
            throw new Error('Interest amount cannot be negative');
        }

        const newBalance = account.balance + amount;
        const success = this.updateAccount(accountId, { 
            balance: newBalance,
            lastInterestPayment: date || new Date().toISOString()
        });

        if (success) {
            this.recordTransaction(accountId, 'INTEREST_CREDIT', amount, 
                'Interest payment', date);
            Utils.showNotification(
                `Interest of ${Utils.formatCurrency(amount, account.currency)} recorded successfully`, 
                'success'
            );
        }

        return success;
    },

    /**
     * Get estimated interest for next period
     * @param {string} accountId - Account ID
     * @param {number} days - Number of days
     * @returns {number} Estimated interest amount
     */
    getEstimatedInterest(accountId, days = 180) {
        const account = this.getAccount(accountId);
        if (!account) return 0;

        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        const calculation = this.calculateInterest(accountId, startDate, endDate);
        return calculation.estimatedInterest;
    },

    /**
     * Get current interest rate for account balance
     * @param {string} accountId - Account ID
     * @returns {number} Current applicable interest rate
     */
    getCurrentInterestRate(accountId) {
        const account = this.getAccount(accountId);
        if (!account) return 0;

        // Find which tier the current balance falls into
        for (const tier of account.interestTiers) {
            const tierMax = tier.max || Infinity;
            if (account.balance >= tier.min && account.balance <= tierMax) {
                return tier.rate;
            }
        }

        return 0;
    },

    /**
     * Record transaction in storage
     * @param {string} accountId - Account ID
     * @param {string} type - Transaction type
     * @param {number} amount - Transaction amount
     * @param {string} description - Description
     * @param {string} date - Transaction date
     * @param {number} exchangeRate - Exchange rate (default 1)
     * @param {array} usdLotsUsed - USD FIFO lots consumed (optional)
     */
    recordTransaction(accountId, type, amount, description, date, exchangeRate = 1, usdLotsUsed = null) {
        const account = this.getAccount(accountId);
        if (!account) return false;

        const transaction = {
            id: Utils.generateId(),
            accountId: accountId,
            portfolioId: account.portfolioId,
            type: type,
            amount: amount,
            totalAmount: amount,
            currency: account.currency,
            description: description,
            notes: description, // Map description to notes for consistency
            date: date || new Date().toISOString(),
            balanceAfter: account.balance,
            // Add fields expected by edit modal for account-based transactions
            assetId: null,
            assetName: '',
            assetTicker: '',
            quantity: 0,
            pricePerUnit: 0,
            fee: 0,
            exchangeRate: exchangeRate,  // Use provided rate instead of hardcoded 1
            usdLotsUsed: usdLotsUsed     // Track which lots were consumed
        };

        StorageManager.addTransaction(transaction);
        return true;
    },

    /**
     * Get account transaction history
     * @param {string} accountId - Account ID
     * @returns {array} Array of transactions
     */
    getAccountHistory(accountId) {
        const transactions = StorageManager.getTransactions();
        return transactions
            .filter(t => t.accountId === accountId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /**
     * Calculate account balance as of a specific date
     * @param {string} accountId - Account ID
     * @param {string} asOfDate - Date to calculate balance for (YYYY-MM-DD)
     * @returns {number} Balance as of date
     */
    calculateBalanceAsOfDate(accountId, asOfDate) {
        const account = this.getAccount(accountId);
        if (!account) return 0;
        
        // Get all transactions for this account
        const transactions = TransactionManager.getTransactions({ accountId: accountId });
        
        // Also get transactions where this account is the destination
        const allTransactions = StorageManager.getTransactions();
        const destTransactions = allTransactions.filter(t => t.destinationAccountId === accountId);
        
        // Combine and deduplicate
        const combinedTxns = [...transactions];
        destTransactions.forEach(dt => {
            if (!combinedTxns.find(t => t.id === dt.id)) {
                combinedTxns.push(dt);
            }
        });
        
        // Filter by as of date
        const filteredTxns = Utils.filterTransactionsByAsOfDate(combinedTxns, asOfDate);
        
        // Calculate balance from transactions
        let balance = 0;
        filteredTxns.forEach(txn => {
            // For DEPOSIT, TRANSFER_IN, INTEREST_CREDIT, INTEREST: add to balance
            if (txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN' || 
                txn.type === 'INTEREST_CREDIT' || txn.type === 'INTEREST') {
                balance += txn.totalAmount || txn.amount || 0;
            }
            // For WITHDRAW, TRANSFER_OUT: subtract from balance
            else if (txn.type === 'WITHDRAW' || txn.type === 'TRANSFER_OUT') {
                balance -= txn.totalAmount || txn.amount || 0;
            }
            // For BUY: subtract cost from balance
            else if (txn.type === 'BUY' && txn.accountId === accountId) {
                balance -= (txn.totalAmount + (txn.fee || 0));
            }
            // For SELL: add proceeds to balance
            else if (txn.type === 'SELL' && txn.accountId === accountId) {
                balance += (txn.totalAmount - (txn.fee || 0));
            }
            // For DIVIDEND: add to balance
            else if (txn.type === 'DIVIDEND' && txn.accountId === accountId) {
                balance += txn.totalAmount;
            }
            // For TRANSFER: handle specially
            else if (txn.type === 'TRANSFER' && txn.accountId === accountId) {
                // This is source account - subtract amount and fee
                balance -= (txn.totalAmount + (txn.fee || 0));
            } else if (txn.type === 'TRANSFER' && txn.destinationAccountId === accountId) {
                // This is destination account - add destination amount
                const addAmount = txn.destinationAmount || txn.totalAmount;
                balance += addAmount;
            }
        });
        
        return balance;
    },

    /**
     * Validate account operation
     * @param {string} accountId - Account ID
     * @param {string} operation - Operation type
     * @param {number} amount - Amount
     * @returns {object} Validation result
     */
    validateAccountOperation(accountId, operation, amount) {
        const account = this.getAccount(accountId);
        
        if (!account) {
            return { isValid: false, error: 'Account not found' };
        }

        if (amount <= 0) {
            return { isValid: false, error: 'Amount must be greater than 0' };
        }

        if (operation === 'WITHDRAW' || operation === 'TRANSFER_OUT') {
            if (amount > account.balance) {
                return { 
                    isValid: false, 
                    error: `Insufficient balance. Available: ${Utils.formatCurrency(account.balance, account.currency)}` 
                };
            }
        }

        return { isValid: true };
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    AccountManager.init();
});

// Export for use in other modules
window.AccountManager = AccountManager;

/* ============================================================================
   EDIT ACCOUNT MODAL FUNCTIONS
   ============================================================================ */

/**
 * Show edit account modal
 * @param {string} accountId - Account ID to edit
 */
function showEditAccountModal(accountId) {
    const account = AccountManager.getAccount(accountId);
    if (!account) {
        Utils.showNotification('Account not found', 'error');
        return;
    }

    // Populate form fields
    document.getElementById('editAccountId').value = account.id;
    document.getElementById('editAccountName').value = account.name;
    document.getElementById('editAccountType').value = account.type;
    document.getElementById('editAccountInstitution').value = account.institution || '';
    document.getElementById('editAccountNumber').value = account.accountNumber || '';
    document.getElementById('editAccountNotes').value = account.notes || '';

    // Load portfolios
    const portfolios = StorageManager.getPortfolios();
    const portfolioSelect = document.getElementById('editAccountPortfolio');
    portfolioSelect.innerHTML = '<option value="">Select Portfolio</option>';
    
    portfolios.forEach(portfolio => {
        const option = document.createElement('option');
        option.value = portfolio.id;
        option.textContent = portfolio.name;
        if (portfolio.id === account.portfolioId) {
            option.selected = true;
        }
        portfolioSelect.appendChild(option);
    });

    // Load asset options
    loadEditAccountAssetOptions();

    // Set linked asset if exists
    if (account.linkedAssetId) {
        document.getElementById('editAccountLinkedAsset').value = account.linkedAssetId;
    }

    // Show modal
    document.getElementById('editAccountModal').classList.remove('hidden');
}

/**
 * Close edit account modal
 */
function closeEditAccountModal() {
    document.getElementById('editAccountModal').classList.add('hidden');
    document.getElementById('editAccountForm').reset();
}

/**
 * Load asset options for edit account modal based on portfolio and account type
 */
function loadEditAccountAssetOptions() {
    const portfolioId = document.getElementById('editAccountPortfolio').value;
    const accountType = document.getElementById('editAccountType').value;
    const assetSelect = document.getElementById('editAccountLinkedAsset');
    
    // Clear existing options
    assetSelect.innerHTML = '<option value="">No Link (Standalone Account)</option>';
    
    if (!portfolioId || !accountType) return;
    
    // Get portfolio assets
    const portfolio = PortfolioManager.getPortfolio(portfolioId);
    if (!portfolio || !portfolio.assets) return;
    
    // Filter assets by matching type AND currency
    const matchingAssets = portfolio.assets.filter(asset => {
        // Must match account type exactly
        if (asset.type !== accountType) {
            return false;
        }
        
        // Additionally verify currency matches (fcd_account = USD, thb_savings = THB)
        if (accountType === 'fcd_account') {
            return asset.currency === 'USD';
        } else if (accountType === 'thb_savings') {
            return asset.currency === 'THB';
        }
        
        return true;
    });
    
    // Add matching assets to dropdown
    matchingAssets.forEach(asset => {
        const option = document.createElement('option');
        option.value = asset.id;
        option.setAttribute('data-name', asset.name);
        option.setAttribute('data-type', asset.type);
        // Match the create modal format: show name and allocation percentage
        option.textContent = `${asset.name} (${asset.allocation || asset.targetAllocation || 0}% allocation)`;
        assetSelect.appendChild(option);
    });
}

/**
 * Update currency display when account type changes in edit modal
 */
function updateEditAccountCurrency() {
    const accountType = document.getElementById('editAccountType').value;
    // Note: Balance is not editable in edit modal, managed through transactions
    
    // Reload asset options when type changes
    loadEditAccountAssetOptions();
}

/**
 * Handle edit account form submission
 */
document.addEventListener('DOMContentLoaded', () => {
    const editAccountForm = document.getElementById('editAccountForm');
    if (editAccountForm) {
        editAccountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            try {
                const accountId = document.getElementById('editAccountId').value;
                const portfolioId = document.getElementById('editAccountPortfolio').value;
                const accountType = document.getElementById('editAccountType').value;
                const name = document.getElementById('editAccountName').value.trim();
                const institution = document.getElementById('editAccountInstitution').value.trim();
                const accountNumber = document.getElementById('editAccountNumber').value.trim();
                const notes = document.getElementById('editAccountNotes').value.trim();
                const linkedAssetId = document.getElementById('editAccountLinkedAsset').value;
                
                // Validate
                if (!name) {
                    Utils.showNotification('Please enter an account name', 'error');
                    return;
                }
                
                if (!portfolioId) {
                    Utils.showNotification('Please select a portfolio', 'error');
                    return;
                }
                
                if (!accountType) {
                    Utils.showNotification('Please select an account type', 'error');
                    return;
                }
                
                // Validate portfolio exists
                const portfolios = StorageManager.getPortfolios();
                const portfolioExists = portfolios.some(p => p.id === portfolioId);
                if (!portfolioExists) {
                    Utils.showNotification('Selected portfolio does not exist. Please select a valid portfolio.', 'error');
                    return;
                }
                
                // Get linked asset details if selected
                let linkedAssetName = null;
                let linkedAssetType = null;
                
                if (linkedAssetId) {
                    const portfolio = PortfolioManager.getPortfolio(portfolioId);
                    const linkedAsset = portfolio?.assets?.find(a => a.id === linkedAssetId);
                    if (linkedAsset) {
                        linkedAssetName = linkedAsset.name;
                        linkedAssetType = linkedAsset.type;
                    }
                }
                
                // Prepare updates
                const updates = {
                    portfolioId: portfolioId,
                    name: name,
                    type: accountType,
                    currency: accountType === 'fcd_account' ? 'USD' : 'THB',
                    institution: institution,
                    accountNumber: accountNumber,
                    notes: notes,
                    linkedAssetId: linkedAssetId || null,
                    linkedAssetName: linkedAssetName,
                    linkedAssetType: linkedAssetType
                };
                
                // Update account
                const success = AccountManager.updateAccount(accountId, updates);
                
                if (success) {
                    closeEditAccountModal();
                    
                    // Reload the accounts page if currently viewing it
                    if (typeof App !== 'undefined' && App.currentPage === 'accounts') {
                        App.loadAccounts();
                    }
                }
            } catch (error) {
                console.error('Error updating account:', error);
                Utils.showNotification(error.message || 'Failed to update account', 'error');
            }
        });
    }
});

// Export functions to global scope
window.showEditAccountModal = showEditAccountModal;
window.closeEditAccountModal = closeEditAccountModal;
window.loadEditAccountAssetOptions = loadEditAccountAssetOptions;
window.updateEditAccountCurrency = updateEditAccountCurrency;
