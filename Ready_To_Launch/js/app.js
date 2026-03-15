/* ============================================================================
   APPLICATION CONTROLLER
   Main application initialization and navigation
   ============================================================================ */

const App = {
    currentPage: 'dashboard',
    selectedPortfolios: [], // Empty array = all portfolios selected
    currentAsOfDate: null, // Will be set to today's date on init
    
    /**
     * Initialize application
     */
    init() {
        // Prevent double initialization
        if (sessionStorage.getItem('appInitialized') === 'true') {
            console.log('App already initialized, skipping');
            return;
        }
        sessionStorage.setItem('appInitialized', 'true');

        // Set default as of date to today
        this.currentAsOfDate = new Date().toISOString().split('T')[0];

        // Try to restore from session storage
        const savedDate = sessionStorage.getItem('asOfDate');
        if (savedDate) {
            this.currentAsOfDate = savedDate;
        }

        console.log('Initializing Portfolio Manager Application...');
        console.log('Version: 1.0.0');
        console.log('Phase: 1 - Foundation Complete');

        // Setup navigation immediately - if user can see the app, they're authenticated
        this.setupNavigation();
        console.log('Navigation setup complete');
        
        // Setup global as of date control
        this.setupAsOfDateControl();
        
        // Load initial page
        this.loadDashboard();
    },

    /**
     * Setup global as of date control
     */
    setupAsOfDateControl() {
        const dateInput = document.getElementById('globalAsOfDate');
        if (dateInput) {
            // Set initial value
            dateInput.value = this.currentAsOfDate;
            
            // Listen for changes
            dateInput.addEventListener('change', (e) => {
                this.setAsOfDate(e.target.value);
            });
        }
    },

    /**
     * Set global as of date
     * @param {string} date - Date in YYYY-MM-DD format
     */
    setAsOfDate(date) {
        this.currentAsOfDate = date;
        sessionStorage.setItem('asOfDate', date);
        
        // Update the input if it exists
        const dateInput = document.getElementById('globalAsOfDate');
        if (dateInput) {
            dateInput.value = date;
        }
        
        // Update banner
        this.updateAsOfDateBanner();
        
        // Reload current page to reflect new date
        this.loadPageContent(this.currentPage);
    },

    /**
     * Get current as of date
     * @returns {string} Current as of date
     */
    getAsOfDate() {
        return this.currentAsOfDate;
    },

    /**
     * Reset as of date to today
     */
    resetAsOfDateToToday() {
        const today = new Date().toISOString().split('T')[0];
        this.setAsOfDate(today);
    },

    /**
     * Update as of date banner visibility and content
     */
    updateAsOfDateBanner() {
        const banner = document.getElementById('asOfDateBanner');
        const today = new Date().toISOString().split('T')[0];
        
        if (!banner) return;
        
        if (this.currentAsOfDate !== today) {
            // Show banner with date info
            banner.style.display = 'block';
            
            // Format date for display
            const displayDate = new Date(this.currentAsOfDate + 'T00:00:00');
            const formattedDate = displayDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            document.getElementById('asOfDateDisplay').textContent = formattedDate;
            
            // Count future transactions
            const allTransactions = TransactionManager.getTransactions({});
            const futureCount = Utils.countFutureTransactions(allTransactions, this.currentAsOfDate);
            
            const countSpan = document.getElementById('futureTransactionCount');
            if (futureCount > 0) {
                countSpan.innerHTML = `• <strong>${futureCount}</strong> future transaction${futureCount > 1 ? 's' : ''} excluded`;
            } else {
                countSpan.innerHTML = '';
            }
        } else {
            // Hide banner when viewing today
            banner.style.display = 'none';
        }
    },

    /**
     * Setup navigation
     */
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    },

    /**
     * Navigate to page
     * @param {string} pageName - Page to navigate to
     */
    navigateTo(pageName) {
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageName}Page`)?.classList.add('active');

        this.currentPage = pageName;

        // Load page content
        this.loadPageContent(pageName);
    },

    /**
     * Load page content
     * @param {string} pageName - Page name
     */
    loadPageContent(pageName) {
        switch(pageName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'portfolios':
                this.loadPortfolios();
                break;
            case 'accounts':
                this.loadAccounts();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'planning':
                this.loadPlanning();
                break;
            case 'reports':
                this.loadReports();
                break;
        }

        // Update DCA FAB visibility
        this.updateDCAFabVisibility(pageName);
    },

    /**
     * Update DCA FAB button visibility based on current page
     */
    updateDCAFabVisibility(pageName) {
        const fab = document.getElementById('fabDCA');
        if (!fab) return;

        // Show FAB only on dashboard and transactions pages
        if (pageName === 'dashboard' || pageName === 'transactions') {
            fab.style.display = 'flex';
        } else {
            fab.style.display = 'none';
        }
    },

    /**
     * Render portfolio filter
     * @param {array} portfolios - Array of all portfolios
     */
    renderPortfolioFilter(portfolios) {
        console.log('renderPortfolioFilter called with', portfolios.length, 'portfolios');
        
        const filterDiv = document.getElementById('portfolioFilterOptions');
        const dashboardFilter = document.getElementById('dashboardFilter');
        
        if (!filterDiv || !dashboardFilter) {
            console.error('Filter DOM elements not found!');
            return;
        }
        
        if (portfolios.length === 0) {
            console.log('No portfolios - hiding filter');
            dashboardFilter.style.display = 'none';
            return;
        }
        
        // Show filter only if there are multiple portfolios
        if (portfolios.length === 1) {
            console.log('Only 1 portfolio - hiding filter');
            dashboardFilter.style.display = 'none';
            return;
        }
        
        console.log('Multiple portfolios - showing filter');
        dashboardFilter.style.display = 'block';
        
        // Create "All Portfolios" checkbox
        const allCheckbox = `
            <label class="checkbox-label" style="padding: 6px 12px; background: var(--color-bg-secondary); border-radius: var(--radius-sm); cursor: pointer;">
                <input type="checkbox" id="filterAllPortfolios" 
                    ${this.selectedPortfolios.length === 0 ? 'checked' : ''} 
                    onchange="App.toggleAllPortfolios()" />
                <span style="font-weight: 600;">All Portfolios</span>
            </label>
        `;
        
        // Create individual portfolio checkboxes
        const portfolioCheckboxes = portfolios.map(p => `
            <label class="checkbox-label" style="padding: 6px 12px; background: var(--color-bg-secondary); border-radius: var(--radius-sm); cursor: pointer;">
                <input type="checkbox" class="portfolio-filter-checkbox" 
                    data-portfolio-id="${p.id}" 
                    ${this.selectedPortfolios.length === 0 || this.selectedPortfolios.includes(p.id) ? 'checked' : ''} 
                    onchange="App.togglePortfolioFilter('${p.id}')" />
                <span>${p.name}</span>
            </label>
        `).join('');
        
        filterDiv.innerHTML = allCheckbox + portfolioCheckboxes;
    },

    /**
     * Toggle all portfolios filter
     */
    toggleAllPortfolios() {
        const allCheckbox = document.getElementById('filterAllPortfolios');
        const individualCheckboxes = document.querySelectorAll('.portfolio-filter-checkbox');
        
        if (allCheckbox.checked) {
            // Select all portfolios (empty array = all)
            this.selectedPortfolios = [];
            individualCheckboxes.forEach(cb => cb.checked = true);
        } else {
            // Deselect all
            this.selectedPortfolios = [];
            individualCheckboxes.forEach(cb => cb.checked = false);
        }
        
        // Reload dashboard
        this.loadDashboard();
    },

    /**
     * Toggle individual portfolio filter
     * @param {string} portfolioId - Portfolio ID
     */
    togglePortfolioFilter(portfolioId) {
        const checkbox = document.querySelector(`[data-portfolio-id="${portfolioId}"]`);
        const allCheckbox = document.getElementById('filterAllPortfolios');
        const allCheckboxes = document.querySelectorAll('.portfolio-filter-checkbox');
        
        if (checkbox.checked) {
            // Add to selected if not already there
            if (!this.selectedPortfolios.includes(portfolioId)) {
                // If we're going from "all" (empty array) to selecting specific ones
                if (this.selectedPortfolios.length === 0) {
                    // Get all portfolio IDs
                    const allPortfolios = PortfolioManager.getAllPortfolios();
                    this.selectedPortfolios = allPortfolios.map(p => p.id);
                } else {
                    this.selectedPortfolios.push(portfolioId);
                }
            }
        } else {
            // Remove from selected
            if (this.selectedPortfolios.length === 0) {
                // If "all" was selected, now select all except this one
                const allPortfolios = PortfolioManager.getAllPortfolios();
                this.selectedPortfolios = allPortfolios.filter(p => p.id !== portfolioId).map(p => p.id);
            } else {
                this.selectedPortfolios = this.selectedPortfolios.filter(id => id !== portfolioId);
            }
        }
        
        // Update "All Portfolios" checkbox
        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
        allCheckbox.checked = allChecked;
        
        // If all are checked, reset to empty array (= all)
        if (allChecked) {
            this.selectedPortfolios = [];
        }
        
        // If none are checked, reset to all
        if (this.selectedPortfolios.length === 0 && !allChecked) {
            allCheckbox.checked = true;
        }
        
        // Reload dashboard
        this.loadDashboard();
    },

    /**
     * Get filtered portfolios based on selection
     * @returns {array} Filtered portfolios
     */
    getFilteredPortfolios() {
        const allPortfolios = PortfolioManager.getAllPortfolios();
        
        // Empty array = show all portfolios
        if (this.selectedPortfolios.length === 0) {
            return allPortfolios;
        }
        
        // Filter by selected IDs
        return allPortfolios.filter(p => this.selectedPortfolios.includes(p.id));
    },

    /**
     * Calculate dashboard statistics
     * @returns {object} Dashboard stats
     */
    calculateDashboardStats() {
        const portfolios = this.getFilteredPortfolios();
        const accounts = AccountManager.getAllAccounts();
        const allTransactions = TransactionManager.getTransactions({});
        const asOfDate = this.getAsOfDate();
        
        let totalDeposits = 0;
        let totalCashBalance = 0;
        let totalAssetValue = 0;
        let totalFees = 0;
        
        // Calculate for each portfolio
        portfolios.forEach(portfolio => {
            const stats = TransactionManager.calculatePortfolioStats(portfolio.id);
            totalDeposits += stats.totalDeposits;
            totalFees += stats.totalFees;
            
            // Calculate cash balance as of date with proper USD to THB conversion
            const portfolioAccounts = AccountManager.getAllAccounts()
                .filter(acc => acc.portfolioId === portfolio.id);
            
            portfolioAccounts.forEach(acc => {
                const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(acc.id, asOfDate);
                if (acc.currency === 'USD') {
                    totalCashBalance += convertUSDToTHB(balanceAsOfDate);
                } else {
                    totalCashBalance += balanceAsOfDate;
                }
            });
            
            totalAssetValue += stats.totalBuyAmount; // Asset value from buy transactions
        });
        
        // Add current market value of assets (positions × current prices)
        // Convert USD assets to THB using exchange rate
        let totalMarketValue = 0;
        const exchangeRate = getExchangeRate();
        
        portfolios.forEach(portfolio => {
            const positions = TransactionManager.getPortfolioPositions(portfolio.id);
            positions.forEach(position => {
                const priceData = PriceManager.getCurrentPrice(position.assetId);
                if (priceData) {
                    let assetValue = position.quantity * priceData.price;
                    
                    // Convert USD to THB if needed
                    if (priceData.currency === 'USD') {
                        assetValue = convertUSDToTHB(assetValue);
                    }
                    
                    totalMarketValue += assetValue;
                }
            });
        });
        
        // Total asset value = market value of positions
        const finalAssetValue = totalMarketValue > 0 ? totalMarketValue : totalAssetValue;
        
        // Total portfolio value = cash + assets
        const totalPortfolioValue = totalCashBalance + finalAssetValue;
        
        // Gain/Loss = Total Value - Total Deposits
        const totalGainLoss = totalPortfolioValue - totalDeposits;
        const gainLossPercent = totalDeposits > 0 ? (totalGainLoss / totalDeposits) * 100 : 0;
        
        return {
            totalPortfolioValue,
            totalDeposits,
            totalCashBalance,
            totalAssetValue: finalAssetValue,
            totalGainLoss,
            gainLossPercent,
            totalFees,
            portfolioCount: portfolios.length,
            accountCount: accounts.length,
            transactionCount: allTransactions.length
        };
    },

    /**
     * Render dashboard summary cards
     * @param {object} stats - Dashboard statistics
     */
    renderDashboardSummary(stats) {
        const summaryDiv = document.getElementById('dashboardSummary');
        
        const gainLossColor = stats.totalGainLoss >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        const gainLossSign = stats.totalGainLoss >= 0 ? '+' : '';
        
        summaryDiv.innerHTML = `
            <div class="card">
                <h4 class="text-secondary" style="font-size: 14px; margin-bottom: 8px;">Total Portfolio Value</h4>
                <div style="font-size: 36px; font-weight: 600; color: var(--color-primary); margin-bottom: 8px;">
                    ${Utils.formatCurrency(stats.totalPortfolioValue, 'THB')}
                </div>
                <div style="font-size: 14px; color: var(--color-text-secondary);">
                    ${stats.portfolioCount} portfolio${stats.portfolioCount !== 1 ? 's' : ''} • ${stats.accountCount} account${stats.accountCount !== 1 ? 's' : ''}
                </div>
            </div>
            
            <div class="card">
                <h4 class="text-secondary" style="font-size: 14px; margin-bottom: 8px;">Total Gain/Loss</h4>
                <div style="font-size: 36px; font-weight: 600; color: ${gainLossColor}; margin-bottom: 8px;">
                    ${gainLossSign}${Utils.formatCurrency(Math.abs(stats.totalGainLoss), 'THB')}
                </div>
                <div style="font-size: 14px; color: ${gainLossColor};">
                    ${gainLossSign}${stats.gainLossPercent.toFixed(2)}% ${stats.totalGainLoss >= 0 ? '📈' : '📉'}
                </div>
            </div>
            
            <div class="card">
                <h4 class="text-secondary" style="font-size: 14px; margin-bottom: 8px;">Cash Balance</h4>
                <div style="font-size: 36px; font-weight: 600; color: var(--color-info); margin-bottom: 8px;">
                    ${Utils.formatCurrency(stats.totalCashBalance, 'THB')}
                </div>
                <div style="font-size: 14px; color: var(--color-text-secondary);">
                    Available in accounts
                </div>
            </div>
            
            <div class="card">
                <h4 class="text-secondary" style="font-size: 14px; margin-bottom: 8px;">Asset Balance</h4>
                <div style="font-size: 36px; font-weight: 600; color: var(--color-success); margin-bottom: 8px;">
                    ${Utils.formatCurrency(stats.totalAssetValue, 'THB')}
                </div>
                <div style="font-size: 14px; color: var(--color-text-secondary);">
                    Invested in assets
                </div>
            </div>
        `;
    },

    /**
     * Render dashboard charts
     */
    renderDashboardCharts() {
        const portfolios = this.getFilteredPortfolios();
        const chartsDiv = document.getElementById('dashboardCharts');
        
        if (portfolios.length === 0) {
            chartsDiv.innerHTML = '';
            return;
        }
        
        // Calculate total allocations across all portfolios (respecting as-of-date)
        const asOfDate = this.getAsOfDate();
        const assetAllocations = {};
        let totalValue = 0;
        
        portfolios.forEach(portfolio => {
            // Get transactions filtered by as-of-date to calculate positions
            const allTransactions = TransactionManager.getTransactions({ portfolioId: portfolio.id });
            const filteredTransactions = Utils.filterTransactionsByAsOfDate(allTransactions, asOfDate);
            
            const accounts = AccountManager.getAllAccounts().filter(acc => acc.portfolioId === portfolio.id);
            
            portfolio.assets.forEach(asset => {
                let assetValue = 0;
                
                // Calculate asset value based on as-of-date
                if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
                    // For savings assets, use linked account balances AS OF DATE
                    const linkedAccounts = accounts.filter(acc => 
                        acc.linkedAssetId === asset.id || 
                        (acc.linkedAssetType === asset.type && acc.linkedAssetName === asset.name)
                    );
                    assetValue = linkedAccounts.reduce((sum, acc) => {
                        const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(acc.id, asOfDate);
                        return sum + balanceAsOfDate;
                    }, 0);
                } else {
                    // For regular assets, calculate positions from filtered transactions
                    const assetTransactions = filteredTransactions.filter(txn => txn.assetId === asset.id);
                    let quantity = 0;
                    
                    assetTransactions.forEach(txn => {
                        if (txn.type === 'BUY') {
                            quantity += txn.quantity;
                        } else if (txn.type === 'SELL') {
                            quantity -= txn.quantity;
                        }
                    });
                    
                    if (quantity > 0) {
                        const priceData = PriceManager.getCurrentPrice(asset.id);
                        if (priceData) {
                            assetValue = quantity * priceData.price;
                        }
                    }
                }
                
                if (assetValue > 0) {
                    const key = `${asset.name} (${asset.type})`;
                    assetAllocations[key] = (assetAllocations[key] || 0) + assetValue;
                    totalValue += assetValue;
                }
            });
        });
        
        // Prepare chart data
        const allocationLabels = Object.keys(assetAllocations);
        const allocationData = Object.values(assetAllocations);
        const allocationColors = [
            '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6',
            '#00C7BE', '#FFD60A', '#FF2D55', '#A2845E', '#8E8E93'
        ];
        
        chartsDiv.innerHTML = `
            <div class="card">
                <h3 style="margin-bottom: var(--space-lg);">Asset Allocation</h3>
                <div style="position: relative; height: 300px;">
                    <canvas id="allocationChart"></canvas>
                </div>
                <div style="margin-top: var(--space-lg); font-size: 14px; color: var(--color-text-secondary); text-align: center;">
                    Total Portfolio Value: ${Utils.formatCurrency(totalValue, 'THB')}
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: var(--space-lg);">Portfolio Performance</h3>
                <div style="position: relative; height: 300px;">
                    <canvas id="performanceChart"></canvas>
                </div>
                <div style="margin-top: var(--space-lg); font-size: 14px; color: var(--color-text-secondary); text-align: center;">
                    Based on transaction history
                </div>
            </div>
        `;
        
        // Render Allocation Pie Chart
        setTimeout(() => {
            const allocationCtx = document.getElementById('allocationChart');
            if (allocationCtx && window.Chart) {
                new Chart(allocationCtx, {
                    type: 'doughnut',
                    data: {
                        labels: allocationLabels,
                        datasets: [{
                            data: allocationData,
                            backgroundColor: allocationColors,
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    padding: 15,
                                    font: { size: 12 },
                                    generateLabels: function(chart) {
                                        const data = chart.data;
                                        if (data.labels.length && data.datasets.length) {
                                            return data.labels.map((label, i) => {
                                                const value = data.datasets[0].data[i];
                                                const percentage = ((value / totalValue) * 100).toFixed(1);
                                                return {
                                                    text: `${label}: ${percentage}%`,
                                                    fillStyle: data.datasets[0].backgroundColor[i],
                                                    hidden: false,
                                                    index: i
                                                };
                                            });
                                        }
                                        return [];
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const percentage = ((value / totalValue) * 100).toFixed(1);
                                        return `${label}: ${Utils.formatCurrency(value, 'THB')} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Render Performance Line Chart
            const performanceCtx = document.getElementById('performanceChart');
            if (performanceCtx && window.Chart) {
                // Get filtered transactions by selected portfolios AND as-of-date
                const asOfDate = this.getAsOfDate();
                const filteredPortfolios = this.getFilteredPortfolios();
                const filteredPortfolioIds = filteredPortfolios.map(p => p.id);
                const allTransactions = TransactionManager.getTransactions({});
                
                // Filter transactions to only include selected portfolios AND up to as-of-date
                let filteredTransactions = filteredPortfolioIds.length > 0 
                    ? allTransactions.filter(txn => filteredPortfolioIds.includes(txn.portfolioId))
                    : allTransactions;
                
                // Filter by as-of-date
                filteredTransactions = Utils.filterTransactionsByAsOfDate(filteredTransactions, asOfDate);
                
                const sortedTxns = [...filteredTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Calculate portfolio value over time
                const valueOverTime = [];
                let runningValue = 0;
                
                if (sortedTxns.length > 0) {
                    sortedTxns.forEach(txn => {
                        // Only count transactions that change total portfolio value
                        // DEPOSIT, DIVIDEND, INTEREST = money coming in (increase value)
                        // WITHDRAW = money going out (decrease value)
                        // BUY/SELL = just moving money between cash and assets (no net change)
                        if (txn.type === 'DEPOSIT' || txn.type === 'DIVIDEND' || txn.type === 'INTEREST') {
                            runningValue += txn.totalAmount;
                        } else if (txn.type === 'WITHDRAW') {
                            runningValue -= txn.totalAmount;
                        }
                        // BUY and SELL are intentionally ignored - they don't change total value
                        
                        valueOverTime.push({
                            date: txn.date,
                            value: runningValue
                        });
                    });
                    
                    // Add value as of the selected date as the latest point
                    const stats = this.calculateDashboardStats();
                    valueOverTime.push({
                        date: asOfDate,
                        value: stats.totalPortfolioValue
                    });
                } else {
                    // No transactions, show current value
                    const stats = this.calculateDashboardStats();
                    valueOverTime.push({
                        date: new Date().toISOString().split('T')[0],
                        value: stats.totalPortfolioValue
                    });
                }
                
                const performanceLabels = valueOverTime.map(point => {
                    const date = new Date(point.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                });
                const performanceData = valueOverTime.map(point => point.value);
                
                new Chart(performanceCtx, {
                    type: 'line',
                    data: {
                        labels: performanceLabels,
                        datasets: [{
                            label: 'Portfolio Value',
                            data: performanceData,
                            borderColor: '#007AFF',
                            backgroundColor: 'rgba(0, 122, 255, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#007AFF',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Value: ${Utils.formatCurrency(context.parsed.y, 'THB')}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return Utils.formatCurrency(value, 'THB', false);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }, 100);
    },

    /**
     * Render dashboard portfolio overview
     */
    renderDashboardPortfolios() {
        const portfolios = this.getFilteredPortfolios();
        const portfoliosDiv = document.getElementById('dashboardPortfolios');
        const asOfDate = this.getAsOfDate();
        
        if (portfolios.length === 0) {
            portfoliosDiv.innerHTML = '';
            return;
        }
        
        const portfolioCards = portfolios.map(portfolio => {
            // Use PortfolioManager.getPortfolioValue with as-of-date to get accurate value
            const totalValue = PortfolioManager.getPortfolioValue(portfolio.id, asOfDate);
            const accounts = AccountManager.getAllAccounts().filter(acc => acc.portfolioId === portfolio.id);
            
            // Get risk distribution
            const riskDist = PortfolioManager.calculateRiskDistribution(portfolio.assets);
            
            return `
                <div class="card" style="cursor: pointer;" onclick="viewPortfolio('${portfolio.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-md);">
                        <div>
                            <h4 style="margin-bottom: 4px;">${portfolio.name}</h4>
                            <div style="font-size: 14px; color: var(--color-text-secondary);">
                                ${portfolio.assets.length} assets • ${accounts.length} accounts
                            </div>
                        </div>
                        <span class="status-badge status-success">Active</span>
                    </div>
                    
                    <div style="font-size: 28px; font-weight: 600; color: var(--color-primary); margin-bottom: var(--space-sm);">
                        ${Utils.formatCurrency(totalValue, 'THB')}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-sm); padding-top: var(--space-sm); border-top: 1px solid var(--color-border);">
                        <div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">Expected Return</div>
                            <div style="font-weight: 600; color: var(--color-success);">${portfolio.weightedReturn}%</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">Risk Level</div>
                            <div style="font-size: 11px;">
                                <span style="color: var(--color-success);">L:${riskDist.low}%</span> 
                                <span style="color: var(--color-warning);">M:${riskDist.medium}%</span> 
                                <span style="color: var(--color-danger);">H:${riskDist.high}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        portfoliosDiv.innerHTML = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
                    <h3>Your Portfolios</h3>
                    <button class="btn-secondary btn-sm" onclick="navigateToPage('portfolios')">
                        View All →
                    </button>
                </div>
                
                <div class="dashboard-grid" style="gap: var(--space-md);">
                    ${portfolioCards}
                </div>
            </div>
        `;
    },

    /**
     * Render dashboard recent transactions
     * @param {array} transactions - Array of recent transactions
     */
    renderDashboardTransactions(transactions) {
        const transactionsDiv = document.getElementById('dashboardTransactions');
        
        if (transactions.length === 0) {
            transactionsDiv.innerHTML = '';
            return;
        }
        
        const typeIcons = {
            BUY: '🛒',
            SELL: '💵',
            DIVIDEND: '💰',
            DEPOSIT: '⬇️',
            WITHDRAW: '⬆️',
            INTEREST: '💎',
            TRANSFER: '🔄'
        };
        
        const transactionRows = transactions.map(txn => {
            const portfolio = PortfolioManager.getPortfolio(txn.portfolioId);
            const account = txn.accountId ? AccountManager.getAccount(txn.accountId) : null;
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 18px;">${typeIcons[txn.type] || '📝'}</span>
                            <span style="font-weight: 600; font-size: 14px;">${txn.type}</span>
                            ${txn.assetTicker ? `<span class="status-badge status-info" style="font-size: 11px;">${txn.assetTicker}</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-secondary);">
                            ${txn.assetName || txn.description || 'Transaction'}
                            ${portfolio ? ` • ${portfolio.name}` : ''}
                            ${account ? ` • ${account.name}` : ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: ${txn.type === 'TRANSFER' ? 'var(--color-text-secondary)' : txn.type === 'SELL' || txn.type === 'DIVIDEND' || txn.type === 'DEPOSIT' || txn.type === 'INTEREST' ? 'var(--color-success)' : 'var(--color-danger)'};">
                            ${txn.type === 'TRANSFER' ? Utils.formatCurrency(txn.totalAmount, txn.currency) + ' → ' + Utils.formatCurrency(txn.destinationAmount || txn.totalAmount, txn.destinationCurrency || txn.currency) : (txn.type === 'SELL' || txn.type === 'DIVIDEND' || txn.type === 'DEPOSIT' || txn.type === 'INTEREST' ? '+' : '-') + Utils.formatCurrency(txn.totalAmount, txn.currency)}
                        </div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">
                                ${Utils.formatDate(txn.date, 'dd-mmm-yyyy')}
                            </div>
                    </div>
                </div>
            `;
        }).join('');
        
        transactionsDiv.innerHTML = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
                    <h3>Recent Transactions</h3>
                    <button class="btn-secondary btn-sm" onclick="navigateToPage('transactions')">
                        View All →
                    </button>
                </div>
                
                <div style="display: grid; gap: var(--space-sm);">
                    ${transactionRows}
                </div>
            </div>
        `;
    },

    /**
     * Load dashboard page
     */
    loadDashboard() {
        console.log('Loading dashboard...');
        
        // Update as of date banner
        this.updateAsOfDateBanner();
        
        const portfolios = StorageManager.getPortfolios();
        const accounts = StorageManager.getAccounts();
        
        // Load exchange rate settings
        loadExchangeRateSettings();
        
        // Check if user has any data
        if (portfolios.length === 0 && accounts.length === 0) {
            // Show empty state
            Utils.toggleElement('#dashboardEmptyState', true);
            Utils.toggleElement('#dashboardSummary', false);
            Utils.toggleElement('#dashboardCharts', false);
            Utils.toggleElement('#dashboardPortfolios', false);
            Utils.toggleElement('#dashboardTransactions', false);
            Utils.toggleElement('#dashboardFilter', false);
            Utils.toggleElement('#exchangeRateSettings', false);
            Utils.toggleElement('#fifoManagement', false);
            console.log('No data yet - showing empty state');
        } else {
            // Hide empty state
            Utils.toggleElement('#dashboardEmptyState', false);
            Utils.toggleElement('#dashboardSummary', true);
            Utils.toggleElement('#dashboardCharts', true);
            Utils.toggleElement('#dashboardPortfolios', true);
            Utils.toggleElement('#dashboardTransactions', true);
            Utils.toggleElement('#fifoManagement', true);
            
            // Render portfolio filter
            this.renderPortfolioFilter(portfolios);
            
            // Calculate and render statistics
            const stats = this.calculateDashboardStats();
            
            // NEW: Render Quick Actions
            this.renderQuickActions();
            
            // NEW: Render Alerts
            this.renderAlerts(stats, portfolios, accounts);
            
            // NEW: Render Performance Metrics
            this.renderPerformanceMetrics(stats);
            
            this.renderDashboardSummary(stats);
            
            // Render charts
            this.renderDashboardCharts();
            
            // NEW: Render enhanced portfolio overview with health indicators
            this.renderDashboardPortfoliosEnhanced();
            
            // Render recent transactions (last 10) - filtered by selected portfolios
            const filteredPortfolios = this.getFilteredPortfolios();
            const filteredPortfolioIds = filteredPortfolios.map(p => p.id);
            const allTransactions = TransactionManager.getTransactions({});
            const filteredTransactions = filteredPortfolioIds.length > 0 
                ? allTransactions.filter(txn => filteredPortfolioIds.includes(txn.portfolioId))
                : allTransactions;
            const recentTransactions = filteredTransactions.slice(0, 10);
            this.renderDashboardTransactions(recentTransactions);
            
            console.log('Dashboard loaded:', stats);
        }
    },

    /**
     * Render Quick Actions (Priority 1)
     */
    renderQuickActions() {
        // Remove old element if exists
        const existingActions = document.getElementById('quickActions');
        if (existingActions) {
            existingActions.remove();
        }
        
        const actionsHTML = `
            <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md);">
                <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap; justify-content: center;">
                    <button class="btn-primary btn-sm" onclick="showRecordTransactionModal()" title="Record a new transaction">
                        ➕ Transaction
                    </button>
                    <button class="btn-secondary btn-sm" onclick="navigateToPage('portfolios'); showCreatePortfolioModal()" title="Create a new portfolio">
                        💼 Portfolio
                    </button>
                    <button class="btn-secondary btn-sm" onclick="navigateToPage('accounts'); showCreateAccountModal()" title="Create a new account">
                        🏦 Account
                    </button>
                </div>
            </div>
        `;
        
        // Insert at the top of dashboard summary
        const summaryDiv = document.getElementById('dashboardSummary');
        if (summaryDiv && summaryDiv.parentNode) {
            const actionsDiv = document.createElement('div');
            actionsDiv.id = 'quickActions';
            actionsDiv.innerHTML = actionsHTML;
            summaryDiv.parentNode.insertBefore(actionsDiv, summaryDiv);
        }
    },

    /**
     * Render Alerts Panel (Priority 1)
     */
    renderAlerts(stats, portfolios, accounts) {
        // Remove old element if exists
        const existingAlerts = document.getElementById('dashboardAlerts');
        if (existingAlerts) {
            existingAlerts.remove();
        }
        
        const alerts = [];
        
        // Check for rebalancing needs (>5% drift)
        portfolios.forEach(portfolio => {
            const positions = TransactionManager.getPortfolioPositions(portfolio.id);
            let totalValue = 0;
            
            // Calculate total portfolio value
            portfolio.assets.forEach(asset => {
                const position = positions.find(p => p.assetId === asset.id);
                if (position) {
                    const priceData = PriceManager.getCurrentPrice(asset.id);
                    if (priceData) {
                        totalValue += position.quantity * priceData.price;
                    }
                }
            });
            
            // Check each asset for drift
            portfolio.assets.forEach(asset => {
                const position = positions.find(p => p.assetId === asset.id);
                if (position && totalValue > 0) {
                    const priceData = PriceManager.getCurrentPrice(asset.id);
                    if (priceData) {
                        const assetValue = position.quantity * priceData.price;
                        const actualAllocation = (assetValue / totalValue) * 100;
                        const drift = Math.abs(actualAllocation - asset.allocation);
                        
                        if (drift > 5) {
                            alerts.push({
                                type: 'warning',
                                icon: '⚠️',
                                message: `${portfolio.name}: ${asset.name} needs rebalancing (${drift.toFixed(1)}% drift)`
                            });
                        }
                    }
                }
            });
        });
        
        // Check for low account balances (< 1000 for THB, < 100 for USD)
        accounts.forEach(account => {
            const threshold = account.currency === 'USD' ? 100 : 1000;
            if (account.balance < threshold) {
                alerts.push({
                    type: 'info',
                    icon: '💵',
                    message: `Low balance in ${account.name}: ${Utils.formatCurrency(account.balance, account.currency)}`
                });
            }
        });
        
        // Check for upcoming interest payments (within 30 days)
        const today = new Date();
        const interestDates = [new Date(today.getFullYear(), 5, 30), new Date(today.getFullYear(), 11, 31)]; // Jun 30, Dec 31
        interestDates.forEach(date => {
            const daysUntil = Math.floor((date - today) / (1000 * 60 * 60 * 24));
            if (daysUntil > 0 && daysUntil <= 30) {
                alerts.push({
                    type: 'info',
                    icon: '📅',
                    message: `Interest payment due in ${daysUntil} days (${Utils.formatDate(date, 'short')})`
                });
            }
        });
        
        // Only show if there are alerts
        if (alerts.length === 0) return;
        
        const alertsHTML = `
            <div class="card" style="margin-bottom: var(--space-lg); padding: var(--space-md); border-left: 4px solid var(--color-warning);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                    <h4 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                        🔔 Alerts (${alerts.length})
                    </h4>
                    <button class="btn-link" onclick="App.dismissAllAlerts()" style="font-size: 12px;">
                        Dismiss All
                    </button>
                </div>
                <div style="display: grid; gap: var(--space-xs);">
                    ${alerts.map((alert, index) => `
                        <div style="display: flex; align-items: center; gap: 8px; padding: var(--space-xs); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                            <span style="font-size: 18px;">${alert.icon}</span>
                            <span style="flex: 1; font-size: 14px;">${alert.message}</span>
                            <button class="btn-icon" onclick="App.dismissAlert(${index})" title="Dismiss">
                                ✕
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Insert before quick actions
        const quickActions = document.getElementById('quickActions');
        if (quickActions && quickActions.parentNode) {
            const alertsDiv = document.createElement('div');
            alertsDiv.id = 'dashboardAlerts';
            alertsDiv.innerHTML = alertsHTML;
            quickActions.parentNode.insertBefore(alertsDiv, quickActions);
        }
    },

    /**
     * Render Performance Metrics (Priority 3)
     */
    renderPerformanceMetrics(stats) {
        // Remove old element if exists
        const existingMetrics = document.getElementById('performanceMetrics');
        if (existingMetrics) {
            existingMetrics.remove();
        }
        
        const portfolios = this.getFilteredPortfolios();
        const asOfDate = this.getAsOfDate();
        const allTransactions = TransactionManager.getTransactions({});
        
        // Filter transactions by selected portfolios and as-of-date
        const filteredPortfolioIds = portfolios.map(p => p.id);
        let relevantTransactions = filteredPortfolioIds.length > 0 
            ? allTransactions.filter(txn => filteredPortfolioIds.includes(txn.portfolioId))
            : allTransactions;
        relevantTransactions = Utils.filterTransactionsByAsOfDate(relevantTransactions, asOfDate);
        
        // Find first deposit date (portfolio inception)
        const depositTransactions = relevantTransactions
            .filter(txn => txn.type === 'DEPOSIT')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let inceptionDate = null;
        let inceptionValue = 0;
        let totalReturn = 0;
        let annualizedReturn = 0;
        let timeInMarket = 0;
        
        if (depositTransactions.length > 0) {
            inceptionDate = new Date(depositTransactions[0].date);
            // FIXED: Use only the FIRST deposit amount as starting value, not sum of all deposits
            inceptionValue = depositTransactions[0].totalAmount;
            
            // Calculate total return from inception (first deposit) to as-of-date
            const endValue = stats.totalPortfolioValue;
            const gainLoss = endValue - inceptionValue;
            totalReturn = inceptionValue > 0 ? (gainLoss / inceptionValue) * 100 : 0;
            
            // Calculate time in market (years) from first deposit to as-of-date
            const asOfDateObj = new Date(asOfDate);
            timeInMarket = (asOfDateObj - inceptionDate) / (1000 * 60 * 60 * 24 * 365.25);
            
            // Calculate annualized return: (1 + totalReturn)^(1/years) - 1
            if (timeInMarket > 0) {
                const totalReturnDecimal = totalReturn / 100;
                annualizedReturn = (Math.pow(1 + totalReturnDecimal, 1 / timeInMarket) - 1) * 100;
            }
        }
        
        // Calculate YTD returns (from Jan 1 to as-of-date)
        const today = new Date(asOfDate);
        const yearStart = new Date(today.getFullYear(), 0, 1);
        
        // Get all transactions from Jan 1 to as-of-date
        const ytdTransactions = relevantTransactions.filter(txn => {
            const txnDate = new Date(txn.date);
            return txnDate >= yearStart && txnDate <= today;
        });
        
        // Calculate portfolio value at year start (Dec 31 of previous year)
        const yearStartDate = new Date(today.getFullYear(), 0, 0); // Dec 31 of previous year
        const yearStartDateStr = yearStartDate.toISOString().split('T')[0];
        
        // Get transactions up to year start to calculate starting value
        const transactionsUpToYearStart = relevantTransactions.filter(txn => 
            new Date(txn.date) <= yearStartDate
        );
        
        let ytdStartValue = 0;
        transactionsUpToYearStart.forEach(txn => {
            if (txn.type === 'DEPOSIT' || txn.type === 'DIVIDEND' || txn.type === 'INTEREST') {
                ytdStartValue += txn.totalAmount;
            } else if (txn.type === 'WITHDRAW') {
                ytdStartValue -= txn.totalAmount;
            }
        });
        
        // If portfolio started this year, use 0 as start value
        if (inceptionDate && inceptionDate >= yearStart) {
            ytdStartValue = 0;
        }
        
        const ytdEndValue = stats.totalPortfolioValue;
        const ytdGainLoss = ytdEndValue - ytdStartValue;
        const ytdReturn = ytdStartValue > 0 ? (ytdGainLoss / ytdStartValue) * 100 : 0;
        
        // Find best performing asset
        let bestAsset = { name: 'N/A', return: 0 };
        
        portfolios.forEach(portfolio => {
            portfolio.assets.forEach(asset => {
                const assetReturn = asset.expectedReturn || 0;
                if (assetReturn > bestAsset.return) {
                    bestAsset = { name: asset.name, return: assetReturn };
                }
            });
        });
        
        // Calculate total dividends/interest
        const totalIncome = relevantTransactions
            .filter(txn => txn.type === 'DIVIDEND' || txn.type === 'INTEREST')
            .reduce((sum, txn) => sum + txn.totalAmount, 0);
        
        const metricsHTML = `
            <div class="dashboard-grid" style="gap: var(--space-sm); margin-bottom: var(--space-lg);">
                ${inceptionDate ? `
                <div class="card card-ultra-compact">
                    <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Inception Date</h4>
                    <div style="font-size: 14px; font-weight: 600; color: var(--color-primary);">
                        ${Utils.formatDate(inceptionDate, 'dd-mmm-yyyy')}
                    </div>
                    <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                        ${timeInMarket.toFixed(1)} years
                    </div>
                </div>
                <div class="card card-ultra-compact">
                    <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Return</h4>
                    <div style="font-size: 18px; font-weight: 600; color: ${totalReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                        ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%
                    </div>
                    <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                        Since inception
                    </div>
                </div>
                <div class="card card-ultra-compact">
                    <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Annualized Return</h4>
                    <div style="font-size: 18px; font-weight: 600; color: ${annualizedReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                        ${annualizedReturn >= 0 ? '+' : ''}${annualizedReturn.toFixed(2)}%
                    </div>
                    <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                        Per year avg
                    </div>
                </div>
                ` : ''}
                <div class="card card-ultra-compact">
                    <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">YTD Return</h4>
                    <div style="font-size: 18px; font-weight: 600; color: ${ytdReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                        ${ytdReturn >= 0 ? '+' : ''}${ytdReturn.toFixed(2)}%
                    </div>
                </div>
                <div class="card card-ultra-compact">
                    <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Best Performer</h4>
                    <div style="font-size: 14px; font-weight: 600; color: var(--color-success);">
                        ${bestAsset.name}
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">
                        +${bestAsset.return.toFixed(1)}%
                    </div>
                </div>
                <div class="card card-ultra-compact">
                    <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Income</h4>
                    <div style="font-size: 18px; font-weight: 600; color: var(--color-success);">
                        ${Utils.formatCurrency(totalIncome, 'THB')}
                    </div>
                    <div style="font-size: 10px; color: var(--color-text-secondary);">
                        Dividends + Interest
                    </div>
                </div>
            </div>
        `;
        
        // Insert before summary cards
        const summaryDiv = document.getElementById('dashboardSummary');
        if (summaryDiv && summaryDiv.parentNode) {
            const metricsDiv = document.createElement('div');
            metricsDiv.id = 'performanceMetrics';
            metricsDiv.innerHTML = metricsHTML;
            summaryDiv.parentNode.insertBefore(metricsDiv, summaryDiv);
        }
    },

    /**
     * Render Enhanced Portfolio Overview with Health Indicators (Priority 2)
     */
    renderDashboardPortfoliosEnhanced() {
        const portfolios = this.getFilteredPortfolios();
        const portfoliosDiv = document.getElementById('dashboardPortfolios');
        const asOfDate = this.getAsOfDate();
        
        if (portfolios.length === 0) {
            portfoliosDiv.innerHTML = '';
            return;
        }
        
        const portfolioCards = portfolios.map(portfolio => {
            // Use PortfolioManager.getPortfolioValue with as-of-date
            const totalValue = PortfolioManager.getPortfolioValue(portfolio.id, asOfDate);
            
            // Calculate asset values for drift calculation (respecting as-of-date)
            const allTransactions = TransactionManager.getTransactions({ portfolioId: portfolio.id });
            const filteredTransactions = Utils.filterTransactionsByAsOfDate(allTransactions, asOfDate);
            const accounts = AccountManager.getAllAccounts().filter(acc => acc.portfolioId === portfolio.id);
            const assetValues = {};
            
            portfolio.assets.forEach(asset => {
                if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
                    // For savings assets, use linked account balances AS OF DATE
                    const linkedAccounts = accounts.filter(acc => 
                        acc.linkedAssetId === asset.id || 
                        (acc.linkedAssetType === asset.type && acc.linkedAssetName === asset.name)
                    );
                    const assetValue = linkedAccounts.reduce((sum, acc) => {
                        const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(acc.id, asOfDate);
                        return sum + balanceAsOfDate;
                    }, 0);
                    if (assetValue > 0) {
                        assetValues[asset.id] = assetValue;
                    }
                } else {
                    // For regular assets, calculate positions from filtered transactions
                    const assetTransactions = filteredTransactions.filter(txn => txn.assetId === asset.id);
                    let quantity = 0;
                    
                    assetTransactions.forEach(txn => {
                        if (txn.type === 'BUY') {
                            quantity += txn.quantity;
                        } else if (txn.type === 'SELL') {
                            quantity -= txn.quantity;
                        }
                    });
                    
                    if (quantity > 0) {
                        const priceData = PriceManager.getCurrentPrice(asset.id);
                        if (priceData) {
                            assetValues[asset.id] = quantity * priceData.price;
                        }
                    }
                }
            });
            
            // Calculate health metrics
            let maxDrift = 0;
            let driftCount = 0;
            portfolio.assets.forEach(asset => {
                if (assetValues[asset.id] && totalValue > 0) {
                    const actualAllocation = (assetValues[asset.id] / totalValue) * 100;
                    const drift = Math.abs(actualAllocation - asset.allocation);
                    if (drift > maxDrift) maxDrift = drift;
                    if (drift > 5) driftCount++;
                }
            });
            
            // Health score (0-100)
            const healthScore = Math.max(0, 100 - (maxDrift * 2));
            const healthColor = healthScore >= 90 ? 'var(--color-success)' : healthScore >= 70 ? 'var(--color-warning)' : 'var(--color-danger)';
            const healthStatus = healthScore >= 90 ? '✅' : healthScore >= 70 ? '🟡' : '🔴';
            
            const riskDist = PortfolioManager.calculateRiskDistribution(portfolio.assets);
            
            return `
                <div class="card" style="cursor: pointer;" onclick="viewPortfolio('${portfolio.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-md);">
                        <div>
                            <h4 style="margin-bottom: 4px;">${portfolio.name}</h4>
                            <div style="font-size: 14px; color: var(--color-text-secondary);">
                                ${portfolio.assets.length} assets • ${accounts.length} accounts
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; margin-bottom: 4px;">${healthStatus}</div>
                            <div style="font-size: 12px; font-weight: 600; color: ${healthColor};">
                                Health: ${healthScore.toFixed(0)}
                            </div>
                        </div>
                    </div>
                    
                    <div style="font-size: 28px; font-weight: 600; color: var(--color-primary); margin-bottom: var(--space-sm);">
                        ${Utils.formatCurrency(totalValue, 'THB')}
                    </div>
                    
                    ${driftCount > 0 ? `
                        <div style="padding: var(--space-xs); background: var(--color-warning); color: white; border-radius: var(--radius-sm); margin-bottom: var(--space-sm); font-size: 12px;">
                            ⚠️ ${driftCount} asset${driftCount > 1 ? 's' : ''} need${driftCount === 1 ? 's' : ''} rebalancing (Max drift: ${maxDrift.toFixed(1)}%)
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-sm); padding-top: var(--space-sm); border-top: 1px solid var(--color-border);">
                        <div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">Expected Return</div>
                            <div style="font-weight: 600; color: var(--color-success);">${portfolio.weightedReturn}%</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">Risk Level</div>
                            <div style="font-size: 11px;">
                                <span style="color: var(--color-success);">L:${riskDist.low}%</span> 
                                <span style="color: var(--color-warning);">M:${riskDist.medium}%</span> 
                                <span style="color: var(--color-danger);">H:${riskDist.high}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        portfoliosDiv.innerHTML = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
                    <h3>Your Portfolios</h3>
                    <button class="btn-secondary btn-sm" onclick="navigateToPage('portfolios')">
                        View All →
                    </button>
                </div>
                
                <div class="dashboard-grid" style="gap: var(--space-md);">
                    ${portfolioCards}
                </div>
            </div>
        `;
    },

    /**
     * Dismiss a specific alert
     */
    dismissAlert(index) {
        const alertsDiv = document.getElementById('dashboardAlerts');
        if (alertsDiv) {
            alertsDiv.remove();
        }
    },

    /**
     * Dismiss all alerts
     */
    dismissAllAlerts() {
        const alertsDiv = document.getElementById('dashboardAlerts');
        if (alertsDiv) {
            alertsDiv.remove();
        }
    },

    /**
     * Load portfolios page
     */
    loadPortfolios() {
        console.log('Loading portfolios...');
        const portfolios = PortfolioManager.getAllPortfolios();
        const portfolioList = document.getElementById('portfolioList');
        const emptyState = document.getElementById('portfoliosEmptyState');

        if (portfolios.length === 0) {
            portfolioList.innerHTML = '';
            Utils.toggleElement(emptyState, true);
        } else {
            Utils.toggleElement(emptyState, false);
            this.renderPortfolioList(portfolios);
        }
    },

    /**
     * Render portfolio list
     * @param {array} portfolios - Array of portfolios
     */
    renderPortfolioList(portfolios) {
        const portfolioList = document.getElementById('portfolioList');
        const asOfDate = this.getAsOfDate();
        
        portfolioList.innerHTML = portfolios.map(portfolio => {
            // Use PortfolioManager.getPortfolioValue with as-of-date to get accurate value
            const value = PortfolioManager.getPortfolioValue(portfolio.id, asOfDate);
            const riskDist = PortfolioManager.calculateRiskDistribution(portfolio.assets);
            
            return `
                <div class="portfolio-card">
                    <div class="portfolio-header">
                        <h3 class="portfolio-name">${portfolio.name}</h3>
                        <span class="status-badge status-success">Active</span>
                    </div>
                    
                    <div class="portfolio-value">
                        ${Utils.formatCurrency(value, 'THB')}
                    </div>
                    
                    <div class="portfolio-return">
                        Expected Return: <strong>${portfolio.weightedReturn}%</strong>
                    </div>
                    
                    <div class="portfolio-assets">
                        <div style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 8px;">
                            ${portfolio.assets.length} Assets
                        </div>
                        <div style="max-height: 300px; overflow-y: auto; padding-right: 4px;">
                            ${portfolio.assets.map(asset => {
                                const priceData = PriceManager.getCurrentPrice(asset.id);
                                const priceDisplay = priceData 
                                    ? `<span style="color: var(--color-success); font-size: 12px;">${Utils.formatCurrency(priceData.price, priceData.currency)}</span>`
                                    : `<button class="btn-link" onclick="event.stopPropagation(); showManualPriceModal('${asset.id}', '${asset.name}', '${asset.currency}')" style="font-size: 11px; padding: 2px 6px;">Set Price</button>`;
                                
                                const lastUpdate = priceData ? PriceManager.getTimeSinceUpdate(asset.id) : '';
                                
                                return `
                                    <div class="portfolio-asset-item">
                                        <div style="display: flex; flex-direction: column; gap: 2px;">
                                            <span class="asset-name">${asset.name}</span>
                                            ${priceData ? `<span style="font-size: 10px; color: var(--color-text-secondary);">${lastUpdate}</span>` : ''}
                                        </div>
                                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                                            <span class="asset-allocation">${asset.allocation}%</span>
                                            ${priceDisplay}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border);">
                        <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px;">
                            Risk: Low ${riskDist.low}% | Med ${riskDist.medium}% | High ${riskDist.high}%
                        </div>
                        <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); viewPortfolio('${portfolio.id}')" style="width: 100%;">
                            View Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Load accounts page
     */
    loadAccounts() {
        console.log('Loading accounts...');
        
        // Update as of date banner
        this.updateAsOfDateBanner();
        
        const accounts = AccountManager.getAllAccounts();
        const accountsList = document.getElementById('accountsList');
        const emptyState = document.getElementById('accountsEmptyState');

        if (accounts.length === 0) {
            accountsList.innerHTML = '';
            Utils.toggleElement(emptyState, true);
        } else {
            Utils.toggleElement(emptyState, false);
            this.renderAccountList(accounts);
        }
    },

    /**
     * Render account list
     * @param {array} accounts - Array of accounts
     */
    renderAccountList(accounts) {
        const accountsList = document.getElementById('accountsList');
        const asOfDate = this.getAsOfDate();
        
        accountsList.innerHTML = accounts.map(account => {
            const currentRate = AccountManager.getCurrentInterestRate(account.id);
            const estimatedInterest = AccountManager.getEstimatedInterest(account.id, 180);
            const portfolio = PortfolioManager.getPortfolio(account.portfolioId);
            
            // Calculate balance as of date
            const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(account.id, asOfDate);
            
            return `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">${account.name}</h3>
                            <div style="font-size: 14px; color: var(--color-text-secondary); margin-top: 4px;">
                                ${account.institution || 'No institution'} ${account.accountNumber ? '• ' + account.accountNumber : ''}
                            </div>
                            <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                                Portfolio: ${portfolio ? portfolio.name : 'Unknown'}
                            </div>
                        </div>
                        <span class="status-badge ${account.type === 'fcd_account' ? 'status-info' : 'status-success'}">
                            ${account.type === 'fcd_account' ? 'FCD' : 'THB'}
                        </span>
                    </div>
                    
                    <div style="margin: var(--space-lg) 0;">
                        <div style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 4px;">
                            Balance
                        </div>
                        <div style="font-size: 28px; font-weight: 600; color: var(--color-primary);">
                            ${Utils.formatCurrency(balanceAsOfDate, account.currency)}
                        </div>
                    </div>
                    
                    <div style="padding: var(--space-md); background-color: var(--color-bg-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 14px; color: var(--color-text-secondary);">Current Rate</span>
                            <span style="font-weight: 600;">${currentRate}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 14px; color: var(--color-text-secondary);">Est. Interest (6mo)</span>
                            <span style="font-weight: 600; color: var(--color-success);">
                                +${Utils.formatCurrency(estimatedInterest, account.currency)}
                            </span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                        <button class="btn-primary" onclick="showAccountTransactionTypeSelector('${account.id}')">
                            ➕ Add Transaction
                        </button>
                        <button class="btn-secondary" onclick="showEditAccountModal('${account.id}')">
                            ✏️ Edit Account
                        </button>
                    </div>
                    
                    ${account.notes ? `
                        <div style="margin-top: var(--space-md); font-size: 14px; color: var(--color-text-secondary); font-style: italic;">
                            ${account.notes}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    /**
     * Load transactions page
     */
    loadTransactions() {
        console.log('Loading transactions...');
        
        // Update as of date banner
        this.updateAsOfDateBanner();
        
        // Load filter portfolio options ONLY if dropdown is empty
        const filterPortfolio = document.getElementById('filterPortfolio');
        const currentPortfolioValue = filterPortfolio.value; // Save current selection
        
        if (filterPortfolio.options.length <= 1) { // Only "All Portfolios" or empty
            const portfolios = PortfolioManager.getAllPortfolios();
            filterPortfolio.innerHTML = '<option value="">All Portfolios</option>' +
                portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            
            // Restore the previously selected value
            if (currentPortfolioValue) {
                filterPortfolio.value = currentPortfolioValue;
            }
        }

        // Get filter values
        const filters = {
            portfolioId: document.getElementById('filterPortfolio').value,
            type: document.getElementById('filterType').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value
        };

        console.log('Applying filters:', filters); // Debug logging

        // Get transactions
        const transactions = TransactionManager.getTransactions(filters);
        const transactionList = document.getElementById('transactionList');
        const emptyState = document.getElementById('transactionsEmptyState');

        if (transactions.length === 0) {
            transactionList.innerHTML = '';
            Utils.toggleElement(emptyState, true);
            
            // Hide stats if no transactions
            document.getElementById('transactionStats').innerHTML = '';
        } else {
            Utils.toggleElement(emptyState, false);
            
            // Show statistics
            this.renderTransactionStats(filters.portfolioId || null);
            
            // Render transaction list
            this.renderTransactionList(transactions);
        }
    },

    /**
     * Render transaction statistics
     * @param {string|null} portfolioId - Portfolio ID or null for all
     */
    renderTransactionStats(portfolioId) {
        const stats = portfolioId 
            ? TransactionManager.calculatePortfolioStats(portfolioId)
            : this.calculateAllPortfoliosStats();

        // Determine color for Total Gain/Loss (using new calculation)
        const gainLossColor = stats.totalGainLossAsOf >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        const gainLossSign = stats.totalGainLossAsOf >= 0 ? '+' : '';

        const statsHtml = `
            <div class="card card-ultra-compact">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Deposit</h4>
                <div style="font-size: 18px; font-weight: 600; color: var(--color-primary);">
                    ${Utils.formatCurrency(stats.totalDeposits, 'THB')}
                </div>
            </div>
            <div class="card card-ultra-compact">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Asset (Cost)</h4>
                <div style="font-size: 18px; font-weight: 600; color: var(--color-info);">
                    ${Utils.formatCurrency(stats.totalAssetValue, 'THB')}
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                    Assets: ${Utils.formatCurrency(stats.totalBuyAmount, 'THB')} | Cash: ${Utils.formatCurrency(stats.totalAssetValue - stats.totalBuyAmount, 'THB')}
                </div>
            </div>
            <div class="card card-ultra-compact">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Asset Value as of</h4>
                <div style="font-size: 18px; font-weight: 600; color: var(--color-info);">
                    ${Utils.formatCurrency(stats.totalAssetValueAsOf, 'THB')}
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                    Assets: ${Utils.formatCurrency(stats.totalAssetValueAsOf - stats.accountBalances, 'THB')} | Accounts: ${Utils.formatCurrency(stats.accountBalances, 'THB')}
                </div>
            </div>
            <div class="card card-ultra-compact">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Gain/Loss</h4>
                <div style="font-size: 18px; font-weight: 600; color: ${gainLossColor};">
                    ${gainLossSign}${Utils.formatCurrency(Math.abs(stats.totalGainLossAsOf), 'THB')}
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                    ${stats.totalDeposits > 0 ? ((stats.totalGainLossAsOf / stats.totalDeposits) * 100).toFixed(2) + '%' : '0%'} | Total Fee: ${Utils.formatCurrency(stats.totalFees, 'THB')}
                </div>
            </div>
        `;

        document.getElementById('transactionStats').innerHTML = statsHtml;
    },

    /**
     * Calculate stats for all portfolios
     */
    calculateAllPortfoliosStats() {
        const portfolios = PortfolioManager.getAllPortfolios();
        let totalDeposits = 0;
        let totalAssetValue = 0;
        let totalAssetValueAsOf = 0;
        let totalFees = 0;
        let totalDividends = 0;
        let accountBalances = 0;
        let totalBuyAmount = 0;

        portfolios.forEach(p => {
            const stats = TransactionManager.calculatePortfolioStats(p.id);
            totalDeposits += stats.totalDeposits;
            totalAssetValue += stats.totalAssetValue;
            totalAssetValueAsOf += stats.totalAssetValueAsOf;
            totalFees += stats.totalFees;
            totalDividends += stats.totalDividends;
            accountBalances += stats.accountBalances;
            totalBuyAmount += stats.totalBuyAmount;
        });

        const totalGainLoss = totalAssetValue - totalDeposits;
        const totalGainLossAsOf = totalAssetValueAsOf - totalDeposits;

        return {
            totalDeposits,
            totalAssetValue,
            totalAssetValueAsOf,
            totalFees,
            totalGainLoss,
            totalGainLossAsOf,
            totalDividends,
            accountBalances,
            totalBuyAmount
        };
    },

    /**
     * Render transaction list
     * @param {array} transactions - Array of transactions
     */
    renderTransactionList(transactions) {
        const transactionList = document.getElementById('transactionList');
        
        const typeIcons = {
            BUY: '🛒',
            SELL: '💵',
            DIVIDEND: '💰',
            DEPOSIT: '⬇️',
            WITHDRAW: '⬆️',
            INTEREST: '💎',
            TRANSFER: '🔄'
        };

        const typeColors = {
            BUY: 'var(--color-primary)',
            SELL: 'var(--color-success)',
            DIVIDEND: 'var(--color-success)',
            DEPOSIT: 'var(--color-info)',
            WITHDRAW: 'var(--color-warning)',
            INTEREST: 'var(--color-info)',
            TRANSFER: 'var(--color-primary)'
        };

        transactionList.innerHTML = transactions.map(txn => {
            const portfolio = PortfolioManager.getPortfolio(txn.portfolioId);
            const account = txn.accountId ? AccountManager.getAccount(txn.accountId) : null;
            
            return `
                <div class="card card-ultra-compact" style="margin-bottom: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--space-sm);">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                <span style="font-size: 20px;">${typeIcons[txn.type] || '📝'}</span>
                                <span style="font-weight: 600; color: ${typeColors[txn.type]};">${txn.type}</span>
                                ${txn.assetTicker ? `<span class="status-badge status-info">${txn.assetTicker}</span>` : ''}
                                <button class="btn-secondary btn-sm" onclick="showEditTransactionModal('${txn.id}')" style="margin-left: auto; padding: 2px 8px; font-size: 11px;">
                                    ✏️ Edit
                                </button>
                            </div>
                            
                            <div style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 4px;">
                                ${txn.assetName || txn.description || 'Transaction'}
                            </div>
                            
                            ${txn.quantity > 0 ? `
                                <div style="font-size: 14px; color: var(--color-text-secondary);">
                                    ${txn.quantity} ${txn.quantity === 1 ? 'share' : 'shares'} @ ${Utils.formatCurrency(txn.pricePerUnit, txn.currency)}
                                </div>
                            ` : ''}
                            
                            <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 8px;">
                                Portfolio: ${portfolio ? portfolio.name : 'Unknown'}
                                ${txn.type === 'TRANSFER' && account ? ` • From: ${account.name}` : account ? ` • Account: ${account.name}` : ''}
                                ${txn.type === 'TRANSFER' && txn.destinationAccountId ? ` → To: ${AccountManager.getAccount(txn.destinationAccountId)?.name || 'Unknown'}` : ''}
                            </div>
                        </div>
                        
                        <div style="text-align: right;">
                            ${txn.type === 'BUY' ? `
                                <div style="font-size: 14px; font-weight: 600; color: var(--color-danger); margin-bottom: 4px;">
                                    Cash: -${Utils.formatCurrency(txn.totalAmount, txn.currency)}
                                </div>
                                <div style="font-size: 14px; font-weight: 600; color: var(--color-success);">
                                    Asset: +${Utils.formatCurrency(txn.totalAmount, txn.currency)}
                                </div>
                            ` : txn.type === 'SELL' ? `
                                <div style="font-size: 14px; font-weight: 600; color: var(--color-danger); margin-bottom: 4px;">
                                    Asset: -${Utils.formatCurrency(txn.totalAmount, txn.currency)}
                                </div>
                                <div style="font-size: 14px; font-weight: 600; color: var(--color-success);">
                                    Cash: +${Utils.formatCurrency(txn.totalAmount, txn.currency)}
                                </div>
                            ` : `
                                <div style="font-size: 20px; font-weight: 600; color: ${txn.type === 'TRANSFER' ? 'var(--color-text-secondary)' : txn.type === 'WITHDRAW' ? 'var(--color-danger)' : 'var(--color-success)'};">
                                    ${txn.type === 'TRANSFER' ? Utils.formatCurrency(txn.totalAmount, txn.currency) + ' → ' + Utils.formatCurrency(txn.destinationAmount || txn.totalAmount, txn.destinationCurrency || txn.currency) : (txn.type === 'WITHDRAW' ? '-' : '+') + Utils.formatCurrency(txn.totalAmount, txn.currency)}
                                </div>
                            `}
                            ${txn.fee > 0 ? `
                                <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                                    Fee: ${Utils.formatCurrency(txn.fee, txn.currency)}
                                </div>
                            ` : ''}
                            <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                                ${Utils.formatDate(txn.date, 'dd-mmm-yyyy')}
                            </div>
                        </div>
                    </div>
                    
                    ${txn.notes ? `
                        <div style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--color-border); font-size: 14px; font-style: italic; color: var(--color-text-secondary);">
                            ${txn.notes}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    /**
     * Load planning page
     */
    loadPlanning() {
        console.log('Loading planning...');
        
        const portfolios = PortfolioManager.getAllPortfolios();
        const dcaCard = document.querySelector('#planningPage .card');
        const emptyState = document.getElementById('planningEmptyState');
        
        if (portfolios.length === 0) {
            // Show empty state
            dcaCard.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            // Hide empty state and show calculator
            dcaCard.style.display = 'block';
            emptyState.style.display = 'none';
            
            // Load portfolio options
            loadDCAPortfolioOptions();
            
            // Set default date to today
            document.getElementById('dcaStartDate').value = new Date().toISOString().split('T')[0];
            
            // Setup form handler
            setupDCAFormHandler();
        }
    },

    /**
     * Load reports page
     */
    loadReports() {
        console.log('Loading reports...');
        
        const portfolios = PortfolioManager.getAllPortfolios();
        const portfolioSelect = document.getElementById('reportsPortfolioSelect');
        const reportsContent = document.getElementById('reportsContent');
        const emptyState = document.getElementById('reportsEmptyState');
        
        if (portfolios.length === 0) {
            // Show empty state
            portfolioSelect.innerHTML = '<option value="">No portfolios available</option>';
            reportsContent.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            // Load portfolio options
            portfolioSelect.innerHTML = '<option value="">Select Portfolio</option>' +
                portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            
            reportsContent.style.display = 'none';
            emptyState.style.display = 'none';
        }
    }
};

// ============================================================================
// GLOBAL UI FUNCTIONS
// ============================================================================

// Navigation
window.navigateToPage = function(pageName) {
    App.navigateTo(pageName);
};

// Portfolio Management
window.viewPortfolio = function(portfolioId) {
    console.log('Viewing portfolio:', portfolioId);
    
    const portfolio = PortfolioManager.getPortfolio(portfolioId);
    if (!portfolio) {
        Utils.showNotification('Portfolio not found', 'error');
        return;
    }
    
    // Set portfolio name in header
    document.getElementById('portfolioDetailName').textContent = portfolio.name;
    
    // Render portfolio detail content
    renderPortfolioDetail(portfolio);
    
    // Show modal
    Utils.toggleElement('#portfolioDetailModal', true);
};

window.closePortfolioDetailModal = function() {
    Utils.toggleElement('#portfolioDetailModal', false);
};

let currentEditPortfolioId = null;

window.showEditPortfolioModal = function() {
    // Get the portfolio ID from the detail modal
    const portfolioName = document.getElementById('portfolioDetailName').textContent;
    const portfolios = PortfolioManager.getAllPortfolios();
    const portfolio = portfolios.find(p => p.name === portfolioName);
    
    if (!portfolio) {
        Utils.showNotification('Portfolio not found', 'error');
        return;
    }
    
    currentEditPortfolioId = portfolio.id;
    
    // Close detail modal
    closePortfolioDetailModal();
    
    // Populate form with current data
    document.getElementById('editPortfolioId').value = portfolio.id;
    document.getElementById('editPortfolioName').value = portfolio.name;
    document.getElementById('editPortfolioDescription').value = portfolio.description || '';
    
    // Clear and populate assets
    const editAssetsList = document.getElementById('editAssetsList');
    editAssetsList.innerHTML = '';
    editAssetRowCounter = 0;
    
    // Add existing assets
    portfolio.assets.forEach(asset => {
        addEditAssetRow(asset);
    });
    
    // Update allocation total
    updateEditAllocationTotal();
    
    // Show modal
    Utils.toggleElement('#editPortfolioModal', true);
};

window.closeEditPortfolioModal = function() {
    Utils.toggleElement('#editPortfolioModal', false);
    currentEditPortfolioId = null;
};

let editAssetRowCounter = 0;

window.addEditAssetRow = function(existingAsset = null) {
    const assetsList = document.getElementById('editAssetsList');
    const rowId = `edit-asset-${editAssetRowCounter++}`;
    
    const assetRow = document.createElement('div');
    assetRow.className = 'card';
    assetRow.id = rowId;
    assetRow.style.marginBottom = 'var(--space-md)';
    
    // Store asset ID if editing existing asset
    const assetIdField = existingAsset ? `<input type="hidden" class="asset-id" value="${existingAsset.id}">` : '';
    
    assetRow.innerHTML = `
        <div class="card-header">
            <h4 class="card-title">Asset ${editAssetRowCounter}</h4>
            <button type="button" class="btn-icon" onclick="removeEditAssetRow('${rowId}')" title="Remove">
                ❌
            </button>
        </div>
        
        ${assetIdField}
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Asset Name *</label>
                <input type="text" class="input-field edit-asset-name" placeholder="e.g., VOO, Bitcoin" value="${existingAsset ? existingAsset.name : ''}" required />
            </div>
            
            <div class="form-group">
                <label class="form-label">Ticker/Symbol</label>
                <input type="text" class="input-field edit-asset-ticker" placeholder="e.g., VOO, BTC" value="${existingAsset ? existingAsset.ticker : ''}" />
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Asset Type *</label>
                <select class="select-field edit-asset-type" required>
                    <option value="">Select Type</option>
                    <option value="stock" ${existingAsset && existingAsset.type === 'stock' ? 'selected' : ''}>Stock</option>
                    <option value="etf" ${existingAsset && existingAsset.type === 'etf' ? 'selected' : ''}>ETF</option>
                    <option value="mutual_fund" ${existingAsset && existingAsset.type === 'mutual_fund' ? 'selected' : ''}>Mutual Fund</option>
                    <option value="crypto" ${existingAsset && existingAsset.type === 'crypto' ? 'selected' : ''}>Cryptocurrency</option>
                    <option value="gold" ${existingAsset && existingAsset.type === 'gold' ? 'selected' : ''}>Gold</option>
                    <option value="bond" ${existingAsset && existingAsset.type === 'bond' ? 'selected' : ''}>Bond</option>
                    <option value="reit" ${existingAsset && existingAsset.type === 'reit' ? 'selected' : ''}>REIT</option>
                    <option value="thb_savings" ${existingAsset && existingAsset.type === 'thb_savings' ? 'selected' : ''}>THB Savings Account</option>
                    <option value="fcd_account" ${existingAsset && existingAsset.type === 'fcd_account' ? 'selected' : ''}>FCD Account (USD)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Currency</label>
                <select class="select-field edit-asset-currency">
                    <option value="THB" ${!existingAsset || existingAsset.currency === 'THB' ? 'selected' : ''}>THB</option>
                    <option value="USD" ${existingAsset && existingAsset.currency === 'USD' ? 'selected' : ''}>USD</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Allocation %</label>
                <input type="number" class="input-field edit-asset-allocation" placeholder="0 (optional for savings)" min="0" max="100" step="0.01" value="${existingAsset ? existingAsset.allocation : ''}" onchange="updateEditAllocationTotal()" />
            </div>
            
            <div class="form-group">
                <label class="form-label">Expected Return %</label>
                <input type="number" class="input-field edit-asset-return" placeholder="0" step="0.01" value="${existingAsset ? existingAsset.expectedReturn : ''}" />
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Risk Level</label>
                <select class="select-field edit-asset-risk">
                    <option value="low" ${existingAsset && existingAsset.riskLevel === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${!existingAsset || existingAsset.riskLevel === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${existingAsset && existingAsset.riskLevel === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Platform/Broker</label>
                <input type="text" class="input-field edit-asset-platform" placeholder="e.g., Dime, SCB" value="${existingAsset ? existingAsset.platform || '' : ''}" />
            </div>
        </div>
    `;
    
    assetsList.appendChild(assetRow);
    
    // If existing asset with linked account, populate the dropdown
    if (existingAsset && existingAsset.linkedAccountId) {
        setTimeout(() => {
            updateEditAccountLinkingOptions(rowId);
            const accountSelect = document.querySelector(`#${rowId} .edit-asset-linked-account`);
            if (accountSelect) {
                accountSelect.value = existingAsset.linkedAccountId;
            }
        }, 100);
    } else if (existingAsset && (existingAsset.type === 'thb_savings' || existingAsset.type === 'fcd_account')) {
        // Load account options for savings types even if not currently linked
        setTimeout(() => updateEditAccountLinkingOptions(rowId), 100);
    }
    
    updateEditAllocationTotal();
};

window.toggleEditAccountLinking = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const assetType = row.querySelector('.edit-asset-type').value;
    const linkingSection = row.querySelector('.edit-account-linking-section');
    
    // Show linking section only for savings account types
    if (assetType === 'thb_savings' || assetType === 'fcd_account') {
        linkingSection.style.display = 'block';
        
        // Auto-set currency based on account type
        const currencySelect = row.querySelector('.edit-asset-currency');
        if (assetType === 'fcd_account') {
            currencySelect.value = 'USD';
        } else {
            currencySelect.value = 'THB';
        }
        
        // Load account options
        updateEditAccountLinkingOptions(rowId);
    } else {
        linkingSection.style.display = 'none';
    }
};

window.updateEditAccountLinkingOptions = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const portfolioId = currentEditPortfolioId;
    const currency = row.querySelector('.edit-asset-currency').value;
    const accountSelect = row.querySelector('.edit-asset-linked-account');
    
    if (!accountSelect || !portfolioId) return;
    
    // Get all accounts with matching currency
    const allAccounts = AccountManager.getAllAccounts();
    const matchingAccounts = allAccounts.filter(acc => 
        acc.currency === currency && acc.portfolioId === portfolioId
    );
    
    accountSelect.innerHTML = '<option value="">No Link (Manual Entry)</option>' +
        matchingAccounts.map(acc => 
            `<option value="${acc.id}">${acc.name} - ${Utils.formatCurrency(acc.balance, acc.currency)}</option>`
        ).join('');
};

window.removeEditAssetRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updateEditAllocationTotal();
    }
};

window.updateEditAllocationTotal = function() {
    const allocationInputs = document.querySelectorAll('.edit-asset-allocation');
    let total = 0;
    
    allocationInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    const totalElement = document.getElementById('editTotalAllocation');
    const statusElement = document.getElementById('editAllocationStatus');
    
    totalElement.textContent = total.toFixed(2) + '%';
    
    // Update status color
    if (Math.abs(total - 100) < 0.01) {
        statusElement.className = 'alert alert-success';
    } else if (total > 100) {
        statusElement.className = 'alert alert-danger';
    } else {
        statusElement.className = 'alert alert-warning';
    }
};

function renderPortfolioDetail(portfolio) {
    const contentDiv = document.getElementById('portfolioDetailContent');
    
    // Get as-of-date from global setting
    const asOfDate = App.getAsOfDate();
    
    // Get portfolio data
    const positions = TransactionManager.getPortfolioPositions(portfolio.id);
    const stats = TransactionManager.calculatePortfolioStats(portfolio.id);
    const accounts = AccountManager.getAllAccounts().filter(acc => acc.portfolioId === portfolio.id);
    
    // Filter transactions by as-of-date
    const allTransactions = TransactionManager.getTransactions({ portfolioId: portfolio.id });
    const filteredTransactions = Utils.filterTransactionsByAsOfDate(allTransactions, asOfDate);
    const recentTransactions = filteredTransactions.slice(0, 10); // Last 10 transactions
    
    // Calculate total portfolio value (respecting as-of-date)
    let totalValue = 0;
    const assetDetails = portfolio.assets.map(asset => {
        let quantity = 0;
        let currentPrice = 0;
        let assetValue = 0;
        let priceData = null;
        let linkedAccounts = [];
        
        // Check if this is a savings asset type - use REVERSE LOOKUP
        if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
            // Find accounts linked to this asset
            linkedAccounts = accounts.filter(acc => 
                acc.linkedAssetId === asset.id || 
                (acc.linkedAssetType === asset.type && acc.linkedAssetName === asset.name)
            );
            
            if (linkedAccounts.length > 0) {
                // Sum all linked account balances AS OF DATE
                assetValue = linkedAccounts.reduce((sum, acc) => {
                    const balanceAsOfDate = AccountManager.calculateBalanceAsOfDate(acc.id, asOfDate);
                    return sum + balanceAsOfDate;
                }, 0);
                quantity = linkedAccounts.length; // Number of linked accounts
                currentPrice = assetValue / quantity; // Average balance per account
            }
        } else {
            // Regular asset - use positions and prices (calculated from filtered transactions)
            // We need to recalculate positions based on as-of-date transactions
            const assetTransactions = filteredTransactions.filter(txn => txn.assetId === asset.id);
            
            let totalQuantity = 0;
            assetTransactions.forEach(txn => {
                if (txn.type === 'BUY') {
                    totalQuantity += txn.quantity;
                } else if (txn.type === 'SELL') {
                    totalQuantity -= txn.quantity;
                }
            });
            
            quantity = totalQuantity;
            priceData = PriceManager.getCurrentPrice(asset.id);
            currentPrice = priceData ? priceData.price : 0;
            assetValue = quantity * currentPrice;
        }
        
        totalValue += assetValue;
        
        return {
            ...asset,
            quantity,
            currentPrice,
            priceData,
            value: assetValue,
            linkedAccounts
        };
    });
    
    // Calculate actual allocations
    assetDetails.forEach(asset => {
        asset.actualAllocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
    });
    
    const riskDist = PortfolioManager.calculateRiskDistribution(portfolio.assets);
    
    // Build HTML content
    contentDiv.innerHTML = `
        <!-- Rebalancing Section -->
        <div style="margin-bottom: var(--space-lg);">
            <button class="btn-primary" onclick="closePortfolioDetailModal(); showRebalancingModal('${portfolio.id}');" style="width: 100%;">
                🔄 Rebalance Portfolio
            </button>
        </div>
        
        <!-- Portfolio Overview -->
        <div class="card" style="margin-bottom: var(--space-lg);">
            <h4 style="margin-bottom: var(--space-md);">Portfolio Overview</h4>
            
            ${portfolio.description ? `
                <p style="color: var(--color-text-secondary); margin-bottom: var(--space-lg);">
                    ${portfolio.description}
                </p>
            ` : ''}
            
            <div class="dashboard-grid" style="gap: var(--space-md);">
                <div style="text-align: center; padding: var(--space-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                    <div style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 4px;">Total Value</div>
                    <div style="font-size: 28px; font-weight: 600; color: var(--color-primary);">
                        ${Utils.formatCurrency(totalValue, 'THB')}
                    </div>
                </div>
                
                <div style="text-align: center; padding: var(--space-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                    <div style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 4px;">Expected Return</div>
                    <div style="font-size: 28px; font-weight: 600; color: var(--color-success);">
                        ${portfolio.weightedReturn}%
                    </div>
                </div>
                
                <div style="text-align: center; padding: var(--space-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                    <div style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 4px;">Risk Distribution</div>
                    <div style="font-size: 14px; font-weight: 600; margin-top: 8px;">
                        <span style="color: var(--color-success);">Low ${riskDist.low}%</span> • 
                        <span style="color: var(--color-warning);">Med ${riskDist.medium}%</span> • 
                        <span style="color: var(--color-danger);">High ${riskDist.high}%</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Assets Section -->
        <div class="card" style="margin-bottom: var(--space-lg);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                <h4>Assets (${portfolio.assets.length})</h4>
                <button class="btn-secondary btn-sm" onclick="showRecordTransactionModal(); closePortfolioDetailModal();">
                    ➕ Add Transaction
                </button>
            </div>
            
            <div style="display: grid; gap: var(--space-md);">
                ${assetDetails.map(asset => `
                    <div style="padding: var(--space-md); background: var(--color-bg-secondary); border-radius: var(--radius-md); ${asset.linkedAccounts && asset.linkedAccounts.length > 0 ? 'border-left: 4px solid var(--color-primary);' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-sm);">
                            <div>
                                <div style="font-weight: 600; font-size: 16px;">${asset.name}</div>
                                <div style="font-size: 14px; color: var(--color-text-secondary);">
                                    ${asset.ticker} • ${asset.type.replace('_', ' ').toUpperCase()} • ${asset.platform || 'No platform'}
                                </div>
                                ${asset.linkedAccounts && asset.linkedAccounts.length > 0 ? `
                                    <div style="margin-top: 4px; font-size: 12px; color: var(--color-primary);">
                                        🔗 Linked: ${asset.linkedAccounts.map(acc => acc.name).join(', ')} (${asset.linkedAccounts.length} account${asset.linkedAccounts.length > 1 ? 's' : ''})
                                    </div>
                                ` : ''}
                            </div>
                            <span class="status-badge ${asset.riskLevel === 'low' ? 'status-success' : asset.riskLevel === 'high' ? 'status-danger' : 'status-warning'}">
                                ${asset.riskLevel.toUpperCase()}
                            </span>
                        </div>
                        
                        <!-- Allocation Progress Bar -->
                        <div style="margin: var(--space-md) 0;">
                            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                                <span>Target: ${asset.allocation}%</span>
                                <span style="color: ${Math.abs(asset.actualAllocation - asset.allocation) > 5 ? 'var(--color-warning)' : 'var(--color-success)'};">
                                    Actual: ${asset.actualAllocation.toFixed(1)}%
                                </span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${Math.min(asset.actualAllocation, 100)}%; height: 100%; background: ${Math.abs(asset.actualAllocation - asset.allocation) > 5 ? 'var(--color-warning)' : 'var(--color-primary)'}; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        
                        <!-- Holdings Info -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); padding: var(--space-sm) 0; border-top: 1px solid var(--color-border);">
                            <div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">
                                    ${asset.linkedAccounts && asset.linkedAccounts.length > 0 ? 'Accounts' : 'Holdings'}
                                </div>
                                <div style="font-weight: 600;">
                                    ${asset.linkedAccounts && asset.linkedAccounts.length > 0 ? 
                                        `${asset.linkedAccounts.length} account${asset.linkedAccounts.length > 1 ? 's' : ''}` : 
                                        `${asset.quantity.toFixed(4)} shares`}
                                </div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">
                                    ${asset.linkedAccounts && asset.linkedAccounts.length > 0 ? 'Avg Balance' : 'Current Price'}
                                </div>
                                <div style="font-weight: 600; color: ${asset.priceData || (asset.linkedAccounts && asset.linkedAccounts.length > 0) ? 'var(--color-success)' : 'var(--color-text-secondary)'};">
                                    ${asset.linkedAccounts && asset.linkedAccounts.length > 0 ? 
                                        Utils.formatCurrency(asset.currentPrice, asset.currency) :
                                        asset.priceData ? Utils.formatCurrency(asset.currentPrice, asset.priceData.currency) : 'Not set'}
                                </div>
                                ${asset.priceData && !(asset.linkedAccounts && asset.linkedAccounts.length > 0) ? `<div style="font-size: 10px; color: var(--color-text-secondary);">${PriceManager.getTimeSinceUpdate(asset.id)}</div>` : ''}
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">Total Value</div>
                                <div style="font-weight: 600; color: var(--color-primary);">
                                    ${Utils.formatCurrency(asset.value, asset.currency)}
                                </div>
                            </div>
                        </div>
                        
                        <button class="btn-secondary btn-sm" onclick="showManualPriceModal('${asset.id}', '${asset.name}', '${asset.currency}')" style="width: 100%; margin-top: var(--space-sm);">
                            ${asset.priceData ? 'Update Price' : 'Set Price'}
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Linked Accounts Section -->
        ${accounts.length > 0 ? `
            <div class="card" style="margin-bottom: var(--space-lg);">
                <h4 style="margin-bottom: var(--space-md);">Linked Accounts (${accounts.length})</h4>
                
                <div style="display: grid; gap: var(--space-md);">
                    ${accounts.map(account => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                            <div>
                                <div style="font-weight: 600;">${account.name}</div>
                                <div style="font-size: 14px; color: var(--color-text-secondary);">
                                    ${account.institution || 'No institution'} ${account.accountNumber ? '• ' + account.accountNumber : ''}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 20px; font-weight: 600; color: var(--color-primary);">
                                    ${Utils.formatCurrency(account.balance, account.currency)}
                                </div>
                                <span class="status-badge ${account.type === 'fcd_account' ? 'status-info' : 'status-success'}">
                                    ${account.type === 'fcd_account' ? 'FCD' : 'THB'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <!-- Recent Transactions Section -->
        ${recentTransactions.length > 0 ? `
            <div class="card">
                <h4 style="margin-bottom: var(--space-md);">Recent Transactions (Last 10)</h4>
                
                <div style="display: grid; gap: var(--space-sm);">
                    ${recentTransactions.map(txn => {
                        const account = txn.accountId ? AccountManager.getAccount(txn.accountId) : null;
                        const typeIcons = {
                            BUY: '🛒',
                            SELL: '💵',
                            DIVIDEND: '💰',
                            DEPOSIT: '⬇️',
                            WITHDRAW: '⬆️',
                            INTEREST: '💎',
                            TRANSFER: '🔄'
                        };
                        
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <span style="font-size: 18px;">${typeIcons[txn.type] || '📝'}</span>
                                        <span style="font-weight: 600; font-size: 14px;">${txn.type}</span>
                                        ${txn.assetTicker ? `<span class="status-badge status-info" style="font-size: 11px;">${txn.assetTicker}</span>` : ''}
                                    </div>
                                    <div style="font-size: 12px; color: var(--color-text-secondary);">
                                        ${txn.assetName || txn.description || 'Transaction'}
                                        ${account ? ` • ${account.name}` : ''}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; color: ${txn.type === 'TRANSFER' ? 'var(--color-text-secondary)' : txn.type === 'SELL' || txn.type === 'DIVIDEND' || txn.type === 'DEPOSIT' || txn.type === 'INTEREST' ? 'var(--color-success)' : 'var(--color-danger)'};">
                                        ${txn.type === 'TRANSFER' ? Utils.formatCurrency(txn.totalAmount, txn.currency) + ' → ' + Utils.formatCurrency(txn.destinationAmount || txn.totalAmount, txn.destinationCurrency || txn.currency) : (txn.type === 'SELL' || txn.type === 'DIVIDEND' || txn.type === 'DEPOSIT' || txn.type === 'INTEREST' ? '+' : '-') + Utils.formatCurrency(txn.totalAmount, txn.currency)}
                                    </div>
                                    <div style="font-size: 12px; color: var(--color-text-secondary);">
                                        ${Utils.formatDate(txn.date, 'short')}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="margin-top: var(--space-md); text-align: center;">
                    <button class="btn-link" onclick="closePortfolioDetailModal(); navigateToPage('transactions'); document.getElementById('filterPortfolio').value = '${portfolio.id}'; App.loadTransactions();">
                        View All Transactions →
                    </button>
                </div>
            </div>
        ` : `
            <div class="card">
                <h4 style="margin-bottom: var(--space-md);">Recent Transactions</h4>
                <div style="text-align: center; padding: var(--space-xl); color: var(--color-text-secondary);">
                    No transactions yet for this portfolio
                </div>
            </div>
        `}
    `;
}

window.showCreatePortfolioModal = function() {
    Utils.toggleElement('#createPortfolioModal', true);
    document.getElementById('assetsList').innerHTML = '';
    document.getElementById('portfolioName').value = '';
    document.getElementById('portfolioDescription').value = '';
    // Add first asset row
    addAssetRow();
    updateAllocationTotal();
};

window.closeCreatePortfolioModal = function() {
    Utils.toggleElement('#createPortfolioModal', false);
};

let assetRowCounter = 0;

window.addAssetRow = function() {
    const assetsList = document.getElementById('assetsList');
    const rowId = `asset-${assetRowCounter++}`;
    
    const assetRow = document.createElement('div');
    assetRow.className = 'card';
    assetRow.id = rowId;
    assetRow.style.marginBottom = 'var(--space-md)';
    assetRow.innerHTML = `
        <div class="card-header">
            <h4 class="card-title">Asset ${assetRowCounter}</h4>
            <button type="button" class="btn-icon" onclick="removeAssetRow('${rowId}')" title="Remove">
                ❌
            </button>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Asset Name *</label>
                <input type="text" class="input-field asset-name" placeholder="e.g., VOO, Bitcoin" required />
            </div>
            
            <div class="form-group">
                <label class="form-label">Ticker/Symbol</label>
                <input type="text" class="input-field asset-ticker" placeholder="e.g., VOO, BTC" />
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Asset Type *</label>
                <select class="select-field asset-type" required>
                    <option value="">Select Type</option>
                    <option value="stock">Stock</option>
                    <option value="etf">ETF</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="gold">Gold</option>
                    <option value="bond">Bond</option>
                    <option value="reit">REIT</option>
                    <option value="thb_savings">THB Savings Account</option>
                    <option value="fcd_account">FCD Account (USD)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Currency</label>
                <select class="select-field asset-currency">
                    <option value="THB">THB</option>
                    <option value="USD">USD</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Allocation %</label>
                <input type="number" class="input-field asset-allocation" placeholder="0 (optional for savings)" min="0" max="100" step="0.01" onchange="updateAllocationTotal()" />
            </div>
            
            <div class="form-group">
                <label class="form-label">Expected Return %</label>
                <input type="number" class="input-field asset-return" placeholder="0" step="0.01" />
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Risk Level</label>
                <select class="select-field asset-risk">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Platform/Broker</label>
                <input type="text" class="input-field asset-platform" placeholder="e.g., Dime, SCB" />
            </div>
        </div>
    `;
    
    assetsList.appendChild(assetRow);
    updateAllocationTotal();
};

window.toggleAccountLinking = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const assetType = row.querySelector('.asset-type').value;
    const linkingSection = row.querySelector('.account-linking-section');
    
    // Show linking section only for savings account types
    if (assetType === 'thb_savings' || assetType === 'fcd_account') {
        linkingSection.style.display = 'block';
        
        // Auto-set currency based on account type
        const currencySelect = row.querySelector('.asset-currency');
        if (assetType === 'fcd_account') {
            currencySelect.value = 'USD';
        } else {
            currencySelect.value = 'THB';
        }
        
        // Load account options
        updateAccountLinkingOptions(rowId);
    } else {
        linkingSection.style.display = 'none';
    }
};

window.updateAccountLinkingOptions = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const portfolioId = document.getElementById('accountPortfolio')?.value;
    const currency = row.querySelector('.asset-currency').value;
    const assetType = row.querySelector('.asset-type').value;
    const accountSelect = row.querySelector('.asset-linked-account');
    
    if (!accountSelect) return;
    
    // Get all accounts with matching currency AND type
    const allAccounts = AccountManager.getAllAccounts();
    const matchingAccounts = allAccounts.filter(acc => {
        // Must match currency
        if (acc.currency !== currency) {
            return false;
        }
        
        // Must match type
        if (acc.type !== assetType) {
            return false;
        }
        
        // If portfolio is selected, must match portfolio
        if (portfolioId && acc.portfolioId !== portfolioId) {
            return false;
        }
        
        return true;
    });
    
    accountSelect.innerHTML = '<option value="">No Link (Manual Entry)</option>' +
        matchingAccounts.map(acc => 
            `<option value="${acc.id}">${acc.name} - ${Utils.formatCurrency(acc.balance, acc.currency)}</option>`
        ).join('');
};

window.removeAssetRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updateAllocationTotal();
    }
};

window.updateAllocationTotal = function() {
    const allocationInputs = document.querySelectorAll('.asset-allocation');
    let total = 0;
    
    allocationInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    const totalElement = document.getElementById('totalAllocation');
    const statusElement = document.getElementById('allocationStatus');
    
    totalElement.textContent = total.toFixed(2) + '%';
    
    // Update status color
    if (Math.abs(total - 100) < 0.01) {
        statusElement.className = 'alert alert-success';
    } else if (total > 100) {
        statusElement.className = 'alert alert-danger';
    } else {
        statusElement.className = 'alert alert-warning';
    }
};

// Initialize app and setup all event handlers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Setting up application...');

    // Clear initialization flag on page load to allow re-init after reload
    // This prevents blank pages when browser restores sessionStorage after reload
    sessionStorage.removeItem('appInitialized');

    // NOTE: App.init() is now called by AuthManager.unlock() after cloud sync
    // Fallback for page refresh while logged in
    setTimeout(() => {
        if (sessionStorage.getItem('sessionActive') === 'true' &&
            !sessionStorage.getItem('appInitialized')) {
            console.log('Session active but app not initialized - initializing now');
            App.init();
        }
    }, 500);

    // Setup Google Drive Upload button
    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
        uploadButton.addEventListener('click', async () => {
            const uploadStatus = document.getElementById('uploadStatus');

            try {
                // Show uploading status
                if (uploadStatus) {
                    uploadStatus.className = 'sync-status syncing';
                }
                uploadButton.disabled = true;

                // Upload to Google Drive
                const success = await StorageManager.syncToCloud();

                // Update status
                if (success && uploadStatus) {
                    uploadStatus.className = 'sync-status synced';
                    setTimeout(() => {
                        uploadStatus.className = 'sync-status';
                    }, 3000);
                }

            } catch (error) {
                console.error('Upload error:', error);
                if (uploadStatus) {
                    uploadStatus.className = 'sync-status offline';
                }
            } finally {
                uploadButton.disabled = false;
            }
        });
    }

    // Setup Google Drive Download button
    const downloadButton = document.getElementById('downloadButton');
    if (downloadButton) {
        downloadButton.addEventListener('click', async () => {
            const downloadStatus = document.getElementById('downloadStatus');

            // Show confirmation dialog
            const confirmed = confirm(
                'Download from Cloud?\n\n' +
                'This will overwrite your local data with data from Google Drive.\n\n' +
                'Continue?'
            );

            if (!confirmed) {
                return;
            }

            try {
                // Show downloading status
                if (downloadStatus) {
                    downloadStatus.className = 'sync-status syncing';
                }
                downloadButton.disabled = true;

                // Download from Google Drive
                const success = await StorageManager.loadFromCloud(false, false);

                // Update status and reload page
                if (success) {
                    Utils.showNotification('Data downloaded from cloud. Reloading...', 'success');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }

            } catch (error) {
                console.error('Download error:', error);
                if (downloadStatus) {
                    downloadStatus.className = 'sync-status offline';
                }
                Utils.showNotification('Failed to download from cloud', 'error');
            } finally {
                downloadButton.disabled = false;
            }
        });
    }

    // Setup portfolio form handler
    const createPortfolioForm = document.getElementById('createPortfolioForm');
    if (createPortfolioForm) {
        createPortfolioForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Collect form data
                const name = document.getElementById('portfolioName').value;
                const description = document.getElementById('portfolioDescription').value;
                
                // Collect assets
                const assetRows = document.querySelectorAll('#assetsList .card');
                const assets = [];
                
                assetRows.forEach(row => {
                    const asset = {
                        name: row.querySelector('.asset-name').value,
                        ticker: row.querySelector('.asset-ticker').value || row.querySelector('.asset-name').value,
                        type: row.querySelector('.asset-type').value,
                        currency: row.querySelector('.asset-currency').value,
                        allocation: parseFloat(row.querySelector('.asset-allocation').value) || 0,
                        expectedReturn: parseFloat(row.querySelector('.asset-return').value) || 0,
                        riskLevel: row.querySelector('.asset-risk').value,
                        platform: row.querySelector('.asset-platform').value
                    };
                    
                    // Validate: Non-savings assets MUST have allocation > 0
                    const isSavingsType = asset.type === 'thb_savings' || asset.type === 'fcd_account';
                    
                    if (!asset.name || !asset.type) {
                        throw new Error('All assets must have a name and type');
                    }
                    
                    if (!isSavingsType && asset.allocation <= 0) {
                        throw new Error(`Asset "${asset.name}" must have allocation > 0% (non-savings assets require allocation)`);
                    }
                    
                    assets.push(asset);
                });
                
                if (assets.length === 0) {
                    Utils.showNotification('Please add at least one asset', 'error');
                    return;
                }
                
                // Create portfolio
                const portfolioData = { name, description, assets };
                PortfolioManager.createPortfolio(portfolioData);
                
                // Close modal and reload
                closeCreatePortfolioModal();
                App.loadPortfolios();
                
            } catch (error) {
                console.error('Error creating portfolio:', error);
                Utils.showNotification(error.message, 'error');
            }
        });
    }
    
    // Setup account form handlers
    setupAccountFormHandlers();
    
    // Setup edit portfolio form handler
    const editPortfolioForm = document.getElementById('editPortfolioForm');
    if (editPortfolioForm) {
        editPortfolioForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const portfolioId = document.getElementById('editPortfolioId').value;
                const name = document.getElementById('editPortfolioName').value;
                const description = document.getElementById('editPortfolioDescription').value;
                
                // Collect assets
                const assetRows = document.querySelectorAll('#editAssetsList .card');
                const assets = [];
                
                assetRows.forEach(row => {
                    const assetIdInput = row.querySelector('.asset-id');
                    
                    const asset = {
                        id: assetIdInput ? assetIdInput.value : Utils.generateId(), // Preserve ID or generate new
                        name: row.querySelector('.edit-asset-name').value,
                        ticker: row.querySelector('.edit-asset-ticker').value || row.querySelector('.edit-asset-name').value,
                        type: row.querySelector('.edit-asset-type').value,
                        currency: row.querySelector('.edit-asset-currency').value,
                        allocation: parseFloat(row.querySelector('.edit-asset-allocation').value) || 0,
                        expectedReturn: parseFloat(row.querySelector('.edit-asset-return').value) || 0,
                        riskLevel: row.querySelector('.edit-asset-risk').value,
                        platform: row.querySelector('.edit-asset-platform').value
                    };
                    
                    // Validate: Non-savings assets MUST have allocation > 0
                    const isSavingsType = asset.type === 'thb_savings' || asset.type === 'fcd_account';
                    
                    if (!asset.name || !asset.type) {
                        throw new Error('All assets must have a name and type');
                    }
                    
                    if (!isSavingsType && asset.allocation <= 0) {
                        throw new Error(`Asset "${asset.name}" must have allocation > 0% (non-savings assets require allocation)`);
                    }
                    
                    assets.push(asset);
                });
                
                if (assets.length === 0) {
                    Utils.showNotification('Please add at least one asset', 'error');
                    return;
                }
                
                // Update portfolio
                const updates = {
                    name,
                    description,
                    assets,
                    weightedReturn: PortfolioManager.calculateWeightedReturn(assets)
                };
                
                PortfolioManager.updatePortfolio(portfolioId, updates);
                
                // Close modal and reload
                closeEditPortfolioModal();
                App.loadPortfolios();
                
                // Show success notification
                Utils.showNotification('Portfolio updated successfully!', 'success');
                
            } catch (error) {
                console.error('Error updating portfolio:', error);
                Utils.showNotification(error.message, 'error');
            }
        });
    }
});

