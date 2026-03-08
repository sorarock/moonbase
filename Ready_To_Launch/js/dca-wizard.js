/* ============================================================================
   DCA WIZARD - Monthly Investment Entry
   Portfolio-aware, template-based transaction wizard for mobile-first UX
   ============================================================================ */

const DCAWizard = {
    // Current state
    currentPortfolioId: null,
    currentMonthKey: null,
    currentStep: null,
    currentExchangeRate: null,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Start wizard with portfolio selection
     */
    start() {
        console.log('Starting DCA Wizard...');
        this.currentMonthKey = this.getMonthKey();
        this.showPortfolioSelection();
    },

    /**
     * Close wizard
     */
    close() {
        const sheet = document.getElementById('dcaWizardSheet');
        if (sheet) {
            sheet.classList.remove('active');
        }
        // Reset state
        this.currentPortfolioId = null;
        this.currentStep = null;
    },

    // ========================================================================
    // PORTFOLIO SELECTION
    // ========================================================================

    /**
     * Show portfolio selection screen
     */
    showPortfolioSelection() {
        const sheet = document.getElementById('dcaWizardSheet');
        const portfolioGrid = document.getElementById('dcaPortfolioGrid');

        // Get all portfolios
        const portfolios = StorageManager.getPortfolios();

        if (portfolios.length === 0) {
            portfolioGrid.innerHTML = '<p class="text-muted">No portfolios found. Create a portfolio first.</p>';
            sheet.classList.add('active');
            this.showStep('portfolioSelection');
            return;
        }

        // Render portfolio cards
        portfolioGrid.innerHTML = portfolios.map(portfolio => {
            const progress = this.getProgress(portfolio.id);
            const lastDCA = progress.startDate ? Utils.formatDate(progress.startDate) : 'Never';

            return `
                <div class="portfolio-card" onclick="DCAWizard.selectPortfolio('${portfolio.id}')">
                    <div class="portfolio-card-icon">${portfolio.name.charAt(0)}</div>
                    <div class="portfolio-card-name">${portfolio.name}</div>
                    <div class="portfolio-card-date">Last DCA: ${lastDCA}</div>
                </div>
            `;
        }).join('');

        sheet.classList.add('active');
        this.showStep('portfolioSelection');
    },

    /**
     * Select portfolio and show step progress
     */
    selectPortfolio(portfolioId) {
        console.log('Selected portfolio:', portfolioId);
        this.currentPortfolioId = portfolioId;

        const portfolio = StorageManager.getPortfolios().find(p => p.id === portfolioId);
        document.getElementById('dcaPortfolioName').textContent = portfolio.name;

        const progress = this.getProgress(portfolioId);
        this.showStepProgress(progress);
    },

    // ========================================================================
    // STEP PROGRESS SCREEN
    // ========================================================================

    /**
     * Show step progress with completion status
     */
    showStepProgress(progress) {
        const container = document.getElementById('dcaStepProgress');

        // Step 1: Deposit
        const step1 = this.renderStepItem(1, 'Deposit THB', progress.steps.deposit,
            progress.steps.deposit.recommendedAmount ? `฿${progress.steps.deposit.recommendedAmount.toLocaleString()}` : null);

        // Step 2: Transfer (optional)
        const step2 = this.renderStepItem(2, 'Transfer to FCD', progress.steps.transfer,
            progress.steps.transfer.recommendedAmount ? `฿${progress.steps.transfer.recommendedAmount.toLocaleString()}` : null,
            'transfer');

        // Step 3: Buy Investments
        const purchasedCount = progress.steps.buy.purchased ? progress.steps.buy.purchased.filter(p => p.completed).length : 0;
        const totalAssets = progress.steps.buy.assets ? progress.steps.buy.assets.length : 0;
        const step3 = this.renderStepItem(3, 'Buy Investments', progress.steps.buy,
            `${purchasedCount}/${totalAssets} assets purchased`,
            'buy');

        container.innerHTML = step1 + step2 + step3;

        this.showStep('stepProgress');
    },

    /**
     * Render individual step item
     */
    renderStepItem(num, title, stepData, subtitle, stepName) {
        const isCompleted = stepData.completed;

        let statusIcon = '○';
        let statusClass = 'pending';
        if (isCompleted) {
            statusIcon = '✓';
            statusClass = 'completed';
        } else {
            statusIcon = '▶';
            statusClass = 'current';
        }

        const details = isCompleted && stepData.amount
            ? `<div class="step-details">฿${stepData.amount.toLocaleString()} on ${Utils.formatDate(stepData.date)}</div>`
            : subtitle
            ? `<div class="step-details">${subtitle}</div>`
            : '';

        // Make entire card clickable
        const clickHandler = `onclick="DCAWizard.startStep('${stepName || num}')"`;

        return `
            <div class="step-item ${statusClass} step-item-clickable" ${clickHandler}>
                <div class="step-icon">${statusIcon}</div>
                <div class="step-content">
                    <div class="step-title">${num}. ${title}</div>
                    ${details}
                </div>
                <div class="step-action">
                    <div class="step-arrow">→</div>
                </div>
            </div>
        `;
    },

    /**
     * Check if step can be started (always true now - no dependencies)
     */
    canStartStep(stepNum) {
        return true; // All steps always accessible
    },

    /**
     * Start a step
     */
    startStep(stepName) {
        console.log('Starting step:', stepName);
        this.currentStep = stepName;

        if (stepName === 1 || stepName === 'deposit') {
            this.showDepositForm();
        } else if (stepName === 2 || stepName === 'transfer') {
            this.showTransferForm();
        } else if (stepName === 3 || stepName === 'buy') {
            this.showBuyGrid();
        }
    },

    /**
     * View completed step (for edit)
     */
    viewStep(stepName) {
        // For now, just show the form again
        this.startStep(stepName);
    },

    // ========================================================================
    // DEPOSIT FORM
    // ========================================================================

    /**
     * Show deposit form
     */
    showDepositForm() {
        const accounts = StorageManager.getAccounts().filter(a => a.portfolioId === this.currentPortfolioId);
        const progress = this.getProgress(this.currentPortfolioId);

        // Pre-fill account and amount
        const recommendedAccount = accounts.find(a => a.currency === 'THB' && a.type === 'Savings');
        const recommendedAmount = progress.steps.deposit.recommendedAmount || 5000;

        // Populate account dropdown
        const accountSelect = document.getElementById('dcaDepositAccount');
        accountSelect.innerHTML = accounts.map(acc =>
            `<option value="${acc.id}" ${acc.id === recommendedAccount?.id ? 'selected' : ''}>
                ${acc.name} (${acc.currency})
            </option>`
        ).join('');

        // Set amount
        document.getElementById('dcaDepositAmount').value = recommendedAmount;

        // Set date to today
        document.getElementById('dcaDepositDate').value = Utils.formatDateForInput(new Date());

        // Update currency label based on selected account
        this.updateDepositCurrency();

        this.showStep('depositForm');
    },

    /**
     * Update currency label based on selected account
     */
    updateDepositCurrency() {
        const accountId = document.getElementById('dcaDepositAccount').value;
        const accounts = StorageManager.getAccounts();
        const account = accounts.find(a => a.id === accountId);

        if (account) {
            document.getElementById('dcaDepositCurrency').textContent = account.currency;
        }
    },

    /**
     * Adjust deposit amount
     */
    adjustDepositAmount(delta) {
        const input = document.getElementById('dcaDepositAmount');
        const currentValue = parseFloat(input.value) || 0;
        input.value = Math.max(0, currentValue + delta);
    },

    /**
     * Record deposit transaction
     */
    async recordDeposit() {
        const accountId = document.getElementById('dcaDepositAccount').value;
        const amount = parseFloat(document.getElementById('dcaDepositAmount').value);
        const date = document.getElementById('dcaDepositDate').value;

        if (!accountId || !amount || amount <= 0) {
            Utils.showNotification('Please enter a valid amount', 'error');
            return;
        }

        const account = StorageManager.getAccounts().find(a => a.id === accountId);

        // Create transaction
        const transaction = {
            portfolioId: this.currentPortfolioId,
            type: 'DEPOSIT',
            accountId: accountId,
            totalAmount: amount,
            currency: account.currency,
            date: date,
            fee: 0,
            notes: 'Monthly DCA deposit'
        };

        try {
            // Record using existing transaction system
            await TransactionManager.recordTransaction(transaction);

            // Get transaction ID
            const transactions = StorageManager.getTransactions();
            const recordedTx = transactions[transactions.length - 1];

            // Update progress
            this.completeStep('deposit', recordedTx.id, {
                amount: amount,
                date: date,
                accountId: accountId
            });

            Utils.showNotification('Deposit recorded successfully!', 'success');

            // Return to progress screen
            const progress = this.getProgress(this.currentPortfolioId);
            this.showStepProgress(progress);

        } catch (error) {
            console.error('Failed to record deposit:', error);
            Utils.showNotification('Failed to record deposit', 'error');
        }
    },

    // ========================================================================
    // TRANSFER FORM
    // ========================================================================

    /**
     * Show transfer form
     */
    showTransferForm() {
        const accounts = StorageManager.getAccounts().filter(a => a.portfolioId === this.currentPortfolioId);
        const progress = this.getProgress(this.currentPortfolioId);

        // Find THB and FCD accounts
        const thbAccount = accounts.find(a => a.currency === 'THB' && a.type === 'Savings');
        const fcdAccount = accounts.find(a => a.currency === 'USD' && a.type === 'FCD_Account');

        if (!thbAccount || !fcdAccount) {
            Utils.showNotification('Missing THB Savings or FCD account', 'error');
            return;
        }

        // Update UI
        document.getElementById('dcaTransferFrom').textContent = thbAccount.name;
        document.getElementById('dcaTransferFromBalance').textContent = `฿${thbAccount.balance.toLocaleString()}`;
        document.getElementById('dcaTransferTo').textContent = `${fcdAccount.name} (USD)`;

        // Store account IDs
        document.getElementById('dcaTransferAmount').dataset.fromAccountId = thbAccount.id;
        document.getElementById('dcaTransferAmount').dataset.toAccountId = fcdAccount.id;

        // Pre-fill amount and exchange rate
        const recommendedAmount = progress.steps.transfer.recommendedAmount || 5000;
        document.getElementById('dcaTransferAmount').value = recommendedAmount;

        // Get last exchange rate or default
        const lastRate = this.currentExchangeRate || StorageManager.getExchangeRate().rate || 33.33;
        document.getElementById('dcaTransferRate').value = lastRate;

        // Set date
        document.getElementById('dcaTransferDate').value = Utils.formatDateForInput(new Date());

        // Calculate initial USD amount
        this.updateTransferCalculation();

        this.showStep('transferForm');
    },

    /**
     * Update transfer calculation
     */
    updateTransferCalculation() {
        const thbAmount = parseFloat(document.getElementById('dcaTransferAmount').value) || 0;
        const rate = parseFloat(document.getElementById('dcaTransferRate').value) || 1;

        const usdAmount = thbAmount / rate;
        document.getElementById('dcaTransferUsdAmount').textContent = `$${usdAmount.toFixed(2)} USD`;

        // Store for use in buy step
        this.currentExchangeRate = rate;
    },

    /**
     * Use all balance
     */
    useAllBalance() {
        const fromAccountId = document.getElementById('dcaTransferAmount').dataset.fromAccountId;
        const account = StorageManager.getAccounts().find(a => a.id === fromAccountId);

        if (account) {
            document.getElementById('dcaTransferAmount').value = account.balance;
            this.updateTransferCalculation();
        }
    },

    /**
     * Fetch current exchange rate (placeholder - can integrate with API)
     */
    async fetchExchangeRate() {
        // For now, use stored rate
        const rateData = StorageManager.getExchangeRate();
        if (rateData && rateData.rate) {
            document.getElementById('dcaTransferRate').value = rateData.rate;
            this.updateTransferCalculation();
            Utils.showNotification('Using stored exchange rate', 'info');
        }
    },

    /**
     * Record transfer transaction
     */
    async recordTransfer() {
        const thbAmount = parseFloat(document.getElementById('dcaTransferAmount').value);
        const rate = parseFloat(document.getElementById('dcaTransferRate').value);
        const date = document.getElementById('dcaTransferDate').value;
        const fromAccountId = document.getElementById('dcaTransferAmount').dataset.fromAccountId;
        const toAccountId = document.getElementById('dcaTransferAmount').dataset.toAccountId;

        if (!thbAmount || thbAmount <= 0 || !rate || rate <= 0) {
            Utils.showNotification('Please enter valid amount and exchange rate', 'error');
            return;
        }

        const usdAmount = thbAmount / rate;

        // Create transfer transaction
        const transaction = {
            portfolioId: this.currentPortfolioId,
            type: 'TRANSFER',
            fromAccountId: fromAccountId,
            toAccountId: toAccountId,
            totalAmount: thbAmount,
            exchangeRate: rate,
            date: date,
            fee: 0,
            notes: 'Transfer for DCA investments'
        };

        try {
            // Record using existing transaction system
            await TransactionManager.recordTransaction(transaction);

            // Get transaction ID
            const transactions = StorageManager.getTransactions();
            const recordedTx = transactions[transactions.length - 1];

            // Update progress
            this.completeStep('transfer', recordedTx.id, {
                amount: thbAmount,
                usdAmount: usdAmount,
                exchangeRate: rate,
                date: date
            });

            // Store exchange rate for buy step
            this.currentExchangeRate = rate;

            Utils.showNotification('Transfer recorded successfully!', 'success');

            // Return to progress screen
            const progress = this.getProgress(this.currentPortfolioId);
            this.showStepProgress(progress);

        } catch (error) {
            console.error('Failed to record transfer:', error);
            Utils.showNotification('Failed to record transfer', 'error');
        }
    },

    // ========================================================================
    // BUY GRID & FORM
    // ========================================================================

    /**
     * Show buy investments grid
     */
    showBuyGrid() {
        const portfolio = StorageManager.getPortfolios().find(p => p.id === this.currentPortfolioId);
        const accounts = StorageManager.getAccounts().filter(a => a.portfolioId === this.currentPortfolioId);
        const templates = this.getTemplates(this.currentPortfolioId);
        const progress = this.getProgress(this.currentPortfolioId);

        // Get account balances
        const fcdAccount = accounts.find(a => a.currency === 'USD' && a.type === 'FCD_Account');
        const thbAccount = accounts.find(a => a.currency === 'THB' && a.type === 'Savings');

        // Update balance display
        let balanceText = '';
        if (fcdAccount) balanceText += `• FCD: $${fcdAccount.balance.toFixed(2)} USD\n`;
        if (thbAccount) balanceText += `• THB Savings: ฿${thbAccount.balance.toLocaleString()} THB`;
        document.getElementById('dcaBuyBalances').textContent = balanceText;

        // Group assets by currency
        const usdAssets = [];
        const thbAssets = [];

        if (portfolio.assets) {
            portfolio.assets.forEach(asset => {
                const template = templates[asset.id] || {}; // Use empty object if no template exists
                const assetData = { ...asset, template };
                if (asset.currency === 'USD') {
                    usdAssets.push(assetData);
                } else if (asset.currency === 'THB') {
                    thbAssets.push(assetData);
                }
            });
        }

        // Render USD assets
        const usdGrid = document.getElementById('dcaBuyUsdGrid');
        usdGrid.innerHTML = usdAssets.map(asset => this.renderAssetCard(asset, 'USD')).join('');

        // Render THB assets
        const thbGrid = document.getElementById('dcaBuyThbGrid');
        thbGrid.innerHTML = thbAssets.map(asset => this.renderAssetCard(asset, 'THB')).join('');

        // Update purchase count
        const purchased = progress.steps.buy.purchased || [];
        const purchasedCount = purchased.filter(p => p.completed).length;
        const totalCount = usdAssets.length + thbAssets.length;
        document.getElementById('dcaBuyPurchasedCount').textContent = `Purchased: ${purchasedCount}/${totalCount} assets`;

        this.showStep('buyGrid');
    },

    /**
     * Render asset card
     */
    renderAssetCard(asset, currency) {
        const template = asset.template || {}; // Handle missing template
        const amount = template.lastAmount || 0;
        const lastDate = template.lastDate ? Utils.formatDate(template.lastDate) : 'Never';
        const currencySymbol = currency === 'USD' ? '$' : '฿';

        return `
            <div class="asset-card" onclick="DCAWizard.showBuyForm('${asset.id}')">
                <div class="asset-card-symbol">${asset.symbol}</div>
                <div class="asset-card-amount">${currencySymbol}${amount.toFixed(2)}</div>
                <div class="asset-card-date">Last: ${lastDate}</div>
            </div>
        `;
    },

    /**
     * Show buy form for specific asset
     */
    showBuyForm(assetId) {
        console.log('Showing buy form for asset:', assetId);

        const portfolio = StorageManager.getPortfolios().find(p => p.id === this.currentPortfolioId);
        const asset = portfolio.assets.find(a => a.id === assetId);
        const template = this.getTemplate(this.currentPortfolioId, assetId);
        const account = this.getAccountForAsset(asset);

        if (!asset || !account) {
            Utils.showNotification('Asset or account not found', 'error');
            return;
        }

        // Update UI
        document.getElementById('dcaBuyAssetName').textContent = asset.symbol;
        document.getElementById('dcaBuyAssetCurrency').textContent = asset.currency;
        document.getElementById('dcaBuyFromAccount').textContent = `${account.name} (${account.currency === 'USD' ? '$' + account.balance.toFixed(2) : '฿' + account.balance.toLocaleString()})`;

        // Update button text
        const buyBtn = document.getElementById('dcaBuyAssetNameBtn');
        if (buyBtn) {
            buyBtn.textContent = asset.symbol;
        }

        // Pre-fill from template
        document.getElementById('dcaBuyQuantity').value = template.lastQuantity || '';
        document.getElementById('dcaBuyPrice').value = template.lastPrice || '';

        // Store asset and account data
        document.getElementById('dcaBuyQuantity').dataset.assetId = assetId;
        document.getElementById('dcaBuyQuantity').dataset.accountId = account.id;

        // Set date
        document.getElementById('dcaBuyDate').value = Utils.formatDateForInput(new Date());

        // Show/hide exchange rate
        if (asset.currency === 'USD') {
            document.getElementById('dcaBuyExchangeRateGroup').style.display = 'block';
            const rate = this.currentExchangeRate || StorageManager.getExchangeRate().rate || 33.33;
            document.getElementById('dcaBuyExchangeRate').textContent = rate.toFixed(2);
        } else {
            document.getElementById('dcaBuyExchangeRateGroup').style.display = 'none';
        }

        // Calculate total
        this.updateBuyTotal();

        this.showStep('buyForm');
    },

    /**
     * Get account for asset based on currency
     */
    getAccountForAsset(asset) {
        const accounts = StorageManager.getAccounts().filter(a => a.portfolioId === this.currentPortfolioId);

        if (asset.currency === 'USD') {
            return accounts.find(a => a.currency === 'USD' && a.type === 'FCD_Account');
        } else if (asset.currency === 'THB') {
            return accounts.find(a => a.currency === 'THB' && a.type === 'Savings');
        }

        return null;
    },

    /**
     * Adjust buy quantity
     */
    adjustBuyQuantity(delta) {
        const input = document.getElementById('dcaBuyQuantity');
        const currentValue = parseFloat(input.value) || 0;
        input.value = Math.max(0, currentValue + delta).toFixed(8);
        this.updateBuyTotal();
    },

    /**
     * Update buy total calculation
     */
    updateBuyTotal() {
        const quantity = parseFloat(document.getElementById('dcaBuyQuantity').value) || 0;
        const price = parseFloat(document.getElementById('dcaBuyPrice').value) || 0;
        const assetId = document.getElementById('dcaBuyQuantity').dataset.assetId;

        const portfolio = StorageManager.getPortfolios().find(p => p.id === this.currentPortfolioId);
        const asset = portfolio.assets.find(a => a.id === assetId);

        const totalAmount = quantity * price;

        if (asset.currency === 'USD') {
            const rate = this.currentExchangeRate || StorageManager.getExchangeRate().rate || 33.33;
            const thbAmount = totalAmount * rate;
            document.getElementById('dcaBuyTotal').textContent = `$${totalAmount.toFixed(2)} USD (฿${thbAmount.toFixed(2)} THB)`;
        } else {
            document.getElementById('dcaBuyTotal').textContent = `฿${totalAmount.toFixed(2)} THB`;
        }
    },

    /**
     * Record buy transaction
     */
    async recordBuy() {
        const quantity = parseFloat(document.getElementById('dcaBuyQuantity').value);
        const price = parseFloat(document.getElementById('dcaBuyPrice').value);
        const date = document.getElementById('dcaBuyDate').value;
        const assetId = document.getElementById('dcaBuyQuantity').dataset.assetId;
        const accountId = document.getElementById('dcaBuyQuantity').dataset.accountId;

        if (!quantity || quantity <= 0 || !price || price <= 0) {
            Utils.showNotification('Please enter valid quantity and price', 'error');
            return;
        }

        const portfolio = StorageManager.getPortfolios().find(p => p.id === this.currentPortfolioId);
        const asset = portfolio.assets.find(a => a.id === assetId);
        const totalAmount = quantity * price;

        // Get exchange rate
        let exchangeRate = 1;
        if (asset.currency === 'USD') {
            exchangeRate = this.currentExchangeRate || StorageManager.getExchangeRate().rate || 33.33;
        }

        // Create BUY transaction
        const transaction = {
            portfolioId: this.currentPortfolioId,
            type: 'BUY',
            assetId: assetId,
            accountId: accountId,
            quantity: quantity,
            pricePerUnit: price,
            totalAmount: totalAmount,
            currency: asset.currency,
            exchangeRate: exchangeRate,
            date: date,
            fee: 0,
            notes: `DCA purchase: ${asset.symbol}`
        };

        try {
            // Record using existing transaction system
            await TransactionManager.recordTransaction(transaction);

            // Get transaction ID
            const transactions = StorageManager.getTransactions();
            const recordedTx = transactions[transactions.length - 1];

            // Update template
            this.updateTemplate(this.currentPortfolioId, assetId, {
                lastAmount: totalAmount,
                lastPrice: price,
                lastQuantity: quantity,
                lastDate: date,
                accountId: accountId
            });

            // Update progress
            this.addPurchaseToProgress(assetId, recordedTx.id, {
                amount: totalAmount,
                quantity: quantity,
                price: price
            });

            Utils.showNotification(`${asset.symbol} purchased successfully!`, 'success');

            // Return to buy grid
            this.showBuyGrid();

        } catch (error) {
            console.error('Failed to record purchase:', error);
            Utils.showNotification('Failed to record purchase', 'error');
        }
    },

    // ========================================================================
    // PROGRESS & TEMPLATE MANAGEMENT
    // ========================================================================

    /**
     * Get progress for portfolio in current month
     */
    getProgress(portfolioId) {
        const allProgress = JSON.parse(
            localStorage.getItem('dcaProgress_' + this.currentMonthKey) || '{}'
        );

        if (!allProgress[portfolioId]) {
            allProgress[portfolioId] = this.initializeProgress(portfolioId);
            localStorage.setItem('dcaProgress_' + this.currentMonthKey, JSON.stringify(allProgress));
        }

        return allProgress[portfolioId];
    },

    /**
     * Initialize progress for new month
     */
    initializeProgress(portfolioId) {
        const routine = this.getRoutine(portfolioId);

        return {
            startDate: new Date().toISOString(),
            steps: {
                deposit: {
                    completed: false,
                    recommendedAmount: routine.typicalDepositAmount || 5000
                },
                transfer: {
                    completed: false,
                    recommendedAmount: routine.typicalTransferAmount || 5000
                },
                buy: {
                    completed: false,
                    purchased: [],
                    assets: routine.targetAssets || []
                }
            }
        };
    },

    /**
     * Complete a step
     */
    completeStep(stepName, transactionId, data) {
        const allProgress = JSON.parse(
            localStorage.getItem('dcaProgress_' + this.currentMonthKey) || '{}'
        );

        const progress = allProgress[this.currentPortfolioId];
        progress.steps[stepName].completed = true;
        progress.steps[stepName].transactionId = transactionId;
        Object.assign(progress.steps[stepName], data);

        localStorage.setItem('dcaProgress_' + this.currentMonthKey, JSON.stringify(allProgress));
    },

    /**
     * Add purchase to progress
     */
    addPurchaseToProgress(assetId, transactionId, data) {
        const allProgress = JSON.parse(
            localStorage.getItem('dcaProgress_' + this.currentMonthKey) || '{}'
        );

        const progress = allProgress[this.currentPortfolioId];

        if (!progress.steps.buy.purchased) {
            progress.steps.buy.purchased = [];
        }

        progress.steps.buy.purchased.push({
            assetId: assetId,
            transactionId: transactionId,
            completed: true,
            ...data
        });

        localStorage.setItem('dcaProgress_' + this.currentMonthKey, JSON.stringify(allProgress));
    },

    /**
     * Get templates for portfolio
     */
    getTemplates(portfolioId) {
        const key = 'dcaTemplates_' + portfolioId;
        return JSON.parse(localStorage.getItem(key) || '{}');
    },

    /**
     * Get template for specific asset
     */
    getTemplate(portfolioId, assetId) {
        const templates = this.getTemplates(portfolioId);
        return templates[assetId] || {};
    },

    /**
     * Update template after transaction
     */
    updateTemplate(portfolioId, assetId, data) {
        const key = 'dcaTemplates_' + portfolioId;
        const templates = JSON.parse(localStorage.getItem(key) || '{}');

        templates[assetId] = {
            ...templates[assetId],
            ...data
        };

        localStorage.setItem(key, JSON.stringify(templates));
    },

    /**
     * Get routine settings
     */
    getRoutine(portfolioId) {
        const key = 'dcaRoutine_' + portfolioId;
        const defaultRoutine = {
            depositAccount: null,
            fcdAccount: null,
            typicalDepositAmount: 5000,
            typicalTransferAmount: 5000,
            targetAssets: []
        };

        return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultRoutine));
    },

    /**
     * Get current month key (YYYY-MM)
     */
    getMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    // ========================================================================
    // UI HELPERS
    // ========================================================================

    /**
     * Show specific wizard step
     */
    showStep(stepId) {
        const steps = ['portfolioSelection', 'stepProgress', 'depositForm', 'transferForm', 'buyGrid', 'buyForm'];

        steps.forEach(step => {
            const el = document.getElementById('dcaStep_' + step);
            if (el) {
                el.style.display = (step === stepId) ? 'block' : 'none';
            }
        });
    },

    /**
     * Go back to previous screen
     */
    goBack() {
        if (this.currentStep === 'buyForm') {
            this.showBuyGrid();
        } else if (['depositForm', 'transferForm', 'buyGrid'].includes(this.currentStep)) {
            const progress = this.getProgress(this.currentPortfolioId);
            this.showStepProgress(progress);
        } else if (this.currentStep === 'stepProgress') {
            this.showPortfolioSelection();
        } else {
            this.close();
        }
    }
};

// Export for global use
window.DCAWizard = DCAWizard;

console.log('✓ DCA Wizard loaded');