// Setup account form handlers function
function setupAccountFormHandlers() {
    const createAccountForm = document.getElementById('createAccountForm');
    if (createAccountForm) {
        createAccountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            try {
                const portfolioId = document.getElementById('accountPortfolio').value;
                const accountType = document.getElementById('accountType').value;
                
                // Validate portfolio selection
                if (!portfolioId) {
                    Utils.showNotification('Please select a portfolio for this account', 'error');
                    document.getElementById('accountPortfolio').focus();
                    return;
                }
                
                // Validate account type
                if (!accountType) {
                    Utils.showNotification('Please select an account type', 'error');
                    document.getElementById('accountType').focus();
                    return;
                }
                
                // Get linked asset info
                const linkedAssetSelect = document.getElementById('accountLinkedAsset');
                const linkedAssetId = linkedAssetSelect.value || null;
                let linkedAssetName = null;
                let linkedAssetType = null;
                
                if (linkedAssetId) {
                    const selectedOption = linkedAssetSelect.options[linkedAssetSelect.selectedIndex];
                    linkedAssetName = selectedOption.getAttribute('data-name');
                    linkedAssetType = selectedOption.getAttribute('data-type');
                }
                
                const accountData = {
                    portfolioId: portfolioId,
                    type: accountType,
                    name: document.getElementById('accountName').value,
                    institution: document.getElementById('accountInstitution').value,
                    accountNumber: document.getElementById('accountNumber').value,
                    initialBalance: parseFloat(document.getElementById('initialBalance').value) || 0,
                    notes: document.getElementById('accountNotes').value,
                    linkedAssetId: linkedAssetId,
                    linkedAssetName: linkedAssetName,
                    linkedAssetType: linkedAssetType
                };
                
                AccountManager.createAccount(accountData);
                closeCreateAccountModal();
                App.loadAccounts();
                
            } catch (error) {
                console.error('Error creating account:', error);
                Utils.showNotification(error.message, 'error');
            }
        });
    }
    
    // Handle account operation form submission
    const operationForm = document.getElementById('accountOperationForm');
    if (operationForm) {
        operationForm.addEventListener('submit', (e) => {
            e.preventDefault();

            try {
                const accountId = document.getElementById('operationAccountId').value;
                const operationType = document.getElementById('operationType').value;
                const amount = parseFloat(document.getElementById('operationAmount').value);
                const date = document.getElementById('operationDate').value;
                const description = document.getElementById('operationDescription').value;

                const account = AccountManager.getAccount(accountId);
                let exchangeRate = 1;

                // Get exchange rate from form if USD account
                if (account && account.currency === 'USD') {
                    const rateInput = document.getElementById('operationExchangeRate');
                    exchangeRate = rateInput && rateInput.value ? parseFloat(rateInput.value) : 1;
                }

                if (operationType === 'DEPOSIT') {
                    AccountManager.deposit(accountId, amount, description, date, exchangeRate);
                } else if (operationType === 'WITHDRAW') {
                    AccountManager.withdraw(accountId, amount, description, date);
                    // Note: WITHDRAW gets exchange rate from FIFO, user input is for reference/override
                } else if (operationType === 'INTEREST') {
                    AccountManager.recordInterestPayment(accountId, amount, date);
                }

                closeAccountOperationModal();
                App.loadAccounts();

            } catch (error) {
                console.error('Error processing operation:', error);
                Utils.showNotification(error.message, 'error');
            }
        });
    }
}

// Account Management Functions
window.showCreateAccountModal = function() {
    // Load portfolio options
    const portfolios = PortfolioManager.getAllPortfolios();
    const portfolioSelect = document.getElementById('accountPortfolio');
    
    if (portfolios.length === 0) {
        Utils.showNotification('Please create a portfolio first', 'error');
        navigateToPage('portfolios');
        return;
    }
    
    portfolioSelect.innerHTML = '<option value="">Select Portfolio</option>' +
        portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    // Reset form
    document.getElementById('createAccountForm').reset();
    document.getElementById('currencyIcon').textContent = 'THB';
    
    Utils.toggleElement('#createAccountModal', true);
};

window.closeCreateAccountModal = function() {
    Utils.toggleElement('#createAccountModal', false);
};

window.updateAccountCurrency = function() {
    const accountType = document.getElementById('accountType').value;
    const currencyIcon = document.getElementById('currencyIcon');
    
    if (accountType === 'fcd_account') {
        currencyIcon.textContent = 'USD';
    } else {
        currencyIcon.textContent = 'THB';
    }
};

window.loadAccountAssetOptions = function() {
    const portfolioId = document.getElementById('accountPortfolio').value;
    const accountType = document.getElementById('accountType').value;
    const assetSelect = document.getElementById('accountLinkedAsset');
    
    if (!portfolioId || !accountType) {
        assetSelect.innerHTML = '<option value="">Select Portfolio and Type First</option>';
        return;
    }
    
    // Get portfolio
    const portfolio = PortfolioManager.getPortfolio(portfolioId);
    if (!portfolio) {
        assetSelect.innerHTML = '<option value="">Portfolio Not Found</option>';
        return;
    }
    
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
    
    if (matchingAssets.length === 0) {
        assetSelect.innerHTML = '<option value="">No Matching Assets (Create asset in portfolio first)</option>';
        Utils.showNotification(
            `No ${accountType === 'thb_savings' ? 'THB Savings' : 'FCD'} assets found in this portfolio. Create the asset in the portfolio first if you want to link.`,
            'info'
        );
        return;
    }
    
    // Populate dropdown with matching assets
    assetSelect.innerHTML = '<option value="">No Link (Standalone Account)</option>' +
        matchingAssets.map(asset => 
            `<option value="${asset.id}" data-name="${asset.name}" data-type="${asset.type}">
                ${asset.name} (${asset.allocation}% allocation)
            </option>`
        ).join('');
};

window.showDepositModal = function(accountId) {
    console.log('🟢 showDepositModal called with accountId:', accountId);

    const account = AccountManager.getAccount(accountId);
    console.log('🟢 Account retrieved:', account);

    if (!account) {
        console.error('❌ Account not found! accountId:', accountId);
        return;
    }

    console.log('🟢 Populating form fields...');
    document.getElementById('operationTitle').textContent = 'Deposit Money';
    document.getElementById('operationAccountId').value = accountId;
    document.getElementById('operationType').value = 'DEPOSIT';
    document.getElementById('operationCurrency').textContent = account.currency;
    document.getElementById('operationAmount').value = '';
    document.getElementById('operationDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('operationDescription').value = 'Deposit';

    // Show/hide exchange rate field for USD accounts
    const exchangeRateGroup = document.getElementById('operationExchangeRateGroup');
    if (account.currency === 'USD') {
        exchangeRateGroup.style.display = 'block';
        const currentRate = window.getExchangeRate ? window.getExchangeRate() : 1;
        document.getElementById('operationExchangeRate').value = currentRate.toFixed(4);
        document.getElementById('operationExchangeRate').required = true;
    } else {
        exchangeRateGroup.style.display = 'none';
        document.getElementById('operationExchangeRate').required = false;
    }

    console.log('🟢 About to show modal #accountOperationModal');
    const modalElement = document.getElementById('accountOperationModal');
    console.log('🟢 Modal element found:', modalElement);
    console.log('🟢 Modal current classes:', modalElement ? modalElement.className : 'NOT FOUND');

    Utils.toggleElement('#accountOperationModal', true);

    console.log('🟢 toggleElement called, modal should be visible now');
    console.log('🟢 Modal classes after toggle:', modalElement ? modalElement.className : 'NOT FOUND');
};

window.showWithdrawModal = function(accountId) {
    const account = AccountManager.getAccount(accountId);
    if (!account) return;

    document.getElementById('operationTitle').textContent = 'Withdraw Money';
    document.getElementById('operationAccountId').value = accountId;
    document.getElementById('operationType').value = 'WITHDRAW';
    document.getElementById('operationCurrency').textContent = account.currency;
    document.getElementById('operationAmount').value = '';
    document.getElementById('operationDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('operationDescription').value = 'Withdrawal';

    // Show/hide exchange rate field for USD accounts
    const exchangeRateGroup = document.getElementById('operationExchangeRateGroup');
    if (account.currency === 'USD' && window.FIFOManager) {
        exchangeRateGroup.style.display = 'block';

        // Auto-populate with FIFO weighted average rate
        const lots = FIFOManager.getAllLots().filter(lot =>
            lot.portfolioId === account.portfolioId &&
            lot.currency === 'USD' &&
            lot.remainingQuantity > 0
        );

        if (lots.length > 0) {
            const totalQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
            const weightedRate = lots.reduce((sum, lot) =>
                sum + (lot.exchangeRate * lot.remainingQuantity), 0) / totalQuantity;

            document.getElementById('operationExchangeRate').value = weightedRate.toFixed(4);
            console.log(`Auto-populated WITHDRAW exchange rate: ${weightedRate.toFixed(4)}`);
        }
        document.getElementById('operationExchangeRate').required = true;
    } else {
        exchangeRateGroup.style.display = 'none';
        document.getElementById('operationExchangeRate').required = false;
    }

    Utils.toggleElement('#accountOperationModal', true);
};

window.showInterestModal = function(accountId) {
    const account = AccountManager.getAccount(accountId);
    if (!account) return;
    
    // Calculate estimated interest for 6 months
    const estimatedInterest = AccountManager.getEstimatedInterest(accountId, 180);
    
    document.getElementById('operationTitle').textContent = 'Record Interest Payment';
    document.getElementById('operationAccountId').value = accountId;
    document.getElementById('operationType').value = 'INTEREST';
    document.getElementById('operationCurrency').textContent = account.currency;
    document.getElementById('operationAmount').value = estimatedInterest.toFixed(2);
    document.getElementById('operationDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('operationDescription').value = 'Interest payment';
    
    Utils.toggleElement('#accountOperationModal', true);
};

window.showTransferModal = function(accountId) {
    const account = AccountManager.getAccount(accountId);
    if (!account) {
        Utils.showNotification('Account not found', 'error');
        return;
    }

    // Get portfolio
    const portfolio = PortfolioManager.getPortfolio(account.portfolioId);
    if (!portfolio) {
        Utils.showNotification('Portfolio not found', 'error');
        return;
    }

    // Load portfolio options first (required before setting values)
    const portfolios = PortfolioManager.getAllPortfolios();
    const portfolioSelect = document.getElementById('txnPortfolio');

    if (portfolios.length === 0) {
        Utils.showNotification('Please create a portfolio first', 'error');
        return;
    }

    portfolioSelect.innerHTML = '<option value="">Select Portfolio</option>' +
        portfolios.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('');

    // Now set the form values
    document.getElementById('txnPortfolio').value = account.portfolioId;
    document.getElementById('txnType').value = 'TRANSFER';
    document.getElementById('txnDate').value = new Date().toISOString().split('T')[0];

    // Trigger portfolio change to load accounts
    updateTransactionAssets();

    // Set the source account after accounts are loaded
    document.getElementById('txnAccount').value = accountId;

    // Call updateTransactionFields to setup transfer-specific fields
    // This will trigger loadDestinationAccounts and show/hide fields appropriately
    updateTransactionFields();

    // Show the modal
    const modal = document.getElementById('recordTransactionModal');
    Utils.toggleElement(modal, true);
};

window.closeAccountOperationModal = function() {
    Utils.toggleElement('#accountOperationModal', false);
};

// Transaction Management Functions
window.showRecordTransactionModal = function() {
    // Reset edit mode
    isEditingTransaction = false;
    editingTransactionId = null;
    
    // Reset modal title
    const modalTitle = document.querySelector('#recordTransactionModal h3');
    if (modalTitle) {
        modalTitle.textContent = 'Record Transaction';
    }
    
    // Reset submit button
    const submitBtn = document.querySelector('#recordTransactionForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Record Transaction';
    }
    
    // RESTORE ORIGINAL HTML if it was modified during edit
    const portfolioGroup = document.getElementById('txnPortfolio')?.closest('.form-group');
    const typeGroup = document.getElementById('txnType')?.closest('.form-group');
    const accountGroup = document.getElementById('txnAccountGroup');
    
    // Check if HTML was replaced (look for hidden input instead of select)
    const portfolioSelect = document.getElementById('txnPortfolio');
    if (portfolioSelect && portfolioSelect.type === 'hidden') {
        // Restore portfolio dropdown
        portfolioGroup.innerHTML = `
            <label for="txnPortfolio" class="form-label">Portfolio *</label>
            <select id="txnPortfolio" class="select-field" required onchange="updateTransactionAssets()">
                <option value="">Select Portfolio</option>
            </select>
        `;
    }
    
    const typeSelect = document.getElementById('txnType');
    if (typeSelect && typeSelect.type === 'hidden') {
        // Restore transaction type dropdown
        typeGroup.innerHTML = `
            <label for="txnType" class="form-label">Transaction Type *</label>
            <select id="txnType" class="select-field" required onchange="updateTransactionFields()">
                <option value="">Select Type</option>
                <option value="BUY">Buy Asset</option>
                <option value="SELL">Sell Asset</option>
                <option value="DIVIDEND">Dividend</option>
                <option value="DEPOSIT">Deposit Money</option>
                <option value="WITHDRAW">Withdraw Money</option>
                <option value="INTEREST">Interest Payment</option>
                <option value="TRANSFER">Transfer Between Accounts</option>
            </select>
        `;
    }
    
    const accountSelect = document.getElementById('txnAccount');
    if (accountSelect && accountSelect.type === 'hidden') {
        // Restore account dropdown
        accountGroup.innerHTML = `
            <label for="txnAccount" class="form-label">From Account</label>
            <select id="txnAccount" class="select-field" onchange="updateTransactionCurrency()">
                <option value="">No Account (Manual)</option>
            </select>
            <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                Select account to auto-update balance
            </div>
        `;
    }
    
    // Load portfolio options
    const portfolios = PortfolioManager.getAllPortfolios();
    const restoredPortfolioSelect = document.getElementById('txnPortfolio');
    
    if (portfolios.length === 0) {
        Utils.showNotification('Please create a portfolio first', 'error');
        navigateToPage('portfolios');
        return;
    }
    
    restoredPortfolioSelect.innerHTML = '<option value="">Select Portfolio</option>' +
        portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    // Reset form
    document.getElementById('recordTransactionForm').reset();
    document.getElementById('txnDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('txnAssetGroup').style.display = 'none';
    document.getElementById('txnQuantityPriceRow').style.display = 'none';
    
    // Setup form submission
    setupTransactionFormHandler();
    
    Utils.toggleElement('#recordTransactionModal', true);
};

window.closeRecordTransactionModal = function() {
    // Reset edit mode
    isEditingTransaction = false;
    editingTransactionId = null;
    
    // Reset modal title
    const modalTitle = document.querySelector('#recordTransactionModal h3');
    if (modalTitle) {
        modalTitle.textContent = 'Record Transaction';
    }
    
    // Reset submit button
    const submitBtn = document.querySelector('#recordTransactionForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Record Transaction';
    }
    
    Utils.toggleElement('#recordTransactionModal', false);
};

// Transaction Edit Functions
let isEditingTransaction = false;
let editingTransactionId = null;
let originalPortfolioGroupHTML = null;
let originalTypeGroupHTML = null;
let originalAccountGroupHTML = null;

window.showEditTransactionModal = function(transactionId) {
    console.log('=== EDIT TRANSACTION MODAL OPENED ===');
    console.log('Transaction ID:', transactionId);
    
    const transaction = TransactionManager.getTransaction(transactionId);
    console.log('Transaction data:', transaction);
    
    if (!transaction) {
        Utils.showNotification('Transaction not found', 'error');
        return;
    }
    
    // Set edit mode
    isEditingTransaction = true;
    editingTransactionId = transactionId;
    
    // Change modal title
    const modalTitle = document.querySelector('#recordTransactionModal h3');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Transaction';
    }
    
    // Detect if this is an account-based transaction (DEPOSIT/WITHDRAW/INTEREST)
    const isAccountTransaction = ['DEPOSIT', 'WITHDRAW', 'INTEREST', 'INTEREST_CREDIT'].includes(transaction.type);
    
    // Get references to form groups
    const portfolioGroup = document.getElementById('txnPortfolio').closest('.form-group');
    const typeGroup = document.getElementById('txnType').closest('.form-group');
    const accountGroup = document.getElementById('txnAccountGroup');
    
    // ONLY show read-only fields if BOTH conditions are met:
    // 1. It's an account-based transaction (DEPOSIT/WITHDRAW/INTEREST)
    // 2. We're in EDIT mode (not creating a new transaction)
    if (isAccountTransaction && isEditingTransaction) {
        // For account-based transactions, show READ-ONLY display instead of dropdowns
        
        // Get portfolio name
        const portfolio = PortfolioManager.getPortfolio(transaction.portfolioId);
        const portfolioName = portfolio ? portfolio.name : 'Unknown Portfolio';
        
        // Get transaction type display name
        const typeDisplay = transaction.type === 'INTEREST_CREDIT' ? 'INTEREST' : transaction.type;
        
        // Get account name
        const account = transaction.accountId ? AccountManager.getAccount(transaction.accountId) : null;
        const accountDisplay = account ? `${account.name} - ${Utils.formatCurrency(account.balance, account.currency)}` : 'No Account';
        
        // Replace portfolio dropdown with read-only display
        portfolioGroup.innerHTML = `
            <label class="form-label">Portfolio</label>
            <div style="padding: 12px; background: var(--color-bg-secondary); border-radius: var(--radius-md); color: var(--color-text-secondary); font-weight: 500;">
                ${portfolioName}
            </div>
            <input type="hidden" id="txnPortfolio" value="${transaction.portfolioId}">
        `;
        
        // Replace transaction type dropdown with read-only display
        typeGroup.innerHTML = `
            <label class="form-label">Transaction Type</label>
            <div style="padding: 12px; background: var(--color-bg-secondary); border-radius: var(--radius-md); color: var(--color-text-secondary); font-weight: 500;">
                ${typeDisplay}
            </div>
            <input type="hidden" id="txnType" value="${typeDisplay}">
        `;
        
        // Replace account dropdown with read-only display
        accountGroup.innerHTML = `
            <label class="form-label">Account</label>
            <div style="padding: 12px; background: var(--color-bg-secondary); border-radius: var(--radius-md); color: var(--color-text-secondary); font-weight: 500;">
                ${accountDisplay}
            </div>
            <input type="hidden" id="txnAccount" value="${transaction.accountId || ''}">
        `;
        
        // Hide asset-related fields for account transactions
        const assetGroup = document.getElementById('txnAssetGroup');
        const quantityPriceRow = document.getElementById('txnQuantityPriceRow');
        if (assetGroup) assetGroup.style.display = 'none';
        if (quantityPriceRow) quantityPriceRow.style.display = 'none';
        
    } else {
        // For investment transactions (BUY/SELL/DIVIDEND), use normal dropdown behavior
        
        // STEP 1: Load portfolio options FIRST
        const portfolios = PortfolioManager.getAllPortfolios();
        const portfolioSelect = document.getElementById('txnPortfolio');
        
        portfolioSelect.innerHTML = '<option value="">Select Portfolio</option>' +
            portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        // STEP 2: Wait for dropdown to render, then set ALL values
        setTimeout(() => {
            // Set transaction type
            const formTransactionType = transaction.type === 'INTEREST_CREDIT' ? 'INTEREST' : transaction.type;
            document.getElementById('txnType').value = formTransactionType;
            console.log('Set transaction type to:', formTransactionType);
            
            // Update fields based on type
            updateTransactionFields();
            
            // Set portfolio value
            portfolioSelect.value = transaction.portfolioId;
            console.log('Set portfolio to:', transaction.portfolioId);
            console.log('Portfolio dropdown value:', portfolioSelect.value);

            // Load assets and accounts for this portfolio
            updateTransactionAssets();
            console.log('Called updateTransactionAssets()');

            // Wait for updateTransactionAssets to finish, then set asset and account values
            setTimeout(() => {
                if (transaction.assetId) {
                    const assetSelect = document.getElementById('txnAsset');
                    assetSelect.value = transaction.assetId;
                    console.log('Set asset to:', transaction.assetId);
                    console.log('Asset dropdown value:', assetSelect.value);
                    console.log('Asset dropdown options:', assetSelect.innerHTML.substring(0, 200));
                }

                if (transaction.accountId) {
                    const accountSelect = document.getElementById('txnAccount');
                    accountSelect.value = transaction.accountId;
                    console.log('Set account to:', transaction.accountId);
                    console.log('Account dropdown value:', accountSelect.value);
                    console.log('Account dropdown options:', accountSelect.innerHTML.substring(0, 200));
                }
            }, 400);
        }, 100);
    }
    
    if (isAccountTransaction) {
        // Handle account-based transactions (DEPOSIT/WITHDRAW/INTEREST)
        // These transactions were created from the account screen and have simpler structure
        
        // STEP 6: Wait longer for account dropdown to be fully populated before setting value
        setTimeout(() => {
            if (transaction.accountId) {
                const accountSelect = document.getElementById('txnAccount');
                accountSelect.value = transaction.accountId;
                console.log('Set account to:', transaction.accountId, 'Dropdown value now:', accountSelect.value);
                
                // Verify the value was set correctly
                if (accountSelect.value !== transaction.accountId) {
                    console.warn('Failed to set account value. Dropdown may not be populated yet.');
                }
            }
        }, 300);
        
        // These transaction types don't have asset, quantity, or price fields
        // The updateTransactionFields() call above already hides those fields
        
    } else if (transaction.type === 'TRANSFER') {
        // Handle TRANSFER transactions
        setTimeout(() => {
            document.getElementById('txnAccount').value = transaction.accountId || '';
            
            // Load destination accounts
            loadDestinationAccounts();
            
            setTimeout(() => {
                document.getElementById('txnDestinationAccount').value = transaction.destinationAccountId || '';
                
                if (transaction.exchangeRate) {
                    document.getElementById('txnExchangeRate').value = transaction.exchangeRate;
                }
                
                checkCrossCurrencyTransfer();
            }, 100);
        }, 200);
        
    } else {
        // Handle investment transactions (BUY/SELL/DIVIDEND created from transaction screen)
        setTimeout(() => {
            if (transaction.assetId) {
                document.getElementById('txnAsset').value = transaction.assetId;
                
                // Filter accounts after asset is set
                setTimeout(() => filterAccountsByCurrency(), 50);
            }
            
            if (transaction.accountId) {
                document.getElementById('txnAccount').value = transaction.accountId;
            }
            
            document.getElementById('txnQuantity').value = transaction.quantity || 0;
            document.getElementById('txnPrice').value = transaction.pricePerUnit || 0;
        }, 200);
    }
    
    // Common fields for all transaction types (set these immediately)
    document.getElementById('txnTotal').value = transaction.totalAmount || 0;
    document.getElementById('txnFee').value = transaction.fee || 0;
    document.getElementById('txnDate').value = transaction.date ? transaction.date.split('T')[0] : '';
    
    // Handle notes/description field - account transactions use 'description', others use 'notes'
    document.getElementById('txnNotes').value = transaction.notes || transaction.description || '';
    
    document.getElementById('txnCurrencyHidden').value = transaction.currency || 'THB';
    
    // Update currency displays
    const currencyDisplays = document.querySelectorAll('.txn-currency-display');
    currencyDisplays.forEach(el => {
        el.textContent = transaction.currency || 'THB';
    });
    
    // Change submit button text
    const submitBtn = document.querySelector('#recordTransactionForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Save Changes';
    }
    
    // Show modal
    Utils.toggleElement('#recordTransactionModal', true);
    
    // Setup form handler for edit
    setupEditTransactionFormHandler();
};

function setupEditTransactionFormHandler() {
    const form = document.getElementById('recordTransactionForm');
    
    // Remove existing listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new listener for edit
    document.getElementById('recordTransactionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!isEditingTransaction || !editingTransactionId) {
            Utils.showNotification('Error: Not in edit mode', 'error');
            return;
        }
        
        try {
            const getElementValue = (id, defaultValue = '') => {
                const el = document.getElementById(id);
                if (!el) {
                    console.warn(`Element not found: ${id}`);
                    return defaultValue;
                }
                return el.value;
            };
            
            const txnType = getElementValue('txnType');
            
            if (!txnType) {
                throw new Error('Transaction type is required');
            }
            
            let updates = {
                totalAmount: parseFloat(getElementValue('txnTotal', '0')) || 0,
                fee: parseFloat(getElementValue('txnFee', '0')) || 0,
                currency: getElementValue('txnCurrencyHidden', 'THB'),
                date: getElementValue('txnDate'),
                notes: getElementValue('txnNotes', '')
            };
            
            // Add type-specific fields
            if (txnType === 'TRANSFER') {
                updates.accountId = getElementValue('txnAccount');
                updates.destinationAccountId = getElementValue('txnDestinationAccount');
                
                const exchangeRateEl = document.getElementById('txnExchangeRate');
                updates.exchangeRate = exchangeRateEl ? (parseFloat(exchangeRateEl.value) || 1) : 1;
                
                if (!updates.accountId || !updates.destinationAccountId) {
                    throw new Error('Please select both source and destination accounts');
                }
            } else {
                // BUY/SELL/DIVIDEND transactions
                const assetSelect = document.getElementById('txnAsset');
                if (!assetSelect) {
                    throw new Error('Asset field not found');
                }
                
                const selectedAsset = assetSelect.options[assetSelect.selectedIndex];
                
                updates.assetId = assetSelect.value || null;
                updates.assetName = selectedAsset?.getAttribute('data-name') || '';
                updates.assetTicker = selectedAsset?.getAttribute('data-ticker') || '';
                updates.accountId = getElementValue('txnAccount') || null;
                updates.quantity = parseFloat(getElementValue('txnQuantity', '0')) || 0;
                updates.pricePerUnit = parseFloat(getElementValue('txnPrice', '0')) || 0;
            }
            
            console.log('Updating transaction with:', updates);
            
            // Update transaction
            const success = TransactionManager.updateTransaction(editingTransactionId, updates);
            
            if (success) {
                // Reset edit mode
                isEditingTransaction = false;
                editingTransactionId = null;
                
                // Reset modal title
                const modalTitle = document.querySelector('#recordTransactionModal h3');
                if (modalTitle) {
                    modalTitle.textContent = 'Record Transaction';
                }
                
                // Reset submit button
                const submitBtn = document.querySelector('#recordTransactionForm button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Record Transaction';
                }
                
                closeRecordTransactionModal();
                App.loadTransactions();
            } else {
                throw new Error('Failed to update transaction');
            }
            
        } catch (error) {
            console.error('Error updating transaction:', error);
            Utils.showNotification(error.message, 'error');
        }
    });
}

window.updateTransactionAssets = function() {
    const portfolioId = document.getElementById('txnPortfolio').value;
    const txnType = document.getElementById('txnType').value;
    const assetSelect = document.getElementById('txnAsset');
    const accountSelect = document.getElementById('txnAccount');

    console.log('updateTransactionAssets called with portfolioId:', portfolioId);

    if (!portfolioId) {
        console.log('No portfolio selected, clearing dropdowns');
        assetSelect.innerHTML = '<option value="">Select Portfolio First</option>';
        accountSelect.innerHTML = '<option value="">Select Portfolio First</option>';
        return;
    }

    // Load assets from portfolio
    const portfolio = PortfolioManager.getPortfolio(portfolioId);
    console.log('Portfolio found:', portfolio?.name, 'Assets count:', portfolio?.assets?.length);

    if (portfolio && portfolio.assets) {
        let assetsToShow = portfolio.assets;
        
        // Filter for SELL transactions - only show assets with quantity > 0
        if (txnType === 'SELL') {
            const positions = TransactionManager.getPortfolioPositions(portfolioId);
            assetsToShow = portfolio.assets.filter(asset => {
                const position = positions.find(p => p.assetId === asset.id);
                return position && position.quantity > 0;
            });
            
            if (assetsToShow.length === 0) {
                assetSelect.innerHTML = '<option value="">No assets to sell</option>';
                Utils.showNotification('No assets available to sell in this portfolio', 'warning');
                return;
            }
        }
        
        assetSelect.innerHTML = '<option value="">Select Asset</option>' +
            assetsToShow.map(asset => {
                // For SELL, show current quantity
                if (txnType === 'SELL') {
                    const positions = TransactionManager.getPortfolioPositions(portfolioId);
                    const position = positions.find(p => p.assetId === asset.id);
                    const qty = position ? position.quantity : 0;
                    return `<option value="${asset.id}" data-name="${asset.name}" data-ticker="${asset.ticker}" data-currency="${asset.currency}">${asset.name} (${asset.ticker}) - Owned: ${qty}</option>`;
                }
                return `<option value="${asset.id}" data-name="${asset.name}" data-ticker="${asset.ticker}" data-currency="${asset.currency}">${asset.name} (${asset.ticker})</option>`;
            }).join('');
    }
    
    // Load all accounts initially
    loadAllPortfolioAccounts(portfolioId);
    
    // Filter accounts when asset changes
    assetSelect.addEventListener('change', filterAccountsByCurrency);
};

function loadAllPortfolioAccounts(portfolioId) {
    const accounts = AccountManager.getAllAccounts().filter(acc => acc.portfolioId === portfolioId);
    const accountSelect = document.getElementById('txnAccount');
    accountSelect.innerHTML = '<option value="">No Account (Manual)</option>' +
        accounts.map(acc => {
            const calculatedBalance = AccountManager.calculateBalanceAsOfDate(acc.id, new Date());
            return `<option value="${acc.id}" data-currency="${acc.currency}">${acc.name} - ${Utils.formatCurrency(calculatedBalance, acc.currency)}</option>`;
        }).join('');

    // Add event listener for account selection change to auto-populate amounts
    accountSelect.removeEventListener('change', handleAccountSelectionChange); // Remove old listener first
    accountSelect.addEventListener('change', handleAccountSelectionChange);
}

function filterAccountsByCurrency() {
    const portfolioId = document.getElementById('txnPortfolio').value;
    const assetSelect = document.getElementById('txnAsset');
    const selectedAssetOption = assetSelect.options[assetSelect.selectedIndex];
    
    if (!selectedAssetOption || !selectedAssetOption.value) {
        // No asset selected, show all accounts
        loadAllPortfolioAccounts(portfolioId);
        return;
    }
    
    const assetCurrency = selectedAssetOption.getAttribute('data-currency');
    
    // Filter accounts by matching currency
    const accounts = AccountManager.getAllAccounts().filter(acc => 
        acc.portfolioId === portfolioId && acc.currency === assetCurrency
    );
    
    const accountSelect = document.getElementById('txnAccount');
    accountSelect.innerHTML = '<option value="">No Account (Manual)</option>' +
        accounts.map(acc => {
            const calculatedBalance = AccountManager.calculateBalanceAsOfDate(acc.id, new Date());
            return `<option value="${acc.id}" data-currency="${acc.currency}">${acc.name} - ${Utils.formatCurrency(calculatedBalance, acc.currency)}</option>`;
        }).join('');
    
    // Show notification if no matching accounts
    if (accounts.length === 0) {
        Utils.showNotification(
            `No ${assetCurrency} accounts available. Create one or select "No Account (Manual)".`,
            'warning'
        );
    }
    
    // Update currency display
    updateTransactionCurrency();
}

window.updateTransactionCurrency = function() {
    const accountId = document.getElementById('txnAccount').value;
    
    if (accountId) {
        const account = AccountManager.getAccount(accountId);
        if (account) {
            // Update all currency displays to match account
            const currencyDisplays = document.querySelectorAll('.txn-currency-display');
            currencyDisplays.forEach(el => {
                el.textContent = account.currency;
            });
            
            // Store currency for transaction
            document.getElementById('txnCurrencyHidden').value = account.currency;
            return;
        }
    }
    
    // Default to THB if no account selected
    const currencyDisplays = document.querySelectorAll('.txn-currency-display');
    currencyDisplays.forEach(el => {
        el.textContent = 'THB';
    });
    document.getElementById('txnCurrencyHidden').value = 'THB';
};

window.updateTransactionFields = function() {
    console.log('updateTransactionFields called');
    
    const txnType = document.getElementById('txnType').value;
    console.log('Transaction type:', txnType);
    
    const assetGroup = document.getElementById('txnAssetGroup');
    const accountGroup = document.getElementById('txnAccountGroup');
    const destinationGroup = document.getElementById('txnDestinationGroup');
    const quantityPriceRow = document.getElementById('txnQuantityPriceRow');
    const balanceWarning = document.getElementById('txnBalanceWarning');
    const exchangeRateGroup = document.getElementById('txnExchangeRateGroup');
    const transferCalculation = document.getElementById('txnTransferCalculation');
    
    // Verify elements exist
    if (!assetGroup || !accountGroup || !destinationGroup || !quantityPriceRow) {
        console.error('Required form elements not found!');
        return;
    }
    
    // Reset all fields
    assetGroup.style.display = 'none';
    destinationGroup.style.display = 'none';
    quantityPriceRow.style.display = 'none';
    if (exchangeRateGroup) exchangeRateGroup.style.display = 'none';
    if (transferCalculation) transferCalculation.style.display = 'none';
    document.getElementById('txnAsset').required = false;
    document.getElementById('txnQuantity').required = false;
    document.getElementById('txnPrice').required = false;
    document.getElementById('txnDestinationAccount').required = false;
    document.getElementById('txnTotal').readOnly = true;
    
    // Update account label
    const accountLabel = accountGroup.querySelector('label');
    
    if (txnType === 'BUY' || txnType === 'SELL') {
        console.log('Showing asset field for BUY/SELL');
        accountLabel.textContent = 'From Account';
        assetGroup.style.display = 'block';
        quantityPriceRow.style.display = 'grid';
        document.getElementById('txnAsset').required = true;
        document.getElementById('txnQuantity').required = true;
        document.getElementById('txnPrice').required = true;
        document.getElementById('txnTotal').readOnly = true;
        
    } else if (txnType === 'DIVIDEND') {
        console.log('Showing asset field for DIVIDEND');
        accountLabel.textContent = 'To Account';
        assetGroup.style.display = 'block';
        document.getElementById('txnAsset').required = true;
        document.getElementById('txnTotal').readOnly = false;
        
    } else if (txnType === 'DEPOSIT' || txnType === 'WITHDRAW' || txnType === 'INTEREST') {
        console.log('Handling account-based transaction:', txnType);
        // For DEPOSIT/WITHDRAW/INTEREST, show account field but hide asset/quantity/price
        accountLabel.textContent = txnType === 'DEPOSIT' ? 'To Account *' : 'From Account *';
        accountGroup.style.display = 'block';
        document.getElementById('txnAccount').required = true;
        document.getElementById('txnTotal').readOnly = false;

        // Show exchange rate field for USD accounts
        const accountSelect = document.getElementById('txnAccount');
        const handleAccountChange = function() {
            console.log('handleAccountChange triggered for', txnType);

            // Use the direct element reference to get the value
            const selectedAccountId = document.getElementById('txnAccount').value;
            console.log('Selected account ID:', selectedAccountId);
            console.log('Account select element:', accountSelect);

            if (!selectedAccountId) {
                // Hide exchange rate if no account selected
                if (exchangeRateGroup) {
                    exchangeRateGroup.style.display = 'none';
                    document.getElementById('txnExchangeRate').required = false;
                }
                return;
            }

            const selectedAccount = AccountManager.getAccount(selectedAccountId);
            console.log('Selected account:', selectedAccount);
            console.log('Selected account currency:', selectedAccount?.currency);

            if (selectedAccount && selectedAccount.currency === 'USD') {
                console.log('USD account detected, showing exchange rate field');
                if (exchangeRateGroup) {
                    exchangeRateGroup.style.display = 'block';
                    document.getElementById('txnExchangeRate').required = true;

                    // Update label to show USD = ? THB
                    const rateLabel = document.getElementById('txnExchangeRateLabel');
                    if (rateLabel) rateLabel.textContent = 'USD';

                    const rateHelp = document.getElementById('txnExchangeRateHelp');
                    if (rateHelp) rateHelp.textContent = 'How many THB = 1 USD';

                    // For WITHDRAW, auto-populate with FIFO rate
                    if (txnType === 'WITHDRAW' && window.FIFOManager) {
                        // Get weighted average rate from available USD lots
                        const lots = FIFOManager.getAllLots().filter(lot =>
                            lot.portfolioId === selectedAccount.portfolioId &&
                            lot.currency === 'USD' &&
                            lot.remainingQuantity > 0
                        );

                        if (lots.length > 0) {
                            const totalQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
                            const weightedRate = lots.reduce((sum, lot) =>
                                sum + (lot.exchangeRate * lot.remainingQuantity), 0) / totalQuantity;

                            document.getElementById('txnExchangeRate').value = weightedRate.toFixed(4);
                            console.log(`Auto-populated WITHDRAW exchange rate: ${weightedRate.toFixed(4)}`);
                        } else {
                            // No lots available, use global rate
                            const currentRate = window.getExchangeRate ? window.getExchangeRate() : 35;
                            document.getElementById('txnExchangeRate').value = currentRate.toFixed(4);
                        }
                    } else if (txnType === 'DEPOSIT') {
                        // For DEPOSIT, use current global rate as default (user can edit)
                        const currentRate = window.getExchangeRate ? window.getExchangeRate() : 35;
                        document.getElementById('txnExchangeRate').value = currentRate.toFixed(4);
                        console.log(`Auto-populated DEPOSIT exchange rate: ${currentRate.toFixed(4)} (you can edit this)`);
                    } else if (txnType === 'INTEREST') {
                        // For INTEREST, use current global rate as default
                        const currentRate = window.getExchangeRate ? window.getExchangeRate() : 35;
                        document.getElementById('txnExchangeRate').value = currentRate.toFixed(4);
                    }
                }
            } else {
                console.log('Non-USD account or no account, hiding exchange rate field');
                if (exchangeRateGroup) {
                    exchangeRateGroup.style.display = 'none';
                    document.getElementById('txnExchangeRate').required = false;
                }
            }
        };

        // Store handler globally so inline onchange can call it
        window.handleAccountChangeForDeposit = handleAccountChange;

        // Remove any existing listener to prevent duplicates
        const oldAccountSelect = accountSelect.cloneNode(true);
        accountSelect.parentNode.replaceChild(oldAccountSelect, accountSelect);

        // Get the new element reference after replacement
        const newAccountSelect = document.getElementById('txnAccount');
        newAccountSelect.addEventListener('change', handleAccountChange);
        console.log('Account change listener added for DEPOSIT/WITHDRAW/INTEREST');

        // Trigger on load if account already selected
        if (newAccountSelect.value) {
            console.log('Account already selected on load, triggering handler');
            handleAccountChange();
        }

    } else if (txnType === 'TRANSFER') {
        console.log('Hiding asset field for TRANSFER');
        accountLabel.textContent = 'From Account *';
        destinationGroup.style.display = 'block';
        document.getElementById('txnAccount').required = true;
        document.getElementById('txnDestinationAccount').required = true;
        document.getElementById('txnTotal').readOnly = false;
        
        // Add listener to source account to re-filter destinations when changed
        const sourceAccountSelect = document.getElementById('txnAccount');
        sourceAccountSelect.addEventListener('change', () => {
            loadDestinationAccounts();
            checkCrossCurrencyTransfer();
        });
        
        // Load destination accounts (exclude source account)
        loadDestinationAccounts();
        
        // Check if cross-currency transfer
        checkCrossCurrencyTransfer();
    }
    
    console.log('Asset group display:', assetGroup.style.display);
    
    // Re-load assets when transaction type changes (for SELL filtering)
    updateTransactionAssets();
    
    // Show/hide balance warning
    const accountId = document.getElementById('txnAccount').value;
    if (accountId && txnType) {
        balanceWarning.style.display = 'block';
    } else {
        balanceWarning.style.display = 'none';
    }
};

function loadDestinationAccounts() {
    const portfolioId = document.getElementById('txnPortfolio').value;
    const sourceAccountId = document.getElementById('txnAccount').value;
    const destinationSelect = document.getElementById('txnDestinationAccount');
    
    if (!portfolioId) {
        destinationSelect.innerHTML = '<option value="">Select Portfolio First</option>';
        return;
    }
    
    // Get all accounts except the source account (from all portfolios for cross-portfolio transfers)
    const accounts = AccountManager.getAllAccounts().filter(acc =>
        acc.id !== sourceAccountId
    );
    
    destinationSelect.innerHTML = '<option value="">Select Destination Account</option>' +
        accounts.map(acc => {
            const calculatedBalance = AccountManager.calculateBalanceAsOfDate(acc.id, new Date());
            return `<option value="${acc.id}" data-currency="${acc.currency}">${acc.name} - ${Utils.formatCurrency(calculatedBalance, acc.currency)}</option>`;
        }).join('');
    
    if (accounts.length === 0) {
        Utils.showNotification('You need at least 2 accounts to make a transfer', 'warning');
    }
    
    // Check if cross-currency after loading
    checkCrossCurrencyTransfer();
}

window.checkCrossCurrencyTransfer = function() {
    const sourceAccountId = document.getElementById('txnAccount').value;
    const destAccountId = document.getElementById('txnDestinationAccount').value;
    const exchangeRateGroup = document.getElementById('txnExchangeRateGroup');
    
    if (!sourceAccountId || !destAccountId) {
        exchangeRateGroup.style.display = 'none';
        return;
    }
    
    const sourceAccount = AccountManager.getAccount(sourceAccountId);
    const destAccount = AccountManager.getAccount(destAccountId);
    
    if (sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency) {
        // Show exchange rate field for cross-currency transfer
        exchangeRateGroup.style.display = 'block';
        
        // Update label and help text
        document.getElementById('txnExchangeRateLabel').textContent = `${destAccount.currency}`;
        document.getElementById('txnExchangeRateHelp').textContent = 
            `How many ${sourceAccount.currency} = 1 ${destAccount.currency}`;
        
        // Show calculation
        updateTransferCalculation();
    } else {
        exchangeRateGroup.style.display = 'none';
        document.getElementById('txnTransferCalculation').style.display = 'none';
    }
};

window.updateTransferCalculation = function() {
    const sourceAccountId = document.getElementById('txnAccount').value;
    const destAccountId = document.getElementById('txnDestinationAccount').value;
    const amount = parseFloat(document.getElementById('txnTotal').value) || 0;
    const rate = parseFloat(document.getElementById('txnExchangeRate').value) || 1;
    
    if (!sourceAccountId || !destAccountId || amount <= 0) {
        document.getElementById('txnTransferCalculation').style.display = 'none';
        return;
    }
    
    const sourceAccount = AccountManager.getAccount(sourceAccountId);
    const destAccount = AccountManager.getAccount(destAccountId);
    
    if (sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency) {
        const destAmount = amount / rate;
        
        document.getElementById('txnTransferCalculation').innerHTML = `
            <strong>Transfer Preview:</strong><br>
            From: ${Utils.formatCurrency(amount, sourceAccount.currency)} (${sourceAccount.name})<br>
            To: ${Utils.formatCurrency(destAmount, destAccount.currency)} (${destAccount.name})<br>
            Rate: ${rate.toFixed(4)} ${sourceAccount.currency}/${destAccount.currency}
        `;
        document.getElementById('txnTransferCalculation').style.display = 'block';
    } else {
        document.getElementById('txnTransferCalculation').style.display = 'none';
    }
};

window.calculateTxnTotal = function() {
    const quantity = parseFloat(document.getElementById('txnQuantity').value) || 0;
    const price = parseFloat(document.getElementById('txnPrice').value) || 0;
    const total = quantity * price;

    // Use higher precision for total calculation to maintain accuracy
    document.getElementById('txnTotal').value = total.toFixed(6);
};

/**
 * Handle account selection change in transaction form
 * Auto-populates total amount for WITHDRAW transactions
 */
function handleAccountSelectionChange(event) {
    const selectedAccountId = event.target.value;
    const txnType = document.getElementById('txnType').value;

    // Auto-populate total amount for WITHDRAW transactions
    if (txnType === 'WITHDRAW' && selectedAccountId) {
        const account = AccountManager.getAccount(selectedAccountId);
        if (account) {
            const balance = AccountManager.calculateBalanceAsOfDate(selectedAccountId, new Date());
            const totalInput = document.getElementById('txnTotal');
            totalInput.value = balance.toFixed(2);

            // Update currency display
            updateTransactionCurrency();
        }
    }
}

function setupTransactionFormHandler() {
    const form = document.getElementById('recordTransactionForm');
    
    // Remove existing listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new listener
    document.getElementById('recordTransactionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        try {
            // Safely get form values with null checks
            const getElementValue = (id, defaultValue = '') => {
                const el = document.getElementById(id);
                if (!el) {
                    console.warn(`Element not found: ${id}`);
                    return defaultValue;
                }
                return el.value;
            };
            
            const portfolioId = getElementValue('txnPortfolio');
            const txnType = getElementValue('txnType');
            
            if (!portfolioId || !txnType) {
                throw new Error('Please select portfolio and transaction type');
            }
            
            let transactionData = {
                portfolioId: portfolioId,
                type: txnType,
                totalAmount: parseFloat(getElementValue('txnTotal', '0')) || 0,
                fee: parseFloat(getElementValue('txnFee', '0')) || 0,
                currency: getElementValue('txnCurrencyHidden', 'THB'),
                date: getElementValue('txnDate'),
                notes: getElementValue('txnNotes', '')
            };
            
            // Add type-specific fields
            if (txnType === 'TRANSFER') {
                transactionData.accountId = getElementValue('txnAccount');
                transactionData.destinationAccountId = getElementValue('txnDestinationAccount');

                // Safely get exchange rate with fallback to 1
                const exchangeRateEl = document.getElementById('txnExchangeRate');
                transactionData.exchangeRate = exchangeRateEl ? (parseFloat(exchangeRateEl.value) || 1) : 1;

                if (!transactionData.accountId || !transactionData.destinationAccountId) {
                    throw new Error('Please select both source and destination accounts');
                }
            } else if (txnType === 'DEPOSIT' || txnType === 'WITHDRAW' || txnType === 'INTEREST') {
                // DEPOSIT/WITHDRAW/INTEREST transactions
                transactionData.accountId = getElementValue('txnAccount') || null;

                // Capture exchange rate if provided (for USD accounts)
                const exchangeRateEl = document.getElementById('txnExchangeRate');
                if (exchangeRateEl && exchangeRateEl.value) {
                    transactionData.exchangeRate = parseFloat(exchangeRateEl.value) || 1;
                } else {
                    // Default to 1 for THB accounts or if not provided
                    transactionData.exchangeRate = 1;
                }

                if (!transactionData.accountId) {
                    throw new Error('Please select an account');
                }
            } else {
                // BUY/SELL/DIVIDEND transactions
                const assetSelect = document.getElementById('txnAsset');
                if (!assetSelect) {
                    throw new Error('Asset field not found');
                }

                const selectedAsset = assetSelect.options[assetSelect.selectedIndex];

                transactionData.assetId = assetSelect.value || null;
                transactionData.assetName = selectedAsset?.getAttribute('data-name') || '';
                transactionData.assetTicker = selectedAsset?.getAttribute('data-ticker') || '';
                transactionData.accountId = getElementValue('txnAccount') || null;
                transactionData.quantity = parseFloat(getElementValue('txnQuantity', '0')) || 0;
                transactionData.pricePerUnit = parseFloat(getElementValue('txnPrice', '0')) || 0;
            }
            
            console.log('Transaction data:', transactionData);
            TransactionManager.recordTransaction(transactionData);
            closeRecordTransactionModal();
            App.loadTransactions();
            
        } catch (error) {
            console.error('Error recording transaction:', error);
            Utils.showNotification(error.message, 'error');
        }
    });
}

// Log system information
console.log('%c Portfolio Manager', 'font-size: 24px; font-weight: bold; color: #0071E3;');
console.log('%c Phase 1: Foundation Complete ✓', 'font-size: 14px; color: #34C759;');
console.log('Features Available:');
console.log('✓ Password Protection & Session Management');
console.log('✓ Two-Layer Storage (localStorage + Cloud Sync)');
console.log('✓ Apple-Inspired UI Design');
console.log('✓ Responsive Layout');
console.log('✓ Auto-Lock (15 min inactivity)');
console.log('✓ Remember Me (7 days)');
console.log('✓ Factory Reset');
console.log('\nNext Phase: Core Portfolio Features');

// Price Management Functions
window.showManualPriceModal = function(assetId, assetName, assetCurrency = 'THB') {
    document.getElementById('priceAssetId').value = assetId;
    document.getElementById('priceAssetName').value = assetName;
    
    // Check if there's an existing price and pre-populate it
    const existingPrice = PriceManager.getCurrentPrice(assetId);
    if (existingPrice) {
        document.getElementById('manualPrice').value = existingPrice.price;
        document.getElementById('priceCurrency').value = existingPrice.currency;
    } else {
        document.getElementById('manualPrice').value = '';
        document.getElementById('priceCurrency').value = assetCurrency;
    }
    
    Utils.toggleElement('#manualPriceModal', true);
};

window.closeManualPriceModal = function() {
    Utils.toggleElement('#manualPriceModal', false);
};

// Setup manual price form handler
document.addEventListener('DOMContentLoaded', () => {
    const manualPriceForm = document.getElementById('manualPriceForm');
    if (manualPriceForm) {
        manualPriceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            try {
                const assetId = document.getElementById('priceAssetId').value;
                const price = document.getElementById('manualPrice').value;
                const currency = document.getElementById('priceCurrency').value;
                
                console.log('Setting manual price:', { assetId, price, currency });
                
                // Set the manual price
                const priceData = PriceManager.setManualPrice(assetId, price, currency);
                console.log('Price saved:', priceData);
                
                // Verify it was saved
                const savedPrice = PriceManager.getCurrentPrice(assetId);
                console.log('Verified saved price:', savedPrice);
                
                // Check all prices in storage
                const allPrices = PriceManager.getAllPrices();
                console.log('All prices in storage:', allPrices);
                
                Utils.showNotification('Price updated successfully', 'success');
                closeManualPriceModal();
                
                // Force reload after small delay to ensure localStorage is updated
                setTimeout(() => {
                    console.log('Reloading portfolios to show updated price');
                    if (App.currentPage === 'portfolios') {
                        App.loadPortfolios();
                    }
                }, 100);
                
            } catch (error) {
                console.error('Error setting manual price:', error);
                Utils.showNotification(error.message, 'error');
            }
        });
    }
});

// Update prices for portfolio
window.updatePortfolioPrices = async function(portfolioId) {
    try {
        Utils.showNotification('Updating prices...', 'info');
        
        const results = await PriceManager.updateAllPrices(portfolioId);
        
        if (results.success > 0) {
            Utils.showNotification(
                `Updated ${results.success} asset price(s)${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
                results.failed > 0 ? 'warning' : 'success'
            );
        }
        
        if (results.errors.length > 0) {
            console.error('Price update errors:', results.errors);
        }
        
        // Reload portfolios to show updated prices
        App.loadPortfolios();
        
    } catch (error) {
        console.error('Error updating prices:', error);
        Utils.showNotification('Failed to update prices: ' + error.message, 'error');
    }
};

// Update all prices across all portfolios
window.updateAllPrices = async function() {
    try {
        Utils.showNotification('Updating prices for all portfolios...', 'info');
        
        const portfolios = PortfolioManager.getAllPortfolios();
        let totalSuccess = 0;
        let totalFailed = 0;
        let allErrors = [];
        
        for (const portfolio of portfolios) {
            const results = await PriceManager.updateAllPrices(portfolio.id);
            totalSuccess += results.success;
            totalFailed += results.failed;
            allErrors = allErrors.concat(results.errors);
        }
        
        if (totalSuccess > 0) {
            Utils.showNotification(
                `Updated ${totalSuccess} asset price(s) across all portfolios${totalFailed > 0 ? `, ${totalFailed} failed` : ''}`,
                totalFailed > 0 ? 'warning' : 'success'
            );
        } else {
            Utils.showNotification('No prices were updated', 'warning');
        }
        
        if (allErrors.length > 0) {
            console.error('Price update errors:', allErrors);
        }
        
        // Reload dashboard to show updated prices
        App.loadDashboard();
        
    } catch (error) {
        console.error('Error updating prices:', error);
        Utils.showNotification('Failed to update prices: ' + error.message, 'error');
    }
};

// DCA Calculator Functions
window.loadDCAPortfolioOptions = function() {
    const portfolios = PortfolioManager.getAllPortfolios();
    const portfolioSelect = document.getElementById('dcaPortfolio');
    
    portfolioSelect.innerHTML = '<option value="">Select Portfolio</option>' +
        portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
};

window.updateDCAAssets = function() {
    const portfolioId = document.getElementById('dcaPortfolio').value;
    const assetSelect = document.getElementById('dcaAsset');
    const currencyField = document.getElementById('dcaCurrency');
    
    if (!portfolioId) {
        assetSelect.innerHTML = '<option value="">Select Portfolio First</option>';
        return;
    }
    
    // Get assets suitable for DCA (exclude savings accounts)
    const assets = PlanningManager.getDCAAssets(portfolioId);
    
    if (assets.length === 0) {
        assetSelect.innerHTML = '<option value="">No suitable assets</option>';
        Utils.showNotification('No investable assets in this portfolio', 'warning');
        return;
    }
    
    assetSelect.innerHTML = '<option value="">Select Asset</option>' +
        assets.map(a => `<option value="${a.id}" data-currency="${a.currency}">${a.name} (${a.ticker})</option>`).join('');
    
    // Update currency when asset is selected
    assetSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const currency = selectedOption.getAttribute('data-currency') || 'USD';
        currencyField.value = currency;
    });
};

window.setupDCAFormHandler = function() {
    const form = document.getElementById('dcaCalculatorForm');
    
    // Remove existing listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new listener
    document.getElementById('dcaCalculatorForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Collect form data
            const params = {
                portfolioId: document.getElementById('dcaPortfolio').value,
                assetId: document.getElementById('dcaAsset').value,
                monthlyAmount: parseFloat(document.getElementById('dcaAmount').value),
                frequency: document.getElementById('dcaFrequency').value,
                durationMonths: parseInt(document.getElementById('dcaDuration').value),
                startDate: document.getElementById('dcaStartDate').value,
                startingPrice: parseFloat(document.getElementById('dcaStartPrice').value),
                expectedChangeMin: parseFloat(document.getElementById('dcaChangeMin').value) / 100,
                expectedChangeMax: parseFloat(document.getElementById('dcaChangeMax').value) / 100,
                volatility: parseFloat(document.getElementById('dcaVolatility').value) / 100
            };
            
            // Validate
            if (!params.portfolioId || !params.assetId) {
                throw new Error('Please select portfolio and asset');
            }
            
            // Calculate DCA strategy
            const dcaResult = PlanningManager.calculateDCA(params);
            
            // Calculate Lump Sum for comparison
            const lumpSumResult = PlanningManager.calculateLumpSum({
                portfolioId: params.portfolioId,
                assetId: params.assetId,
                totalAmount: params.monthlyAmount * dcaResult.purchases.length,
                startingPrice: params.startingPrice,
                finalPrice: dcaResult.finalPrice
            });
            
            // Compare strategies
            const comparison = PlanningManager.compareStrategies(dcaResult, lumpSumResult);
            
            // Display results
            displayDCAResults(dcaResult, lumpSumResult, comparison, params);
            
        } catch (error) {
            console.error('Error calculating DCA:', error);
            Utils.showNotification(error.message, 'error');
        }
    });
};

function displayDCAResults(dcaResult, lumpSumResult, comparison, params) {
    // Format results
    const formattedDCA = PlanningManager.formatDCAResult(dcaResult);
    const formattedLumpSum = PlanningManager.formatDCAResult(lumpSumResult);
    
    // Show results section
    document.getElementById('dcaResults').style.display = 'block';
    
    // Update summary cards
    document.getElementById('dcaTotalInvested').textContent = formattedDCA.totalInvestedFormatted;
    document.getElementById('dcaTotalShares').textContent = formattedDCA.totalSharesFormatted;
    document.getElementById('dcaAvgCost').textContent = formattedDCA.avgCostPerShareFormatted;
    document.getElementById('dcaCurrentValue').textContent = formattedDCA.currentValueFormatted;
    document.getElementById('dcaGainLoss').innerHTML = `
        <span style="color: ${formattedDCA.gainLossColor};">
            ${formattedDCA.gainLossSign}${formattedDCA.gainLossFormatted}
        </span>
    `;
    document.getElementById('dcaReturn').innerHTML = `
        <span style="color: ${formattedDCA.gainLossColor};">
            ${formattedDCA.gainLossSign}${formattedDCA.returnPercentFormatted}
        </span>
    `;
    
    // Render comparison chart
    renderDCAComparisonChart(dcaResult, lumpSumResult);
    
    // Render comparison table
    renderComparisonTable(formattedDCA, formattedLumpSum, comparison);
    
    // Show recommendation
    document.getElementById('recommendationText').textContent = comparison.recommendation;
    
    // Render purchase timeline
    renderPurchaseTimeline(dcaResult.purchases, dcaResult.asset.currency);
    
    // Render scenario analysis
    renderScenarioAnalysis(params);
    
    // Scroll to results
    document.getElementById('dcaResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDCAComparisonChart(dcaResult, lumpSumResult) {
    const canvas = document.getElementById('dcaComparisonChart');
    
    // Destroy existing chart if any
    if (window.dcaChart) {
        window.dcaChart.destroy();
    }
    
    // Prepare data for chart
    const labels = dcaResult.purchases.map((p, i) => `Month ${i + 1}`);
    const dcaValues = dcaResult.purchases.map(p => p.cumulativeInvested);
    const lumpSumValues = dcaResult.purchases.map(() => lumpSumResult.totalInvested);
    
    window.dcaChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'DCA Cumulative Investment',
                    data: dcaValues,
                    borderColor: '#007AFF',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Lump Sum Investment',
                    data: lumpSumValues,
                    borderColor: '#FF3B30',
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${Utils.formatCurrency(context.parsed.y, dcaResult.asset.currency)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return Utils.formatCurrency(value, dcaResult.asset.currency, false);
                        }
                    }
                }
            }
        }
    });
}

function renderComparisonTable(formattedDCA, formattedLumpSum, comparison) {
    const tbody = document.getElementById('comparisonTableBody');
    
    tbody.innerHTML = `
        <tr>
            <td><strong>DCA Strategy</strong></td>
            <td>${formattedDCA.totalInvestedFormatted}</td>
            <td>${formattedDCA.currentValueFormatted}</td>
            <td style="color: ${formattedDCA.gainLossColor};">
                ${formattedDCA.gainLossSign}${formattedDCA.gainLossFormatted}
            </td>
            <td style="color: ${formattedDCA.gainLossColor};">
                ${formattedDCA.gainLossSign}${formattedDCA.returnPercentFormatted}
            </td>
            <td><span class="status-badge status-${comparison.dcaRisk.riskLevel === 'Low' ? 'success' : comparison.dcaRisk.riskLevel === 'High' ? 'danger' : 'warning'}">${comparison.dcaRisk.riskLevel}</span></td>
        </tr>
        <tr>
            <td><strong>Lump Sum Strategy</strong></td>
            <td>${formattedLumpSum.totalInvestedFormatted}</td>
            <td>${formattedLumpSum.currentValueFormatted}</td>
            <td style="color: ${formattedLumpSum.gainLossColor};">
                ${formattedLumpSum.gainLossSign}${formattedLumpSum.gainLossFormatted}
            </td>
            <td style="color: ${formattedLumpSum.gainLossColor};">
                ${formattedLumpSum.gainLossSign}${formattedLumpSum.returnPercentFormatted}
            </td>
            <td><span class="status-badge status-danger">${comparison.lumpSumRisk.riskLevel}</span></td>
        </tr>
    `;
}

function renderPurchaseTimeline(purchases, currency) {
    const timeline = document.getElementById('purchaseTimeline');
    
    timeline.innerHTML = purchases.map((p, i) => `
        <div style="padding: var(--space-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); margin-bottom: var(--space-xs);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">Purchase ${i + 1}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">${Utils.formatDate(p.date, 'short')}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600;">${Utils.formatCurrency(p.price, currency)} × ${p.shares.toFixed(4)}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">Total: ${p.cumulativeShares.toFixed(4)} shares</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderScenarioAnalysis(params) {
    const scenarios = PlanningManager.generateScenarios(params);
    const scenarioDiv = document.getElementById('scenarioAnalysis');
    
    scenarioDiv.innerHTML = Object.keys(scenarios).map(key => {
        const scenario = scenarios[key];
        const formatted = PlanningManager.formatDCAResult(scenario);
        
        return `
            <div class="card" style="margin-bottom: var(--space-md);">
                <h4>${scenario.scenario}</h4>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--space-md);">${scenario.description}</p>
                
                <div class="dashboard-grid" style="gap: var(--space-sm);">
                    <div style="text-align: center; padding: var(--space-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                        <div style="font-size: 12px; color: var(--color-text-secondary);">Final Value</div>
                        <div style="font-size: 20px; font-weight: 600; color: var(--color-primary);">
                            ${formatted.currentValueFormatted}
                        </div>
                    </div>
                    <div style="text-align: center; padding: var(--space-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm);">
                        <div style="font-size: 12px; color: var(--color-text-secondary);">Return</div>
                        <div style="font-size: 20px; font-weight: 600; color: ${formatted.gainLossColor};">
                            ${formatted.gainLossSign}${formatted.returnPercentFormatted}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================================
// EXCHANGE RATE MANAGEMENT
// ============================================================================

/**
 * Load and display exchange rate settings
 */
window.loadExchangeRateSettings = function() {
    const rateData = StorageManager.getExchangeRate();
    const input = document.getElementById('exchangeRateInput');
    const info = document.getElementById('exchangeRateInfo');
    
    if (input) {
        input.value = rateData.rate.toFixed(2);
    }
    
    if (info) {
        let infoText = `Rate: ${rateData.rate.toFixed(2)} THB/USD`;
        if (rateData.lastUpdated) {
            const date = new Date(rateData.lastUpdated);
            infoText += ` • Updated: ${Utils.formatDate(date, 'short')}`;
        }
        if (rateData.source === 'fcd') {
            infoText += ` • Source: FCD Auto`;
        }
        info.textContent = infoText;
    }
    
    // Show/hide exchange rate settings based on USD presence
    const hasUSDAssets = checkForUSDAssets();
    const settingsDiv = document.getElementById('exchangeRateSettings');
    if (settingsDiv) {
        settingsDiv.style.display = hasUSDAssets ? 'block' : 'none';
        
        // Debug logging
        if (hasUSDAssets) {
            console.log('✓ USD detected - Exchange rate section visible');
        } else {
            console.log('✗ No USD detected - Exchange rate section hidden');
        }
    }
};

/**
 * Check if there are any USD assets in portfolios, FCD accounts, or USD transactions
 */
function checkForUSDAssets() {
    // Check 1: USD assets in portfolio definitions
    const portfolios = PortfolioManager.getAllPortfolios();
    for (const portfolio of portfolios) {
        for (const asset of portfolio.assets) {
            if (asset.currency === 'USD') {
                return true;
            }
        }
    }
    
    // Check 2: FCD accounts (which are USD accounts)
    const accounts = AccountManager.getAllAccounts();
    const hasFCDAccount = accounts.some(acc => acc.type === 'fcd_account');
    if (hasFCDAccount) {
        return true;
    }
    
    // Check 3: Any USD transactions
    const transactions = TransactionManager.getTransactions({});
    const hasUSDTransaction = transactions.some(txn => txn.currency === 'USD');
    if (hasUSDTransaction) {
        return true;
    }
    
    return false;
}

/**
 * Update exchange rate manually
 */
window.updateExchangeRate = function() {
    const input = document.getElementById('exchangeRateInput');
    const rate = parseFloat(input.value);

    if (!rate || rate <= 0) {
        Utils.showNotification('Please enter a valid exchange rate', 'error');
        return;
    }

    const rateData = {
        rate: rate,
        lastUpdated: new Date().toISOString(),
        source: 'manual',
        fcdAccountId: null
    };

    StorageManager.saveExchangeRate(rateData);
    loadExchangeRateSettings();

    // Reload dashboard to apply new rate
    App.loadDashboard();

    Utils.showNotification(`Exchange rate updated to ${rate.toFixed(2)} THB/USD`, 'success');
};

/**
 * Clear all FIFO lots and sales data
 */
window.clearFIFOLots = function() {
    if (!confirm('⚠️ Are you sure you want to clear ALL FIFO lot data?\n\nThis will:\n• Delete all FIFO lots\n• Delete all FIFO sale records\n• Recalculate cost basis from transactions\n\nThis action cannot be undone!')) {
        return;
    }

    try {
        // Clear from localStorage
        localStorage.removeItem('PM_FIFO_LOTS');
        localStorage.removeItem('PM_FIFO_SALES');

        // Clear from StorageManager
        StorageManager.saveToLocal(StorageManager.KEYS.FIFO_LOTS, []);
        StorageManager.saveToLocal(StorageManager.KEYS.FIFO_SALES, []);

        // Clear from cloud storage if enabled
        if (StorageManager.isCloudEnabled) {
            StorageManager.syncToCloud().catch(err => {
                console.warn('Failed to sync FIFO clear to cloud:', err);
            });
        }

        console.log('✓ All FIFO lots cleared');
        Utils.showNotification('FIFO lots cleared successfully. Refreshing dashboard...', 'success');

        // Reload dashboard to recalculate
        setTimeout(() => {
            location.reload();
        }, 1000);

    } catch (error) {
        console.error('Error clearing FIFO lots:', error);
        Utils.showNotification('Failed to clear FIFO lots: ' + error.message, 'error');
    }
};


/**
 * Auto-calculate exchange rate from FCD account
 */
window.autoCalculateFromFCD = function() {
    const accounts = AccountManager.getAllAccounts();
    const fcdAccounts = accounts.filter(acc => acc.type === 'fcd_account');
    
    if (fcdAccounts.length === 0) {
        Utils.showNotification('No FCD accounts found. Create an FCD account first.', 'warning');
        return;
    }
    
    // Find FCD account with a set price
    let selectedAccount = null;
    let usdValue = 0;
    
    for (const account of fcdAccounts) {
        // Get the linked asset
        const portfolios = PortfolioManager.getAllPortfolios();
        for (const portfolio of portfolios) {
            const asset = portfolio.assets.find(a => 
                a.id === account.linkedAssetId || 
                (a.type === 'fcd_account' && a.name === account.name)
            );
            
            if (asset) {
                const priceData = PriceManager.getCurrentPrice(asset.id);
                if (priceData && priceData.price > 0) {
                    selectedAccount = account;
                    usdValue = priceData.price;
                    break;
                }
            }
        }
        if (selectedAccount) break;
    }
    
    if (!selectedAccount || usdValue === 0) {
        Utils.showNotification('No FCD account with a set price found. Please set a manual price for your FCD account first.', 'warning');
        return;
    }
    
    // Calculate exchange rate: THB balance / USD value
    const thbBalance = selectedAccount.balance;
    const exchangeRate = thbBalance / usdValue;
    
    if (exchangeRate <= 0 || !isFinite(exchangeRate)) {
        Utils.showNotification('Invalid calculation. Check FCD account balance and price.', 'error');
        return;
    }
    
    const rateData = {
        rate: exchangeRate,
        lastUpdated: new Date().toISOString(),
        source: 'fcd',
        fcdAccountId: selectedAccount.id
    };
    
    StorageManager.saveExchangeRate(rateData);
    loadExchangeRateSettings();
    
    // Reload dashboard to apply new rate
    App.loadDashboard();
    
    Utils.showNotification(
        `Exchange rate auto-calculated from ${selectedAccount.name}: ${exchangeRate.toFixed(4)} THB/USD`,
        'success'
    );
};

/**
 * Get current exchange rate
 */
window.getExchangeRate = function() {
    const rateData = StorageManager.getExchangeRate();
    return rateData.rate;
};

/**
 * Convert USD to THB using current exchange rate
 */
window.convertUSDToTHB = function(usdAmount) {
    const rate = getExchangeRate();
    return usdAmount * rate;
};

// ============================================================================
// REBALANCING MANAGEMENT
// ============================================================================

/**
 * Show rebalancing modal for a portfolio
 */
window.showRebalancingModal = function(portfolioId) {
    const portfolio = PortfolioManager.getPortfolio(portfolioId);
    if (!portfolio) {
        Utils.showNotification('Portfolio not found', 'error');
        return;
    }
    
    // Set portfolio name
    document.getElementById('rebalancingPortfolioName').textContent = `${portfolio.name} - Rebalancing`;
    
    // Store current portfolio ID
    window.currentRebalancingPortfolioId = portfolioId;
    
    // Calculate and display drift analysis
    try {
        const driftData = RebalancingManager.calculateDrift(portfolioId);
        displayDriftAnalysis(driftData);
        
        // Reset strategy to default
        selectRebalancingStrategy('full');
        
        // Clear previous recommendations
        document.getElementById('recommendationsSection').innerHTML = 
            '<p style="color: var(--color-text-secondary);">Click "Calculate Recommendations" to see rebalancing suggestions</p>';
        document.getElementById('impactPreview').innerHTML = '';
        
    } catch (error) {
        console.error('Error calculating drift:', error);
        Utils.showNotification('Error analyzing portfolio: ' + error.message, 'error');
        return;
    }
    
    // Show modal
    Utils.toggleElement('#rebalancingModal', true);
};

/**
 * Close rebalancing modal
 */
window.closeRebalancingModal = function() {
    Utils.toggleElement('#rebalancingModal', false);
    window.currentRebalancingPortfolioId = null;
};

/**
 * Display drift analysis
 */
function displayDriftAnalysis(driftData) {
    const section = document.getElementById('driftAnalysisSection');
    
    // Overall health card
    const healthColor = driftData.summary.overallHealth === 'healthy' ? 'var(--color-success)' : 
                       driftData.summary.overallHealth === 'moderate' ? 'var(--color-warning)' : 'var(--color-danger)';
    
    const healthIcon = driftData.summary.overallHealth === 'healthy' ? '✅' : 
                      driftData.summary.overallHealth === 'moderate' ? '🟡' : '🔴';
    
    section.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, ${healthColor}15, ${healthColor}05); border-left: 4px solid ${healthColor};">
            <div style="display: flex; justify-content: between; align-items: center; gap: var(--space-lg);">
                <div style="flex: 1;">
                    <h4 style="margin-bottom: var(--space-sm);">${healthIcon} Portfolio Health</h4>
                    <div style="font-size: 14px; color: var(--color-text-secondary);">
                        Max Drift: <strong>${driftData.summary.maxDrift.toFixed(1)}%</strong> • 
                        Avg Drift: <strong>${driftData.summary.avgDrift.toFixed(1)}%</strong> • 
                        Assets Needing Rebalancing: <strong>${driftData.summary.assetsNeedingRebalancing}</strong>
                    </div>
                </div>
                <div style="text-align: center; padding: var(--space-md);">
                    <div style="font-size: 48px;">${healthIcon}</div>
                    <div style="font-size: 12px; font-weight: 600; color: ${healthColor}; text-transform: uppercase;">
                        ${driftData.summary.overallHealth.replace('-', ' ')}
                    </div>
                </div>
            </div>
        </div>
        
        ${RebalancingManager.formatDriftDisplay(driftData)}
    `;
}

/**
 * Select rebalancing strategy
 */
window.selectRebalancingStrategy = function(strategy) {
    // Update button states
    document.querySelectorAll('.strategy-btn').forEach(btn => {
        if (btn.getAttribute('data-strategy') === strategy) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary', 'active');
        } else {
            btn.classList.remove('btn-primary', 'active');
            btn.classList.add('btn-secondary');
        }
    });
    
    // Update description
    const descriptions = {
        'cashflow': '<strong>Cash Flow Method:</strong> Add new money to underweighted assets only. No selling required. Best when you have cash to invest.',
        'full': '<strong>Full Rebalance:</strong> Buy and sell assets to match target allocation exactly. Best for maintaining precise allocation.',
        'tax-efficient': '<strong>Tax-Efficient:</strong> Minimize taxable events by using new cash first, only selling when necessary. Best for taxable accounts.'
    };
    
    document.getElementById('strategyDescription').innerHTML = descriptions[strategy];
    
    // Show/hide cash flow options
    const cashFlowOptions = document.getElementById('cashFlowOptions');
    if (strategy === 'cashflow' || strategy === 'tax-efficient') {
        cashFlowOptions.style.display = 'block';
    } else {
        cashFlowOptions.style.display = 'none';
    }
    
    // Store selected strategy
    window.currentRebalancingStrategy = strategy;
};

/**
 * Generate rebalancing recommendations
 */
window.generateRebalancingRecommendations = function() {
    const portfolioId = window.currentRebalancingPortfolioId;
    const strategy = window.currentRebalancingStrategy || 'full';
    
    if (!portfolioId) {
        Utils.showNotification('No portfolio selected', 'error');
        return;
    }
    
    try {
        // Get options
        const options = {};
        
        if (strategy === 'cashflow' || strategy === 'tax-efficient') {
            const availableCash = parseFloat(document.getElementById('availableCash').value) || 10000;
            options.availableCash = availableCash;
        }
        
        // Get recommendations
        const result = RebalancingManager.getRebalancingRecommendations(
            portfolioId,
            strategy,
            5, // 5% threshold
            options
        );
        
        // Display recommendations
        displayRebalancingRecommendations(result);
        
    } catch (error) {
        console.error('Error generating recommendations:', error);
        Utils.showNotification('Error generating recommendations: ' + error.message, 'error');
    }
};

/**
 * Display rebalancing recommendations
 */
function displayRebalancingRecommendations(result) {
    const recommendationsSection = document.getElementById('recommendationsSection');
    const impactPreview = document.getElementById('impactPreview');
    
    if (!result.needsRebalancing) {
        recommendationsSection.innerHTML = `
            <div class="alert alert-success">
                <strong>✅ Portfolio is well balanced!</strong>
                <p>${result.message}</p>
            </div>
        `;
        impactPreview.innerHTML = '';
        return;
    }
    
    // Display recommendations
    recommendationsSection.innerHTML = RebalancingManager.formatRecommendations(result.recommendations);
    
    // Display impact
    const impact = result.estimatedImpact;
    const improvementColor = impact.improvement > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)';
    
    impactPreview.innerHTML = `
        <div class="card card-ultra-compact">
            <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Before Drift</h4>
            <div style="font-size: 18px; font-weight: 600; color: var(--color-warning);">
                ${impact.beforeDrift.toFixed(1)}%
            </div>
        </div>
        <div class="card card-ultra-compact">
            <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">After Drift</h4>
            <div style="font-size: 18px; font-weight: 600; color: var(--color-success);">
                ~${impact.estimatedAfterDrift.toFixed(1)}%
            </div>
        </div>
        <div class="card card-ultra-compact">
            <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Improvement</h4>
            <div style="font-size: 18px; font-weight: 600; color: ${improvementColor};">
                ${impact.improvement.toFixed(0)}%
            </div>
        </div>
        <div class="card card-ultra-compact">
            <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Trades</h4>
            <div style="font-size: 18px; font-weight: 600;">
                ${impact.numberOfTrades}
            </div>
        </div>
        <div class="card card-ultra-compact">
            <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Est. Fees</h4>
            <div style="font-size: 18px; font-weight: 600; color: var(--color-danger);">
                ${Utils.formatCurrency(impact.estimatedFees, 'THB')}
            </div>
        </div>
        <div class="card card-ultra-compact">
            <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Net Cash Flow</h4>
            <div style="font-size: 18px; font-weight: 600; color: ${impact.netCashFlow >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                ${impact.netCashFlow >= 0 ? '+' : ''}${Utils.formatCurrency(impact.netCashFlow, 'THB')}
            </div>
        </div>
    `;
}

// ============================================================================
// REPORTS FUNCTIONS
// ============================================================================

let currentReportsPortfolioId = null;
let currentReportsTimeframe = '1M';
let currentReportsGranularity = 'day';
let currentTimelineChart = null;

/**
 * Load reports for selected portfolio
 */
window.loadReportsForPortfolio = function() {
    const portfolioId = document.getElementById('reportsPortfolioSelect').value;
    const reportsContent = document.getElementById('reportsContent');
    const emptyState = document.getElementById('reportsEmptyState');
    
    if (!portfolioId) {
        reportsContent.style.display = 'none';
        emptyState.style.display = 'none';
        return;
    }
    
    currentReportsPortfolioId = portfolioId;
    
    // Show content, hide empty state
    reportsContent.style.display = 'block';
    emptyState.style.display = 'none';
    
    // Load timeline chart
    renderTimelineChart(portfolioId, currentReportsTimeframe);
    
    // Load IRR/XIRR metrics (NEW)
    renderIRRMetrics(portfolioId);
    
    // Load cash flow timeline
    renderCashFlowTimeline(portfolioId);
};

/**
 * Change timeframe for reports
 */
window.changeTimeframe = function(timeframe) {
    if (!currentReportsPortfolioId) return;
    
    currentReportsTimeframe = timeframe;
    
    // Update button states
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        if (btn.getAttribute('data-timeframe') === timeframe) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary', 'active');
        } else {
            btn.classList.remove('btn-primary', 'active');
            btn.classList.add('btn-secondary');
        }
    });
    
    // Reload timeline chart
    renderTimelineChart(currentReportsPortfolioId, timeframe);
};

/**
 * Change granularity for timeline chart
 */
window.changeGranularity = function(granularity) {
    if (!currentReportsPortfolioId) return;
    
    currentReportsGranularity = granularity;
    
    // Update button states
    document.querySelectorAll('.granularity-btn').forEach(btn => {
        if (btn.getAttribute('data-granularity') === granularity) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary', 'active');
        } else {
            btn.classList.remove('btn-primary', 'active');
            btn.classList.add('btn-secondary');
        }
    });
    
    // Reload timeline chart with new granularity
    renderTimelineChart(currentReportsPortfolioId, currentReportsTimeframe);
};

/**
 * Render timeline chart
 */
function renderTimelineChart(portfolioId, timeframe) {
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;
    
    // Destroy existing chart
    if (currentTimelineChart) {
        currentTimelineChart.destroy();
        currentTimelineChart = null;
    }
    
    // Get as-of-date from global setting
    const asOfDate = App.getAsOfDate();
    
    // Generate timeline data with as-of-date and granularity
    const timelineData = ReportsManager.generateTimelineData(portfolioId, timeframe, asOfDate, currentReportsGranularity);
    
    if (timelineData.dates.length === 0) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Show notification if timeline is limited by history
    const chartContainer = canvas.parentElement;
    let historyNote = chartContainer.querySelector('.history-note');
    
    if (timelineData.limitedByHistory) {
        if (!historyNote) {
            historyNote = document.createElement('div');
            historyNote.className = 'history-note';
            historyNote.style.cssText = 'padding: 8px 12px; background: var(--color-info); color: white; border-radius: var(--radius-sm); font-size: 12px; margin-bottom: 8px;';
            chartContainer.insertBefore(historyNote, canvas);
        }
        const firstTxnDate = new Date(timelineData.firstTransactionDate);
        historyNote.innerHTML = `ℹ️ Portfolio started on ${firstTxnDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}. Showing actual history (not full ${timeframe} period).`;
    } else if (historyNote) {
        historyNote.remove();
    }
    
    // Format data for Chart.js with granularity-based labels
    const chartData = ReportsManager.formatTimelineForChart(timelineData, currentReportsGranularity);
    
    // Debug logging for chart data
    console.log('=== CHART DATA DEBUG ===');
    console.log('Number of datasets:', chartData.datasets.length);
    chartData.datasets.forEach((dataset, i) => {
        console.log(`Dataset ${i + 1}:`, dataset.label);
        console.log(`  - Data points:`, dataset.data.length);
        console.log(`  - Sample values:`, dataset.data.slice(-5));
        console.log(`  - Color:`, dataset.borderColor);
    });
    
    // Create chart
    currentTimelineChart = new Chart(canvas, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Value: ${Utils.formatCurrency(context.parsed.y, 'THB')}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return Utils.formatCurrency(value, 'THB', false);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render IRR/XIRR metrics (NEW)
 */
function renderIRRMetrics(portfolioId) {
    const metricsDiv = document.getElementById('irrMetricsContent');
    
    // Get as-of-date from global setting
    const asOfDate = App.getAsOfDate();
    
    // Calculate IRR/XIRR
    const irrResult = ReportsManager.calculateIRRMetrics(portfolioId, asOfDate);
    
    if (!irrResult || !irrResult.hasData) {
        metricsDiv.innerHTML = `
            <div class="alert alert-warning">
                <strong>⚠️ Unable to Calculate IRR</strong>
                <p>${irrResult?.message || 'Insufficient data'}</p>
                <p style="font-size: 12px; margin-top: 8px;">IRR calculation requires at least one deposit transaction and a current portfolio value.</p>
            </div>
        `;
        return;
    }
    
    const xirr = irrResult.xirr;
    const portfolio = PortfolioManager.getPortfolio(portfolioId);
    const firstDepositDate = irrResult.firstInvestmentDate;
    const totalDeposits = irrResult.totalInvested;
    
    // Get Total Asset as of value from transaction stats (same as shown in Transaction Menu and Cash Flow Timeline)
    const stats = TransactionManager.calculatePortfolioStats(portfolioId);
    const currentValue = stats.totalAssetValueAsOf;
    
    // Recalculate gain/loss using the Total Asset as of value
    const totalGainLoss = currentValue - totalDeposits;
    const duration = {
        years: Math.floor(irrResult.investmentPeriodYears),
        months: Math.round(irrResult.investmentPeriodMonths % 12)
    };
    
    // Color coding
    const xirrColor = xirr >= portfolio.weightedReturn ? 'var(--color-success)' : 'var(--color-warning)';
    const gainLossColor = totalGainLoss >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    
    // Performance assessment
    const performanceVsExpected = irrResult.performanceDiff;
    const performanceStatus = performanceVsExpected >= 0 ? 'outperforming' : 'underperforming';
    const performanceIcon = performanceVsExpected >= 0 ? '📈' : '📉';
    
    // Get IRR value (simple IRR with equal periods)
    const irr = irrResult.irr;
    const irrColor = irr >= portfolio.weightedReturn ? 'var(--color-success)' : 'var(--color-warning)';
    
    // Determine color for Performance vs Expected block
    const performanceColor = performanceVsExpected >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    
    // Render metrics with 4 blocks in one line - NEW ORDER: Total Gain/Loss, XIRR, Expected Return, Performance vs Expected
    metricsDiv.innerHTML = `
        <!-- Summary Cards - 4 blocks in one line -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); margin-bottom: var(--space-xl);">
            <div class="card">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Gain/Loss</h4>
                <div style="font-size: 28px; font-weight: 600; color: ${gainLossColor}; margin-bottom: 2px;">
                    ${totalGainLoss >= 0 ? '+' : ''}${Utils.formatCurrency(Math.abs(totalGainLoss), 'THB')}
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary);">
                    ${((totalGainLoss / totalDeposits) * 100).toFixed(2)}% total return
                </div>
            </div>
            
            <div class="card" style="background: linear-gradient(135deg, ${xirrColor}15, ${xirrColor}05); border-left: 4px solid ${xirrColor};">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">XIRR (Annualized Return)</h4>
                <div style="font-size: 28px; font-weight: 600; color: ${xirrColor}; margin-bottom: 2px;">
                    ${xirr >= 0 ? '+' : ''}${xirr.toFixed(2)}%
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary);">
                    Extended IRR
                </div>
            </div>
            
            <div class="card">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Expected Return</h4>
                <div style="font-size: 28px; font-weight: 600; color: var(--color-primary); margin-bottom: 2px;">
                    ${portfolio.weightedReturn.toFixed(2)}%
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary);">
                    Portfolio Target
                </div>
            </div>
            
            <div class="card" style="background: linear-gradient(135deg, ${performanceColor}15, ${performanceColor}05); border-left: 4px solid ${performanceColor};">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Performance vs Expected</h4>
                <div style="font-size: 28px; font-weight: 600; color: ${performanceColor}; margin-bottom: 2px;">
                    ${performanceVsExpected >= 0 ? '+' : ''}${performanceVsExpected.toFixed(2)}%
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary);">
                    ${performanceStatus} ${performanceIcon}
                </div>
            </div>
        </div>
        
        <!-- Investment Summary -->
        <div class="dashboard-grid" style="gap: var(--space-md); margin-bottom: var(--space-xl);">
            <div class="card card-ultra-compact">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Investment Period</h4>
                <div style="font-size: 18px; font-weight: 600;">
                    ${duration.years > 0 ? `${duration.years}Y ${duration.months}M` : `${duration.months}M`}
                </div>
                <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                    Since ${Utils.formatDate(firstDepositDate, 'dd-mmm-yyyy')}
                </div>
            </div>
            
            <div class="card card-ultra-compact">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Total Invested</h4>
                <div style="font-size: 18px; font-weight: 600; color: var(--color-info);">
                    ${Utils.formatCurrency(totalDeposits, 'THB')}
                </div>
            </div>
            
            <div class="card card-ultra-compact">
                <h4 class="text-secondary" style="font-size: 11px; margin-bottom: 2px;">Current Value</h4>
                <div style="font-size: 18px; font-weight: 600; color: var(--color-primary);">
                    ${Utils.formatCurrency(currentValue, 'THB')}
                </div>
            </div>
        </div>
        
        <!-- What is XIRR? -->
        <details style="margin-top: var(--space-xl);">
            <summary style="cursor: pointer; font-weight: 600; padding: var(--space-md); background: var(--color-background-gray); border-radius: var(--radius-md); list-style: none;">
                <span style="font-size: 16px;">📚 What is XIRR?</span>
                <span style="float: right; font-size: 12px; color: var(--color-text-secondary);">Click to learn more</span>
            </summary>
            <div style="padding: var(--space-lg); background: var(--color-bg-secondary); border-radius: var(--radius-md); margin-top: var(--space-sm);">
                <h4>Internal Rate of Return (IRR / XIRR)</h4>
                <p style="margin-top: var(--space-sm); line-height: 1.6;">
                    <strong>XIRR (Extended Internal Rate of Return)</strong> is the gold standard for calculating returns on investments with multiple cash flows at irregular intervals, such as DCA (Dollar Cost Averaging) strategies.
                </p>
                <p style="margin-top: var(--space-sm); line-height: 1.6;">
                    Unlike simple return percentages, XIRR accounts for:
                </p>
                <ul style="margin-top: var(--space-sm); padding-left: var(--space-lg); line-height: 1.8;">
                    <li><strong>Timing of investments:</strong> Money invested earlier has more time to grow</li>
                    <li><strong>Multiple deposits:</strong> Each monthly investment is treated separately</li>
                    <li><strong>Compound growth:</strong> Returns are compounded over the actual time period</li>
                </ul>
                <p style="margin-top: var(--space-md); line-height: 1.6;">
                    <strong>Formula:</strong> XIRR solves for the rate <em>r</em> where:
                </p>
                <div style="padding: var(--space-md); background: var(--color-bg); border-radius: var(--radius-sm); margin-top: var(--space-sm); font-family: monospace; text-align: center;">
                    Σ (Cash Flow<sub>t</sub> / (1 + r)<sup>years<sub>t</sub></sup>) = 0
                </div>
                <p style="margin-top: var(--space-md); line-height: 1.6; font-size: 12px; color: var(--color-text-secondary);">
                    This calculation uses the Newton-Raphson iterative method to find the precise annualized rate of return.
                </p>
            </div>
        </details>
    `;
}

/**
 * Render cash flow timeline
 */
function renderCashFlowTimeline(portfolioId) {
    const timelineDiv = document.getElementById('cashFlowTimeline');
    
    // Get as-of-date from global setting
    const asOfDate = App.getAsOfDate();
    
    // Get cash flows
    const cashFlows = ReportsManager.extractCashFlows(portfolioId, asOfDate);
    
    if (cashFlows.length === 0) {
        timelineDiv.innerHTML = `
            <div style="text-align: center; padding: var(--space-xl); color: var(--color-text-secondary);">
                No deposit transactions found for this portfolio
            </div>
        `;
        return;
    }
    
    // Get total asset value as of from transaction stats
    const stats = TransactionManager.calculatePortfolioStats(portfolioId);
    const totalAssetValueAsOf = stats.totalAssetValueAsOf;
    
    // Calculate cumulative totals (deposits only, last row will show total asset)
    let cumulativeDeposits = 0;
    const enrichedFlows = cashFlows.map((cf, index) => {
        // For all rows except the last one (which is "current"), add to cumulative
        if (index < cashFlows.length - 1) {
            cumulativeDeposits += Math.abs(cf.amount);
        }
        return {
            ...cf,
            cumulative: cumulativeDeposits,
            isLastRow: index === cashFlows.length - 1
        };
    });
    
    // Render table
    timelineDiv.innerHTML = `
        <table class="data-table" style="width: 100%;">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Cumulative</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${enrichedFlows.map(cf => `
                    <tr>
                        <td>${Utils.formatDate(cf.date, 'dd-mmm-yyyy')}</td>
                        <td>
                            <span class="status-badge ${cf.isLastRow ? 'status-success' : 'status-info'}">
                                ${cf.isLastRow ? '📊 TOTAL ASSET' : '💰 DEPOSIT'}
                            </span>
                        </td>
                        <td style="font-weight: 600; color: ${cf.isLastRow ? 'var(--color-success)' : 'var(--color-info)'};">
                            ${cf.isLastRow ? Utils.formatCurrency(totalAssetValueAsOf, 'THB') : Utils.formatCurrency(Math.abs(cf.amount), 'THB')}
                        </td>
                        <td style="font-weight: 600;">
                            ${cf.isLastRow ? Utils.formatCurrency(totalAssetValueAsOf, 'THB') : Utils.formatCurrency(cf.cumulative, 'THB')}
                        </td>
                        <td style="font-size: 12px; color: var(--color-text-secondary);">
                            ${cf.isLastRow ? 'Total Asset as of ' + asOfDate : (cf.description || '-')}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr style="font-weight: 600; background: var(--color-bg-secondary);">
                    <td colspan="2">Total Deposits</td>
                    <td style="color: var(--color-info);">
                        ${Utils.formatCurrency(cumulativeDeposits, 'THB')}
                    </td>
                    <td colspan="2">${enrichedFlows.length - 1} deposit${enrichedFlows.length - 1 !== 1 ? 's' : ''}</td>
                </tr>
            </tfoot>
        </table>
    `;
}

// ============================================================================
// Account Transaction Type Selector Modal Functions
// ============================================================================

let currentAccountForTransaction = null;

/**
 * Show account transaction type selector modal
 */
function showAccountTransactionTypeSelector(accountId) {
    currentAccountForTransaction = accountId;

    // Get account name
    const account = AccountManager.getAccount(accountId);
    if (!account) {
        Utils.showNotification('Account not found', 'error');
        return;
    }

    // Update account name in modal
    document.getElementById('accountTransactionTypeName').textContent = account.name;

    // Show modal
    Utils.toggleElement('#accountTransactionTypeSelectorModal', true);
}

/**
 * Hide account transaction type selector modal
 */
function hideAccountTransactionTypeSelector() {
    Utils.toggleElement('#accountTransactionTypeSelectorModal', false);
    currentAccountForTransaction = null;
}

/**
 * Select account transaction type and show appropriate form
 */
function selectAccountTransactionType(type) {
    console.log('🔵 selectAccountTransactionType called with type:', type);
    console.log('🔵 currentAccountForTransaction:', currentAccountForTransaction);

    if (!currentAccountForTransaction) {
        console.error('❌ No account selected!');
        Utils.showNotification('No account selected', 'error');
        return;
    }

    // Save accountId to local variable BEFORE hiding modal
    const accountId = currentAccountForTransaction;
    console.log('🔵 Saved accountId:', accountId);

    // Hide selector modal (this sets currentAccountForTransaction = null)
    hideAccountTransactionTypeSelector();
    console.log('🔵 Selector modal hidden');

    // Show appropriate transaction modal with saved accountId
    switch(type) {
        case 'DEPOSIT':
            console.log('🔵 About to call showDepositModal with accountId:', accountId);
            showDepositModal(accountId);
            console.log('🔵 showDepositModal call completed');
            break;
        case 'WITHDRAW':
            showWithdrawModal(accountId);
            break;
        case 'TRANSFER':
            showTransferModal(accountId);
            break;
        case 'INTEREST':
            showInterestModal(accountId);
            break;
        default:
            Utils.showNotification('Unknown transaction type', 'error');
    }
}

/**
 * Show FIFO Lot Report Modal - Global report for all FCD accounts
 */
function showFIFOLotReport() {
    // Get all accounts and filter for FCD accounts
    const allAccounts = AccountManager.getAllAccounts();
    const fcdAccounts = allAccounts.filter(acc => acc.type === 'fcd_account');

    if (fcdAccounts.length === 0) {
        Utils.showNotification('No FCD accounts found', 'info');
        return;
    }

    // Get all USD currency lots
    const allLots = FIFOManager.getAllLots();
    const usdLots = allLots.filter(lot => lot.assetId === 'USD_CURRENCY');

    if (usdLots.length === 0) {
        const modal = document.getElementById('fifoLotReportModal');
        const content = document.getElementById('fifoLotReportContent');

        content.innerHTML = `
            <div style="padding: var(--space-lg); text-align: center;">
                <p style="color: var(--color-text-secondary); margin-bottom: var(--space-md);">
                    No FIFO lots found.
                </p>
                <p style="font-size: 14px; color: var(--color-text-secondary);">
                    FIFO lots are created when you deposit USD into FCD accounts.
                </p>
            </div>
        `;

        Utils.toggleElement(modal, true);
        return;
    }

    // Get portfolio and account information for each lot
    usdLots.forEach(lot => {
        const account = allAccounts.find(acc => acc.id === lot.accountId);
        if (account) {
            lot.accountName = account.name;
            lot.portfolioId = account.portfolioId;

            const portfolio = PortfolioManager.getPortfolio(account.portfolioId);
            lot.portfolioName = portfolio ? portfolio.name : 'Unknown';
        }
    });

    // For consumed lots, find which transactions used them
    const assetTransactions = StorageManager.loadFromLocal('assetTransactions') || [];
    usdLots.forEach(lot => {
        if (lot.status === 'CLOSED') {
            const buyTx = assetTransactions.find(tx =>
                tx.type === 'BUY' &&
                tx.usdLotsUsed &&
                tx.usdLotsUsed.some(used => used.lotId === lot.id)
            );
            lot.consumedByTransaction = buyTx;
        }
    });

    // Sort by purchase date (newest first)
    usdLots.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

    // Render the simple table
    renderFIFOLotTable(usdLots);

    // Show modal
    const modal = document.getElementById('fifoLotReportModal');
    Utils.toggleElement(modal, true);
}

/**
 * Close FIFO Lot Report Modal
 */
function closeFIFOLotReportModal() {
    const modal = document.getElementById('fifoLotReportModal');
    Utils.toggleElement(modal, false);

    // Clear content
    const content = document.getElementById('fifoLotReportContent');
    content.innerHTML = '';
}

/**
 * Render FIFO Lot Table - Simple tabular report for all lots
 * @param {array} lots - All USD currency lots
 */
function renderFIFOLotTable(lots) {
    const content = document.getElementById('fifoLotReportContent');

    // Calculate summary statistics
    const activeLots = lots.filter(lot => lot.status === 'OPEN');
    const totalActiveAmount = activeLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
    const totalActiveCostBasis = activeLots.reduce((sum, lot) =>
        sum + (lot.remainingQuantity * lot.pricePerUnit), 0
    );

    let html = `
        <div style="margin-bottom: var(--space-lg);">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); background-color: var(--color-bg-secondary); border-radius: var(--radius-md);">
                <div>
                    <div style="font-size: 14px; color: var(--color-text-secondary);">Total Lots</div>
                    <div style="font-weight: 600; font-size: 20px;">${lots.length}</div>
                </div>
                <div>
                    <div style="font-size: 14px; color: var(--color-text-secondary);">Active Lots</div>
                    <div style="font-weight: 600; font-size: 20px; color: var(--color-success);">${activeLots.length}</div>
                </div>
                <div>
                    <div style="font-size: 14px; color: var(--color-text-secondary);">Total USD Available</div>
                    <div style="font-weight: 600; font-size: 20px; color: var(--color-success);">$${Utils.formatCurrency(totalActiveAmount, 'USD')}</div>
                </div>
                <div>
                    <div style="font-size: 14px; color: var(--color-text-secondary);">Total Cost (THB)</div>
                    <div style="font-weight: 600; font-size: 20px;">฿${Utils.formatCurrency(totalActiveCostBasis, 'THB')}</div>
                </div>
            </div>
        </div>

        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Portfolio</th>
                        <th>Account</th>
                        <th style="text-align: right;">Amount (USD)</th>
                        <th style="text-align: right;">Remaining</th>
                        <th style="text-align: right;">Exchange Rate</th>
                        <th style="text-align: right;">Cost Basis (THB)</th>
                        <th style="text-align: center;">Status</th>
                        <th>Used By</th>
                    </tr>
                </thead>
                <tbody>
    `;

    lots.forEach(lot => {
        const statusBadge = lot.status === 'OPEN'
            ? '<span class="badge badge-success">OPEN</span>'
            : '<span class="badge badge-secondary">CLOSED</span>';

        const tx = lot.consumedByTransaction;
        const usedBy = lot.status === 'CLOSED' && tx
            ? `${tx.assetTicker || tx.assetName || 'Unknown'} (${Utils.formatDate(tx.date)})`
            : '-';

        const remainingDisplay = lot.status === 'OPEN'
            ? `$${Utils.formatCurrency(lot.remainingQuantity, 'USD')}`
            : '-';

        html += `
            <tr>
                <td>${Utils.formatDate(lot.purchaseDate)}</td>
                <td>${lot.portfolioName || 'Unknown'}</td>
                <td>${lot.accountName || 'Unknown'}</td>
                <td style="text-align: right;">$${Utils.formatCurrency(lot.quantity, 'USD')}</td>
                <td style="text-align: right;">${remainingDisplay}</td>
                <td style="text-align: right;">฿${lot.pricePerUnit.toFixed(2)}</td>
                <td style="text-align: right;">฿${Utils.formatCurrency(lot.costBasisTHB, 'THB')}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td>${usedBy}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    content.innerHTML = html;
}

// Export modal functions to window scope for HTML onclick handlers
window.showAccountTransactionTypeSelector = showAccountTransactionTypeSelector;
window.hideAccountTransactionTypeSelector = hideAccountTransactionTypeSelector;
window.selectAccountTransactionType = selectAccountTransactionType;
window.showFIFOLotReport = showFIFOLotReport;
window.closeFIFOLotReportModal = closeFIFOLotReportModal;

// Export for use in other modules
window.App = App;
