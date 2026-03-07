/* ============================================================================
   EXPORT MANAGER
   Excel export functionality for portfolios, transactions, and reports
   ============================================================================ */

const ExportManager = {
    /**
     * Initialize export manager
     */
    init() {
        console.log('Export Manager initialized');
    },

    /**
     * Main export function - exports all data to Excel
     */
    exportToExcel() {
        try {
            console.log('Starting Excel export...');
            
            // Check if XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                throw new Error('Excel library not loaded. Please check your internet connection.');
            }

            // Get all data
            const portfolios = PortfolioManager.getAllPortfolios();
            const accounts = AccountManager.getAllAccounts();
            const transactions = TransactionManager.getTransactions();
            const lots = FIFOManager.getAllLots();
            const sales = FIFOManager.getAllSales();

            if (portfolios.length === 0) {
                Utils.showNotification('No data to export. Create a portfolio first.', 'warning');
                return;
            }

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Add Portfolios sheet
            this.addAllPortfoliosSheet(wb, portfolios);

            // Add Portfolio Assets sheet (detailed asset list)
            this.addAllPortfolioAssetsSheet(wb, portfolios);

            // Add Accounts sheet
            this.addAllAccountsSheet(wb, accounts);

            // Add Transactions sheet
            this.addAllTransactionsSheet(wb, transactions);

            // Add FIFO Lots sheet
            this.addAllFIFOLotsSheet(wb, lots, portfolios);

            // Add Sales sheet
            this.addAllSalesSheet(wb, sales, portfolios);

            // Generate filename with timestamp
            const date = new Date().toISOString().split('T')[0];
            const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `PortfolioManager_Export_${date}_${time}.xlsx`;

            // Save file
            XLSX.writeFile(wb, filename);
            
            console.log('Export completed successfully');
            Utils.showNotification('Data exported successfully to Excel!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            Utils.showNotification(`Export failed: ${error.message}`, 'error');
            alert(`Export Error: ${error.message}\n\nPlease check the console for details.`);
        }
    },

    /**
     * Add all portfolios to a sheet
     */
    addAllPortfoliosSheet(wb, portfolios) {
        const data = [
            ['Portfolio Name', 'Description', 'Created Date', 'Asset Count', 'Total Allocation %']
        ];

        portfolios.forEach(p => {
            data.push([
                p.name,
                p.description || '',
                new Date(p.createdDate).toLocaleDateString(),
                p.assets.length,
                p.totalAllocation || 100
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ width: 25 }, { width: 40 }, { width: 15 }, { width: 12 }, { width: 18 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Portfolios');
    },

    /**
     * Add all portfolio assets to a sheet with detailed information
     */
    addAllPortfolioAssetsSheet(wb, portfolios) {
        const data = [
            ['Portfolio Name', 'Asset Name', 'Ticker', 'Type', 'Sub Type', 'Target Allocation %', 'Risk Level', 'Currency', 'Platform', 'Notes']
        ];

        portfolios.forEach(portfolio => {
            portfolio.assets.forEach(asset => {
                data.push([
                    portfolio.name,
                    asset.name,
                    asset.ticker || asset.name,
                    asset.type || 'ETF',
                    asset.subType || '',
                    asset.allocation || asset.targetAllocation || 0,
                    asset.riskLevel || 'medium',
                    asset.currency || 'USD',
                    asset.platform || '',
                    asset.notes || ''
                ]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 25 }, { width: 30 }, { width: 15 }, { width: 15 },
            { width: 15 }, { width: 18 }, { width: 12 }, { width: 10 },
            { width: 20 }, { width: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Portfolio Assets');
    },

    /**
     * Add all accounts to a sheet
     */
    addAllAccountsSheet(wb, accounts) {
        const data = [
            ['Portfolio', 'Account Name', 'Type', 'Currency', 'Balance', 'Institution', 'Account Number', 'Linked Asset ID', 'Linked Asset Name', 'Linked Asset Type', 'Created Date']
        ];

        accounts.forEach(acc => {
            const portfolio = PortfolioManager.getPortfolio(acc.portfolioId);
            const typeName = acc.type === 'thb_savings' ? 'THB Savings' : 'FCD Account (USD)';
            
            data.push([
                portfolio ? portfolio.name : 'Unknown',
                acc.name,
                typeName,
                acc.currency,
                acc.balance.toFixed(2),
                acc.institution || '',
                acc.accountNumber || '',
                acc.linkedAssetId || '',
                acc.linkedAssetName || '',
                acc.linkedAssetType || '',
                new Date(acc.createdDate).toLocaleDateString()
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 20 }, { width: 25 }, { width: 18 }, { width: 10 },
            { width: 15 }, { width: 20 }, { width: 18 }, { width: 20 },
            { width: 25 }, { width: 20 }, { width: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
    },

    /**
     * Add all transactions to a sheet
     */
    addAllTransactionsSheet(wb, transactions) {
        const data = [
            ['Date', 'Portfolio', 'Type', 'Asset', 'Quantity', 'Price/Unit', 'Total Amount', 'Fee', 'Currency', 'Exchange Rate', 'Account', 'Destination Account', 'Notes', 'Portfolio ID', 'Asset ID', 'Account ID', 'Destination Account ID']
        ];

        transactions.forEach(txn => {
            const portfolio = PortfolioManager.getPortfolio(txn.portfolioId);
            const account = txn.accountId ? AccountManager.getAccount(txn.accountId) : null;
            const destAccount = txn.destinationAccountId ? AccountManager.getAccount(txn.destinationAccountId) : null;
            
            // Special handling for exchange rate
            let exchangeRateValue = '1';
            if (txn.exchangeRate && txn.exchangeRate !== 1) {
                exchangeRateValue = txn.exchangeRate.toFixed(4);
            } else if (txn.type === 'TRANSFER' && txn.destinationAmount && txn.totalAmount) {
                // Calculate exchange rate from transfer amounts if not stored
                const calculatedRate = txn.totalAmount / txn.destinationAmount;
                if (calculatedRate !== 1) {
                    exchangeRateValue = calculatedRate.toFixed(4);
                }
            }
            
            data.push([
                new Date(txn.date).toLocaleDateString(),
                portfolio ? portfolio.name : (txn.portfolioId ? 'Unknown' : ''),
                txn.type,
                txn.assetName || txn.assetTicker || 'N/A',
                txn.quantity || '',
                txn.pricePerUnit || '',
                txn.totalAmount ? txn.totalAmount.toFixed(2) : '',
                txn.fee ? txn.fee.toFixed(2) : '0',
                txn.currency || 'THB',
                exchangeRateValue,
                account ? account.name : (txn.accountId ? 'Unknown' : 'Manual'),
                destAccount ? destAccount.name : (txn.destinationAccountId ? 'Unknown' : ''),
                txn.notes || '',
                txn.portfolioId || '',
                txn.assetId || '',
                txn.accountId || '',
                txn.destinationAccountId || ''
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 12 }, { width: 20 }, { width: 12 }, { width: 20 },
            { width: 15 }, { width: 12 }, { width: 15 }, { width: 10 },
            { width: 10 }, { width: 15 }, { width: 20 }, { width: 20 },
            { width: 40 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    },

    /**
     * Add all FIFO lots to a sheet
     */
    addAllFIFOLotsSheet(wb, lots, portfolios) {
        const data = [
            ['Portfolio', 'Asset ID', 'Purchase Date', 'Quantity', 'Remaining Qty', 'Price/Unit', 'Currency', 'Exchange Rate', 'Cost Basis (THB)', 'Status', 'Created At']
        ];

        lots.forEach(lot => {
            const portfolio = portfolios.find(p => p.id === lot.portfolioId);
            
            data.push([
                portfolio ? portfolio.name : 'Unknown',
                lot.assetId === 'USD_CURRENCY' ? 'USD_CURRENCY' : lot.assetId,
                new Date(lot.purchaseDate).toLocaleDateString(),
                lot.quantity.toFixed(8),
                lot.remainingQuantity.toFixed(8),
                lot.pricePerUnit.toFixed(6),
                lot.currency,
                lot.exchangeRate.toFixed(4),
                lot.costBasisTHB.toFixed(2),
                lot.status,
                new Date(lot.createdAt).toLocaleDateString()
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 20 }, { width: 25 }, { width: 15 }, { width: 15 },
            { width: 15 }, { width: 12 }, { width: 10 }, { width: 15 },
            { width: 18 }, { width: 10 }, { width: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'FIFO Lots');
    },

    /**
     * Add all sales to a sheet
     */
    addAllSalesSheet(wb, sales, portfolios) {
        const data = [
            ['Portfolio', 'Asset ID', 'Sale Date', 'Quantity Sold', 'Avg Purchase Price', 'Sale Price', 'Cost Basis (THB)', 'Proceeds (THB)', 'Realized Gain (THB)', 'Return %']
        ];

        sales.forEach(sale => {
            const portfolio = portfolios.find(p => p.id === sale.portfolioId);
            const returnPct = sale.totalCostBasisTHB > 0 
                ? ((sale.realizedGainTHB / sale.totalCostBasisTHB) * 100).toFixed(2) 
                : '0.00';
            
            data.push([
                portfolio ? portfolio.name : 'Unknown',
                sale.assetId,
                new Date(sale.saleDate).toLocaleDateString(),
                sale.quantitySold.toFixed(8),
                sale.avgPurchasePrice.toFixed(6),
                sale.salePrice.toFixed(6),
                sale.totalCostBasisTHB.toFixed(2),
                sale.totalProceedsTHB.toFixed(2),
                sale.realizedGainTHB.toFixed(2),
                returnPct + '%'
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 20 }, { width: 25 }, { width: 12 }, { width: 15 },
            { width: 18 }, { width: 12 }, { width: 18 }, { width: 18 },
            { width: 20 }, { width: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'FIFO Sales');
    },

    /**
     * Export a single portfolio to Excel
     * @param {string} portfolioId - Portfolio ID to export
     * @param {object} options - Export options
     */
    async exportPortfolio(portfolioId, options = {}) {
        try {
            const portfolio = PortfolioManager.getPortfolio(portfolioId);
            if (!portfolio) {
                throw new Error('Portfolio not found');
            }

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Default options
            const opts = {
                includeSummary: true,
                includeAssets: true,
                includeTransactions: true,
                includeAccounts: true,
                includeFIFO: true,
                includeSales: true,
                includePerformance: true,
                ...options
            };

            // Add sheets based on options
            if (opts.includeSummary) {
                this.addSummarySheet(wb, portfolio);
            }

            if (opts.includeAssets) {
                this.addAssetsSheet(wb, portfolio);
            }

            if (opts.includeTransactions) {
                this.addTransactionsSheet(wb, portfolio, opts);
            }

            if (opts.includeAccounts) {
                this.addAccountsSheet(wb, portfolio);
            }

            if (opts.includeFIFO && window.FIFOManager) {
                this.addFIFOLotsSheet(wb, portfolio);
            }

            if (opts.includeSales && window.FIFOManager) {
                this.addSalesHistorySheet(wb, portfolio);
            }

            if (opts.includePerformance) {
                this.addPerformanceSheet(wb, portfolio);
            }

            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `${portfolio.name.replace(/[^a-z0-9]/gi, '_')}_${date}.xlsx`;

            // Save file
            XLSX.writeFile(wb, filename);
            
            Utils.showNotification(`Portfolio exported successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            Utils.showNotification(`Export failed: ${error.message}`, 'error');
        }
    },

    /**
     * Export all portfolios to Excel
     * @param {object} options - Export options
     */
    async exportAllPortfolios(options = {}) {
        try {
            const portfolios = PortfolioManager.getAllPortfolios();
            if (portfolios.length === 0) {
                throw new Error('No portfolios to export');
            }

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Add overview sheet
            this.addOverviewSheet(wb, portfolios);

            // Add sheets for each portfolio
            for (const portfolio of portfolios) {
                this.addPortfolioSummarySheet(wb, portfolio);
            }

            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `All_Portfolios_${date}.xlsx`;

            // Save file
            XLSX.writeFile(wb, filename);
            
            Utils.showNotification(`All portfolios exported successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            Utils.showNotification(`Export failed: ${error.message}`, 'error');
        }
    },

    /**
     * Add summary sheet for a portfolio
     */
    addSummarySheet(wb, portfolio) {
        const stats = TransactionManager.calculatePortfolioStats(portfolio.id);
        const exchangeRate = window.getExchangeRate ? window.getExchangeRate() : 35;

        const data = [
            ['Portfolio Summary'],
            [],
            ['Portfolio Name', portfolio.name],
            ['Description', portfolio.description || 'N/A'],
            ['Created Date', new Date(portfolio.createdAt).toLocaleDateString()],
            ['Number of Assets', portfolio.assets.length],
            [],
            ['Financial Summary'],
            ['Total Deposits', Utils.formatCurrency(stats.totalDeposits, 'THB')],
            ['Total Asset Value', Utils.formatCurrency(stats.totalAssetValueAsOf, 'THB')],
            ['Total Gain/Loss', Utils.formatCurrency(stats.totalGainLossAsOf, 'THB')],
            ['Return %', `${((stats.totalGainLossAsOf / stats.totalDeposits) * 100).toFixed(2)}%`],
            ['Account Balances', Utils.formatCurrency(stats.accountBalances, 'THB')],
            ['Total Fees Paid', Utils.formatCurrency(stats.totalFees, 'THB')],
            ['Exchange Rate Used', `1 USD = ${exchangeRate.toFixed(2)} THB`],
            [],
            ['Transaction Summary'],
            ['Total Transactions', stats.transactionCount],
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths
        ws['!cols'] = [{ width: 25 }, { width: 25 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    },

    /**
     * Add assets sheet
     */
    addAssetsSheet(wb, portfolio) {
        const positions = TransactionManager.getPortfolioPositions(portfolio.id);
        const exchangeRate = window.getExchangeRate ? window.getExchangeRate() : 35;

        const data = [
            ['Asset Holdings'],
            [],
            ['Asset Name', 'Ticker', 'Type', 'Quantity', 'Avg Cost', 'Current Price', 'Current Value', 'Currency', 'Gain/Loss', 'Return %']
        ];

        portfolio.assets.forEach(asset => {
            const position = positions.find(p => p.assetId === asset.id);
            const priceData = PriceManager.getCurrentPrice(asset.id);
            
            let quantity = position ? position.quantity : 0;
            let avgCost = position ? position.averageCost : 0;
            let currentPrice = priceData ? priceData.price : 0;
            let currency = priceData ? priceData.currency : 'USD';
            
            // Convert to THB for calculation
            let currentValueTHB = 0;
            if (currency === 'USD') {
                currentValueTHB = quantity * currentPrice * exchangeRate;
            } else {
                currentValueTHB = quantity * currentPrice;
            }
            
            let costBasisTHB = position ? position.totalCost : 0;
            let gainLoss = currentValueTHB - costBasisTHB;
            let returnPct = costBasisTHB > 0 ? (gainLoss / costBasisTHB) * 100 : 0;

            data.push([
                asset.name,
                asset.ticker || 'N/A',
                asset.type,
                quantity.toFixed(8),
                avgCost.toFixed(2),
                currentPrice.toFixed(2),
                currentValueTHB.toFixed(2),
                currency,
                gainLoss.toFixed(2),
                returnPct.toFixed(2) + '%'
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 20 }, { width: 10 }, { width: 15 }, { width: 15 },
            { width: 12 }, { width: 15 }, { width: 15 }, { width: 10 },
            { width: 15 }, { width: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    },

    /**
     * Add transactions sheet
     */
    addTransactionsSheet(wb, portfolio, options) {
        const transactions = TransactionManager.getTransactions({ 
            portfolioId: portfolio.id,
            startDate: options.startDate,
            endDate: options.endDate
        });

        const data = [
            ['Transaction History'],
            [],
            ['Date', 'Type', 'Asset', 'Quantity', 'Price', 'Total', 'Fee', 'Currency', 'Exchange Rate', 'Account', 'Notes']
        ];

        transactions.forEach(txn => {
            data.push([
                new Date(txn.date).toLocaleDateString(),
                txn.type,
                txn.assetName || txn.assetTicker || 'N/A',
                txn.quantity || '',
                txn.pricePerUnit || '',
                txn.totalAmount.toFixed(2),
                txn.fee.toFixed(2),
                txn.currency,
                txn.exchangeRate ? txn.exchangeRate.toFixed(4) : '1',
                txn.accountId ? AccountManager.getAccount(txn.accountId)?.name || 'N/A' : 'Manual',
                txn.notes || ''
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 12 }, { width: 12 }, { width: 20 }, { width: 15 },
            { width: 12 }, { width: 15 }, { width: 10 }, { width: 10 },
            { width: 15 }, { width: 20 }, { width: 30 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    },

    /**
     * Add accounts sheet
     */
    addAccountsSheet(wb, portfolio) {
        const accounts = AccountManager.getAccountsByPortfolio(portfolio.id);

        const data = [
            ['Account Balances'],
            [],
            ['Account Name', 'Type', 'Institution', 'Balance', 'Currency', 'Created Date']
        ];

        accounts.forEach(acc => {
            data.push([
                acc.name,
                acc.type === 'thb_savings' ? 'THB Savings' : 'FCD Account',
                acc.institution || 'N/A',
                acc.balance.toFixed(2),
                acc.currency,
                new Date(acc.createdAt).toLocaleDateString()
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 25 }, { width: 15 }, { width: 20 }, { width: 15 },
            { width: 10 }, { width: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
    },

    /**
     * Add FIFO lots sheet
     */
    addFIFOLotsSheet(wb, portfolio) {
        const data = [
            ['FIFO Lot Details'],
            [],
            ['Asset', 'Purchase Date', 'Quantity', 'Remaining', 'Price/Unit', 'Cost Basis (THB)', 'Status', 'Currency', 'Exchange Rate']
        ];

        portfolio.assets.forEach(asset => {
            const lots = FIFOManager.getAssetLots(portfolio.id, asset.id);
            
            lots.forEach(lot => {
                data.push([
                    asset.name,
                    new Date(lot.purchaseDate).toLocaleDateString(),
                    lot.quantity.toFixed(8),
                    lot.remainingQuantity.toFixed(8),
                    lot.pricePerUnit.toFixed(2),
                    lot.costBasisTHB.toFixed(2),
                    lot.status,
                    lot.currency,
                    lot.exchangeRate.toFixed(4)
                ]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 },
            { width: 12 }, { width: 18 }, { width: 10 }, { width: 10 },
            { width: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'FIFO Lots');
    },

    /**
     * Add sales history sheet
     */
    addSalesHistorySheet(wb, portfolio) {
        const sales = FIFOManager.getSaleHistory(portfolio.id);

        const data = [
            ['Sales History'],
            [],
            ['Sale Date', 'Asset', 'Quantity', 'Avg Purchase Price', 'Sale Price', 'Cost Basis (THB)', 'Proceeds (THB)', 'Realized Gain (THB)', 'Return %']
        ];

        sales.forEach(sale => {
            const asset = portfolio.assets.find(a => a.id === sale.assetId);
            const returnPct = ((sale.realizedGainTHB / sale.totalCostBasisTHB) * 100).toFixed(2);
            
            data.push([
                new Date(sale.saleDate).toLocaleDateString(),
                asset ? asset.name : 'Unknown',
                sale.quantitySold.toFixed(8),
                sale.avgPurchasePrice.toFixed(2),
                sale.salePrice.toFixed(2),
                sale.totalCostBasisTHB.toFixed(2),
                sale.totalProceedsTHB.toFixed(2),
                sale.realizedGainTHB.toFixed(2),
                returnPct + '%'
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 12 }, { width: 20 }, { width: 12 }, { width: 18 },
            { width: 12 }, { width: 18 }, { width: 18 }, { width: 20 },
            { width: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Sales History');
    },

    /**
     * Add performance metrics sheet
     */
    addPerformanceSheet(wb, portfolio) {
        const stats = TransactionManager.calculatePortfolioStats(portfolio.id);
        
        const data = [
            ['Performance Metrics'],
            [],
            ['Metric', 'Value'],
            [],
            ['Return Metrics'],
            ['Total Return (THB)', Utils.formatCurrency(stats.totalGainLossAsOf, 'THB')],
            ['Total Return (%)', `${((stats.totalGainLossAsOf / stats.totalDeposits) * 100).toFixed(2)}%`],
            ['Total Deposits', Utils.formatCurrency(stats.totalDeposits, 'THB')],
            ['Current Value', Utils.formatCurrency(stats.totalAssetValueAsOf, 'THB')],
            [],
            ['Income Summary'],
            ['Total Dividends', Utils.formatCurrency(stats.totalDividends, 'THB')],
            ['Total Fees', Utils.formatCurrency(stats.totalFees, 'THB')],
            ['Net Income', Utils.formatCurrency(stats.totalDividends - stats.totalFees, 'THB')],
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ width: 25 }, { width: 25 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Performance');
    },

    /**
     * Add overview sheet for all portfolios
     */
    addOverviewSheet(wb, portfolios) {
        const data = [
            ['All Portfolios Overview'],
            [],
            ['Portfolio Name', 'Total Deposits', 'Current Value', 'Gain/Loss', 'Return %', 'Assets', 'Accounts']
        ];

        let totalDeposits = 0;
        let totalValue = 0;
        let totalGainLoss = 0;

        portfolios.forEach(portfolio => {
            const stats = TransactionManager.calculatePortfolioStats(portfolio.id);
            const accounts = AccountManager.getAccountsByPortfolio(portfolio.id);
            const returnPct = ((stats.totalGainLossAsOf / stats.totalDeposits) * 100).toFixed(2);

            totalDeposits += stats.totalDeposits;
            totalValue += stats.totalAssetValueAsOf;
            totalGainLoss += stats.totalGainLossAsOf;

            data.push([
                portfolio.name,
                stats.totalDeposits.toFixed(2),
                stats.totalAssetValueAsOf.toFixed(2),
                stats.totalGainLossAsOf.toFixed(2),
                returnPct + '%',
                portfolio.assets.length,
                accounts.length
            ]);
        });

        // Add totals row
        data.push([]);
        data.push([
            'TOTAL',
            totalDeposits.toFixed(2),
            totalValue.toFixed(2),
            totalGainLoss.toFixed(2),
            ((totalGainLoss / totalDeposits) * 100).toFixed(2) + '%',
            '',
            ''
        ]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 },
            { width: 12 }, { width: 10 }, { width: 10 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Overview');
    },

    /**
     * Add individual portfolio summary sheet (for all portfolios export)
     */
    addPortfolioSummarySheet(wb, portfolio) {
        const stats = TransactionManager.calculatePortfolioStats(portfolio.id);
        
        const data = [
            [portfolio.name],
            [],
            ['Total Deposits', Utils.formatCurrency(stats.totalDeposits, 'THB')],
            ['Current Value', Utils.formatCurrency(stats.totalAssetValueAsOf, 'THB')],
            ['Gain/Loss', Utils.formatCurrency(stats.totalGainLossAsOf, 'THB')],
            ['Return %', `${((stats.totalGainLossAsOf / stats.totalDeposits) * 100).toFixed(2)}%`],
            ['Assets', portfolio.assets.length],
            ['Transactions', stats.transactionCount]
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ width: 20 }, { width: 25 }];

        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = portfolio.name.substring(0, 28).replace(/[^a-z0-9 ]/gi, '_');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
};

/* ============================================================================
   IMPORT MANAGER
   Excel import functionality for restoring portfolios, transactions, and data
   ============================================================================ */

const ImportManager = {
    /**
     * Initialize import manager
     */
    init() {
        console.log('Import Manager initialized');
    },

    /**
     * Main import function - imports data from Excel file
     */
    importFromExcel() {
        try {
            // Check if XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                throw new Error('Excel library not loaded. Please check your internet connection.');
            }

            // Create file input element
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    Utils.showNotification('Reading Excel file...', 'info');
                    await this.processImportFile(file);
                } catch (error) {
                    console.error('Import error:', error);
                    Utils.showNotification(`Import failed: ${error.message}`, 'error');
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Import initialization error:', error);
            Utils.showNotification(`Cannot start import: ${error.message}`, 'error');
        }
    },

    /**
     * Process the imported Excel file
     */
    async processImportFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Parse all sheets
                    const importData = this.parseWorkbook(workbook);
                    
                    // Validate data
                    const validation = this.validateImportData(importData);
                    
                    if (validation.criticalErrors.length > 0) {
                        this.showValidationErrors(validation);
                        reject(new Error('Critical validation errors found'));
                        return;
                    }
                    
                    // Detect conflicts
                    const conflicts = this.detectConflicts(importData);
                    
                    // Show preview and get user confirmation
                    const userChoice = await this.showImportPreview(importData, validation, conflicts);
                    
                    if (userChoice.confirmed) {
                        await this.executeImport(importData, validation, userChoice);
                        resolve();
                    } else {
                        reject(new Error('Import cancelled by user'));
                    }
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Parse workbook and extract all sheets
     */
    parseWorkbook(workbook) {
        const importData = {
            portfolios: [],
            portfolioAssets: [],
            accounts: [],
            transactions: [],
            fifoLots: [],
            fifoSales: []
        };

        // Parse Portfolios sheet
        if (workbook.SheetNames.includes('Portfolios')) {
            importData.portfolios = this.parsePortfoliosSheet(workbook.Sheets['Portfolios']);
        }

        // Parse Portfolio Assets sheet (NEW)
        if (workbook.SheetNames.includes('Portfolio Assets')) {
            importData.portfolioAssets = this.parsePortfolioAssetsSheet(workbook.Sheets['Portfolio Assets']);
        }

        // Parse Accounts sheet
        if (workbook.SheetNames.includes('Accounts')) {
            importData.accounts = this.parseAccountsSheet(workbook.Sheets['Accounts']);
        }

        // Parse Transactions sheet
        if (workbook.SheetNames.includes('Transactions')) {
            importData.transactions = this.parseTransactionsSheet(workbook.Sheets['Transactions']);
        }

        // Parse FIFO Lots sheet
        if (workbook.SheetNames.includes('FIFO Lots')) {
            importData.fifoLots = this.parseFIFOLotsSheet(workbook.Sheets['FIFO Lots']);
        }

        // Parse FIFO Sales sheet
        if (workbook.SheetNames.includes('FIFO Sales')) {
            importData.fifoSales = this.parseFIFOSalesSheet(workbook.Sheets['FIFO Sales']);
        }

        return importData;
    },

    /**
     * Parse Portfolios sheet
     */
    parsePortfoliosSheet(sheet) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const portfolios = [];

        data.forEach(row => {
            const portfolio = {
                name: row['Portfolio Name'],
                description: row['Description'] || '',
                createdDate: this.parseDate(row['Created Date']),
                assets: [], // Will be populated from transactions
                totalAllocation: parseFloat(row['Total Allocation %']) || 100
            };
            portfolios.push(portfolio);
        });

        return portfolios;
    },

    /**
     * Parse Portfolio Assets sheet
     */
    parsePortfolioAssetsSheet(sheet) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const assets = [];

        data.forEach(row => {
            const asset = {
                portfolioName: row['Portfolio Name'],
                name: row['Asset Name'],
                ticker: row['Ticker'] || row['Asset Name'],
                type: row['Type'] || 'ETF',
                subType: row['Sub Type'] || '',
                allocation: parseFloat(row['Target Allocation %']) || 0,
                riskLevel: row['Risk Level'] || 'medium',
                currency: row['Currency'] || 'USD',
                platform: row['Platform'] || '',
                notes: row['Notes'] || ''
            };
            assets.push(asset);
        });

        return assets;
    },

    /**
     * Parse Accounts sheet
     */
    parseAccountsSheet(sheet) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const accounts = [];

        data.forEach(row => {
            const account = {
                portfolioName: row['Portfolio'],
                name: row['Account Name'],
                type: this.parseAccountType(row['Type']),
                currency: row['Currency'] || 'THB',
                balance: parseFloat(row['Balance']) || 0,
                institution: row['Institution'] || '',
                accountNumber: row['Account Number'] || '',
                linkedAssetId: row['Linked Asset ID'] || null,
                linkedAssetName: row['Linked Asset Name'] || null,
                linkedAssetType: row['Linked Asset Type'] || null,
                createdDate: this.parseDate(row['Created Date'])
            };
            accounts.push(account);
        });

        return accounts;
    },

    /**
     * Parse Transactions sheet
     */
    parseTransactionsSheet(sheet) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const transactions = [];

        data.forEach((row, index) => {
            // Determine if asset is required based on transaction type
            const type = row['Type'] ? row['Type'].toUpperCase() : '';
            const assetValue = row['Asset'];
            const requiresAsset = ['BUY', 'SELL', 'DIVIDEND'].includes(type);
            
            // Parse exchange rate from the row, or default to 1
            let exchangeRate = 1;
            if (row['Exchange Rate']) {
                exchangeRate = parseFloat(row['Exchange Rate']) || 1;
            }
            
            const transaction = {
                date: this.parseDate(row['Date']),
                portfolioName: row['Portfolio'],
                portfolioId: row['Portfolio ID'] || null, // NEW: Read Portfolio ID
                type: type,
                assetName: (assetValue && assetValue !== 'N/A') ? assetValue : null,
                assetId: row['Asset ID'] || null, // NEW: Read Asset ID
                quantity: row['Quantity'] ? parseFloat(row['Quantity']) : null,
                pricePerUnit: row['Price/Unit'] ? parseFloat(row['Price/Unit']) : null,
                totalAmount: parseFloat(row['Total Amount']) || 0,
                fee: parseFloat(row['Fee']) || 0,
                currency: row['Currency'] || 'THB',
                exchangeRate: exchangeRate, // Store the exchange rate from the sheet
                accountName: row['Account'] && row['Account'] !== 'Manual' ? row['Account'] : null,
                accountId: row['Account ID'] || null, // NEW: Read Account ID
                destinationAccountName: row['Destination Account'] || null, // NEW: Read Destination Account Name
                destinationAccountId: row['Destination Account ID'] || null, // NEW: Read Destination Account ID
                notes: row['Notes'] || '',
                rowNumber: index + 2, // For error reporting (header is row 1)
                requiresAsset: requiresAsset
            };
            transactions.push(transaction);
        });

        return transactions;
    },

    /**
     * Parse FIFO Lots sheet
     */
    parseFIFOLotsSheet(sheet) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const lots = [];

        data.forEach(row => {
            const lot = {
                portfolioName: row['Portfolio'],
                assetId: row['Asset ID'],
                purchaseDate: this.parseDate(row['Purchase Date']),
                quantity: parseFloat(row['Quantity']) || 0,
                remainingQuantity: parseFloat(row['Remaining Qty']) || 0,
                pricePerUnit: parseFloat(row['Price/Unit']) || 0,
                currency: row['Currency'] || 'USD',
                exchangeRate: parseFloat(row['Exchange Rate']) || 35,
                costBasisTHB: parseFloat(row['Cost Basis (THB)']) || 0,
                status: row['Status'] || 'OPEN',
                createdAt: this.parseDate(row['Created At'])
            };
            lots.push(lot);
        });

        return lots;
    },

    /**
     * Parse FIFO Sales sheet
     */
    parseFIFOSalesSheet(sheet) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const sales = [];

        data.forEach(row => {
            const sale = {
                portfolioName: row['Portfolio'],
                assetId: row['Asset ID'],
                saleDate: this.parseDate(row['Sale Date']),
                quantitySold: parseFloat(row['Quantity Sold']) || 0,
                avgPurchasePrice: parseFloat(row['Avg Purchase Price']) || 0,
                salePrice: parseFloat(row['Sale Price']) || 0,
                totalCostBasisTHB: parseFloat(row['Cost Basis (THB)']) || 0,
                totalProceedsTHB: parseFloat(row['Proceeds (THB)']) || 0,
                realizedGainTHB: parseFloat(row['Realized Gain (THB)']) || 0
            };
            sales.push(sale);
        });

        return sales;
    },

    /**
     * Parse date from various formats
     */
    parseDate(dateValue) {
        if (!dateValue) return new Date().toISOString();
        
        // Handle Excel serial date
        if (typeof dateValue === 'number') {
            const date = new Date((dateValue - 25569) * 86400 * 1000);
            return date.toISOString();
        }
        
        // Handle string dates
        try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) {
            // Ignore parse errors
        }
        
        return new Date().toISOString();
    },

    /**
     * Parse account type
     */
    parseAccountType(typeString) {
        if (!typeString) return 'thb_savings';
        
        const lower = typeString.toLowerCase();
        if (lower.includes('fcd') || lower.includes('usd')) {
            return 'fcd_account';
        }
        return 'thb_savings';
    },

    /**
     * Validate imported data
     */
    validateImportData(importData) {
        const validation = {
            criticalErrors: [],
            warnings: [],
            info: [],
            transactionIssues: [] // Detailed transaction validation
        };

        // Validate portfolios
        if (importData.portfolios.length === 0) {
            validation.criticalErrors.push('No portfolios found in import file');
        }

        const portfolioNames = new Set();
        importData.portfolios.forEach((portfolio, index) => {
            if (!portfolio.name) {
                validation.criticalErrors.push(`Portfolio at row ${index + 2} missing name`);
            } else {
                portfolioNames.add(portfolio.name);
            }
        });

        // Build asset map for validation
        const assetsByPortfolio = new Map();
        importData.portfolioAssets.forEach(asset => {
            if (!assetsByPortfolio.has(asset.portfolioName)) {
                assetsByPortfolio.set(asset.portfolioName, new Set());
            }
            assetsByPortfolio.get(asset.portfolioName).add(asset.name);
        });

        // Build account map for validation
        const accountsByPortfolio = new Map();
        importData.accounts.forEach((account, index) => {
            if (!account.name) {
                validation.warnings.push(`Account at row ${index + 2} missing name`);
            }
            if (!account.portfolioName) {
                validation.warnings.push(`Account "${account.name}" missing portfolio reference`);
            } else {
                if (!accountsByPortfolio.has(account.portfolioName)) {
                    accountsByPortfolio.set(account.portfolioName, new Set());
                }
                accountsByPortfolio.get(account.portfolioName).add(account.name);
            }
        });

        // Validate transactions with detailed reporting
        let validTransactions = 0;
        let problematicTransactions = 0;

        importData.transactions.forEach((txn) => {
            const issues = [];
            let isValid = true;

            // Check portfolio reference
            if (!txn.portfolioName) {
                issues.push('Missing portfolio name');
                isValid = false;
            } else if (!portfolioNames.has(txn.portfolioName)) {
                issues.push(`Portfolio "${txn.portfolioName}" not found`);
                isValid = false;
            }

            // Check asset requirement (only for BUY/SELL/DIVIDEND)
            if (txn.requiresAsset && !txn.assetName) {
                issues.push(`${txn.type} transaction requires an asset name`);
                isValid = false;
            }

            // Check if asset exists in portfolio (only if required and portfolio is valid)
            if (txn.requiresAsset && txn.assetName && txn.portfolioName) {
                const portfolioAssets = assetsByPortfolio.get(txn.portfolioName);
                if (portfolioAssets && !portfolioAssets.has(txn.assetName)) {
                    issues.push(`Asset "${txn.assetName}" not found in portfolio`);
                    validation.warnings.push(`Transaction row ${txn.rowNumber}: Asset "${txn.assetName}" will be created automatically`);
                }
            }

            // Check account reference (only if specified)
            if (txn.accountName && txn.portfolioName) {
                const portfolioAccounts = accountsByPortfolio.get(txn.portfolioName);
                if (portfolioAccounts && !portfolioAccounts.has(txn.accountName)) {
                    issues.push(`Account "${txn.accountName}" not found in portfolio`);
                    isValid = false;
                }
            }

            // Check required fields based on transaction type
            if (['BUY', 'SELL'].includes(txn.type)) {
                if (!txn.quantity || txn.quantity <= 0) {
                    issues.push('Missing or invalid quantity');
                    isValid = false;
                }
                if (!txn.pricePerUnit || txn.pricePerUnit <= 0) {
                    issues.push('Missing or invalid price per unit');
                    isValid = false;
                }
            }

            if (['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'DIVIDEND'].includes(txn.type)) {
                if (!txn.totalAmount || txn.totalAmount <= 0) {
                    issues.push('Missing or invalid total amount');
                    isValid = false;
                }
            }

            if (isValid) {
                validTransactions++;
            } else {
                problematicTransactions++;
                validation.transactionIssues.push({
                    row: txn.rowNumber,
                    type: txn.type,
                    asset: txn.assetName || 'N/A',
                    date: new Date(txn.date).toLocaleDateString(),
                    issues: issues
                });
            }
        });

        validation.info.push(`Found ${importData.portfolios.length} portfolios`);
        validation.info.push(`Found ${importData.portfolioAssets.length} portfolio assets`);
        validation.info.push(`Found ${importData.accounts.length} accounts`);
        validation.info.push(`Found ${importData.transactions.length} transactions`);
        validation.info.push(`  • ${validTransactions} will be imported`);
        if (problematicTransactions > 0) {
            validation.info.push(`  • ${problematicTransactions} have issues (see details below)`);
        }
        validation.info.push(`Found ${importData.fifoLots.length} FIFO lots`);
        validation.info.push(`Found ${importData.fifoSales.length} FIFO sales`);

        return validation;
    },

    /**
     * Detect conflicts with existing data
     */
    detectConflicts(importData) {
        const conflicts = {
            portfolios: [],
            accounts: [],
            hasConflicts: false
        };

        const existingPortfolios = PortfolioManager.getAllPortfolios();
        const existingAccounts = AccountManager.getAllAccounts();

        // Check portfolio name conflicts
        importData.portfolios.forEach(importPortfolio => {
            const existing = existingPortfolios.find(p => p.name === importPortfolio.name);
            if (existing) {
                conflicts.portfolios.push({
                    name: importPortfolio.name,
                    existingId: existing.id,
                    action: 'merge' // Default action
                });
                conflicts.hasConflicts = true;
            }
        });

        // Check account conflicts
        importData.accounts.forEach(importAccount => {
            const existing = existingAccounts.find(a => 
                a.name === importAccount.name && 
                a.currency === importAccount.currency
            );
            if (existing) {
                conflicts.accounts.push({
                    name: importAccount.name,
                    currency: importAccount.currency,
                    existingId: existing.id,
                    action: 'merge'
                });
                conflicts.hasConflicts = true;
            }
        });

        return conflicts;
    },

    /**
     * Show import preview modal
     */
    async showImportPreview(importData, validation, conflicts) {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            
            let transactionIssuesHTML = '';
            if (validation.transactionIssues && validation.transactionIssues.length > 0) {
                transactionIssuesHTML = `
                    <div class="alert alert-danger" style="margin-bottom: var(--space-md);">
                        <strong>❌ Transaction Issues (${validation.transactionIssues.length})</strong>
                        <div style="margin-top: 8px; max-height: 200px; overflow-y: auto; font-size: 0.9em;">
                            ${validation.transactionIssues.map(issue => `
                                <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 4px;">
                                    <strong>Row ${issue.row}:</strong> ${issue.type} - ${issue.asset} (${issue.date})
                                    <ul style="margin: 4px 0 0 0; padding-left: 20px;">
                                        ${issue.issues.map(i => `<li>${i}</li>`).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                        <p style="margin-top: 8px; font-weight: bold;">These transactions will be skipped during import.</p>
                    </div>
                `;
            }
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <h3>📥 Import Preview</h3>
                    
                    <div class="card" style="margin-bottom: var(--space-md); background: var(--color-background-gray);">
                        <h4>Summary</h4>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${validation.info.map(info => `<li>${info}</li>`).join('')}
                        </ul>
                    </div>

                    ${transactionIssuesHTML}

                    ${validation.warnings.length > 0 ? `
                        <div class="alert alert-warning" style="margin-bottom: var(--space-md);">
                            <strong>⚠️ Warnings (${validation.warnings.length})</strong>
                            <ul style="margin: 8px 0 0 0; padding-left: 20px; max-height: 150px; overflow-y: auto;">
                                ${validation.warnings.slice(0, 10).map(w => `<li>${w}</li>`).join('')}
                                ${validation.warnings.length > 10 ? `<li><em>... and ${validation.warnings.length - 10} more</em></li>` : ''}
                            </ul>
                        </div>
                    ` : ''}

                    ${conflicts.hasConflicts ? `
                        <div class="alert alert-info" style="margin-bottom: var(--space-md);">
                            <strong>🔄 Conflicts Detected</strong>
                            <p>Some items already exist. They will be merged (updated with new data).</p>
                            ${conflicts.portfolios.length > 0 ? `
                                <p><strong>Portfolios:</strong> ${conflicts.portfolios.map(c => c.name).join(', ')}</p>
                            ` : ''}
                            ${conflicts.accounts.length > 0 ? `
                                <p><strong>Accounts:</strong> ${conflicts.accounts.map(c => c.name).join(', ')}</p>
                            ` : ''}
                        </div>
                    ` : ''}

                    <div class="alert alert-warning">
                        <strong>⚠️ Important:</strong> A backup will be created automatically before import.
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" id="cancelImportBtn">
                            Cancel
                        </button>
                        <button type="button" class="btn-primary" id="confirmImportBtn">
                            Import Data
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);

            // Add event listeners
            document.getElementById('cancelImportBtn').onclick = () => {
                document.body.removeChild(modal);
                resolve({ confirmed: false });
            };

            document.getElementById('confirmImportBtn').onclick = () => {
                document.body.removeChild(modal);
                resolve({ 
                    confirmed: true,
                    conflicts: conflicts
                });
            };
        });
    },

    /**
     * Show validation errors
     */
    showValidationErrors(validation) {
        const errorList = validation.criticalErrors.map(e => `• ${e}`).join('\n');
        alert(`Import Failed - Critical Errors:\n\n${errorList}\n\nPlease fix these errors in your Excel file and try again.`);
    },

    /**
     * Execute the import
     */
    async executeImport(importData, validation, userChoice) {
        try {
            Utils.showNotification('Creating backup...', 'info');
            
            // Create backup
            ExportManager.exportToExcel();
            
            Utils.showNotification('Importing data...', 'info');

            // Build ID mappings
            const portfolioIdMap = new Map();
            const accountIdMap = new Map();
            const assetIdMap = new Map();

            // STEP 1: Organize assets by portfolio
            console.log('Step 1: Organizing portfolio assets...');
            const assetsByPortfolio = new Map();
            
            // If we have Portfolio Assets sheet, use that (preferred)
            if (importData.portfolioAssets && importData.portfolioAssets.length > 0) {
                console.log('Using Portfolio Assets sheet for asset data');
                importData.portfolioAssets.forEach(asset => {
                    if (!assetsByPortfolio.has(asset.portfolioName)) {
                        assetsByPortfolio.set(asset.portfolioName, []);
                    }
                    assetsByPortfolio.get(asset.portfolioName).push(asset);
                });
            } else {
                // Fallback: Extract unique assets from transactions
                console.log('Fallback: Extracting assets from transactions...');
                const assetsFromTxns = new Map();
                importData.transactions.forEach(txn => {
                    if (txn.assetName && (txn.type === 'BUY' || txn.type === 'SELL' || txn.type === 'DIVIDEND')) {
                        if (!assetsFromTxns.has(txn.portfolioName)) {
                            assetsFromTxns.set(txn.portfolioName, new Set());
                        }
                        assetsFromTxns.get(txn.portfolioName).add(txn.assetName);
                    }
                });
                
                // Convert to asset objects with 0% allocation
                assetsFromTxns.forEach((assetNames, portfolioName) => {
                    const assets = Array.from(assetNames).map(name => ({
                        portfolioName: portfolioName,
                        name: name,
                        ticker: name,
                        type: 'ETF',
                        subType: '',
                        allocation: 0,
                        riskLevel: 'medium',
                        currency: 'USD',
                        platform: '',
                        notes: ''
                    }));
                    assetsByPortfolio.set(portfolioName, assets);
                });
            }

            // STEP 2: Import portfolios with assets
            console.log('Step 2: Importing portfolios...');
            for (const importPortfolio of importData.portfolios) {
                const conflict = userChoice.conflicts.portfolios.find(c => c.name === importPortfolio.name);
                
                if (conflict) {
                    // Merge with existing
                    portfolioIdMap.set(importPortfolio.name, conflict.existingId);
                    const existing = PortfolioManager.getPortfolio(conflict.existingId);
                    
                    // Add any new assets from imported data
                    const importedAssets = assetsByPortfolio.get(importPortfolio.name) || [];
                    importedAssets.forEach(asset => {
                        const existingAsset = existing.assets.find(a => a.name === asset.name);
                        if (!existingAsset) {
                            const assetId = Utils.generateId();
                            assetIdMap.set(`${conflict.existingId}_${asset.name}`, assetId);
                            
                            // Ensure allocation for non-savings assets
                            let allocation = asset.allocation || 0;
                            const isSavingsType = asset.type === 'thb_savings' || asset.type === 'fcd_account';
                            if (!isSavingsType && allocation === 0) {
                                allocation = 0.01;
                            }
                            
                            existing.assets.push({
                                id: assetId,
                                name: asset.name,
                                ticker: asset.ticker || asset.name,
                                type: asset.type || 'ETF',
                                subType: asset.subType || '',
                                targetAllocation: allocation,
                                riskLevel: asset.riskLevel || 'medium',
                                currency: asset.currency || 'USD',
                                platform: asset.platform || '',
                                notes: asset.notes || ''
                            });
                        } else {
                            assetIdMap.set(`${conflict.existingId}_${asset.name}`, existingAsset.id);
                        }
                    });
                    
                    PortfolioManager.updatePortfolio(conflict.existingId, {
                        description: importPortfolio.description || existing.description,
                        assets: existing.assets
                    });
                } else {
                    // Create new portfolio with assets
                    const portfolioAssets = [];
                    const importedAssets = assetsByPortfolio.get(importPortfolio.name) || [];
                    
                    importedAssets.forEach(asset => {
                        const assetId = Utils.generateId();
                        assetIdMap.set(`${importPortfolio.name}_${asset.name}`, assetId);
                        
                        // Ensure at least 0.01% allocation for non-savings assets to pass validation
                        let allocation = asset.allocation || 0;
                        const isSavingsType = asset.type === 'thb_savings' || asset.type === 'fcd_account';
                        
                        // If allocation is 0 and not a savings account, set to 0.01% to pass validation
                        if (!isSavingsType && allocation === 0) {
                            allocation = 0.01;
                        }
                        
                        portfolioAssets.push({
                            id: assetId,
                            name: asset.name,
                            ticker: asset.ticker || asset.name,
                            type: asset.type || 'ETF',
                            subType: asset.subType || '',
                            allocation: allocation,
                            riskLevel: asset.riskLevel || 'medium',
                            currency: asset.currency || 'USD',
                            platform: asset.platform || '',
                            notes: asset.notes || ''
                        });
                    });

                    try {
                        const portfolio = PortfolioManager.createPortfolio({
                            name: importPortfolio.name,
                            description: importPortfolio.description,
                            assets: portfolioAssets.length > 0 ? portfolioAssets : [
                                { name: 'Placeholder', ticker: 'PLACEHOLDER', type: 'ETF', allocation: 100 }
                            ]
                        });
                        portfolioIdMap.set(importPortfolio.name, portfolio.id);
                        
                        // Update asset ID map with actual IDs
                        if (portfolioAssets.length > 0) {
                            portfolio.assets.forEach(asset => {
                                assetIdMap.set(`${portfolio.id}_${asset.name}`, asset.id);
                            });
                        }
                    } catch (error) {
                        console.error(`Failed to create portfolio ${importPortfolio.name}:`, error);
                        throw error;
                    }
                }
            }

            // STEP 3: Import accounts using AccountManager
            console.log('Step 3: Importing accounts...');
            for (const importAccount of importData.accounts) {
                const portfolioId = portfolioIdMap.get(importAccount.portfolioName);
                if (!portfolioId) {
                    console.warn(`Portfolio not found for account: ${importAccount.name}`);
                    continue;
                }

                const conflict = userChoice.conflicts.accounts.find(c => 
                    c.name === importAccount.name && c.currency === importAccount.currency
                );

                if (conflict) {
                    // Update existing account balance and linked asset fields
                    accountIdMap.set(`${importAccount.portfolioName}_${importAccount.name}`, conflict.existingId);
                    
                    // Resolve linked asset ID if asset name is provided
                    let resolvedLinkedAssetId = null;
                    if (importAccount.linkedAssetName) {
                        resolvedLinkedAssetId = assetIdMap.get(`${portfolioId}_${importAccount.linkedAssetName}`);
                    }
                    
                    StorageManager.updateAccount(conflict.existingId, {
                        balance: importAccount.balance,
                        linkedAssetId: resolvedLinkedAssetId || importAccount.linkedAssetId,
                        linkedAssetName: importAccount.linkedAssetName,
                        linkedAssetType: importAccount.linkedAssetType
                    });
                } else {
                    // Create new account using AccountManager
                    try {
                        // Resolve linked asset ID if asset name is provided
                        let resolvedLinkedAssetId = null;
                        if (importAccount.linkedAssetName) {
                            resolvedLinkedAssetId = assetIdMap.get(`${portfolioId}_${importAccount.linkedAssetName}`);
                        }
                        
                        const account = AccountManager.createAccount({
                            portfolioId: portfolioId,
                            name: importAccount.name,
                            type: importAccount.type,
                            initialBalance: 0, // Set to 0, transactions will build the balance
                            institution: importAccount.institution,
                            accountNumber: importAccount.accountNumber,
                            linkedAssetId: resolvedLinkedAssetId || importAccount.linkedAssetId,
                            linkedAssetName: importAccount.linkedAssetName,
                            linkedAssetType: importAccount.linkedAssetType
                        });
                        accountIdMap.set(`${importAccount.portfolioName}_${importAccount.name}`, account.id);
                    } catch (error) {
                        console.error(`Failed to create account ${importAccount.name}:`, error);
                        throw error;
                    }
                }
            }

            // STEP 4: Import transactions using TransactionManager
            // This will automatically create FIFO lots and update account balances
            console.log('Step 4: Importing transactions...');
            let transactionCount = 0;
            let skippedCount = 0;
            const skippedDetails = [];
            
            // Default exchange rate (will be overridden by transaction-specific rates)
            let defaultExchangeRate = 31.1;
            
            // Try to get default exchange rate from FIFO Lots sheet as fallback
            if (importData.fifoLots && importData.fifoLots.length > 0) {
                const usdLot = importData.fifoLots.find(lot => lot.assetId === 'USD_CURRENCY');
                if (usdLot && usdLot.exchangeRate) {
                    defaultExchangeRate = usdLot.exchangeRate;
                    console.log(`Default exchange rate from FIFO Lots: ${defaultExchangeRate} THB/USD`);
                }
            }
            
            // Sort transactions by date (oldest first) to maintain chronological order
            const sortedTransactions = [...importData.transactions].sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );

            for (const importTxn of sortedTransactions) {
                // PRIORITY 1: Use Portfolio ID if available, otherwise use name mapping
                let portfolioId = importTxn.portfolioId;
                if (!portfolioId) {
                    portfolioId = portfolioIdMap.get(importTxn.portfolioName);
                }
                
                if (!portfolioId) {
                    console.warn(`Portfolio not found for transaction: ${importTxn.type} ${importTxn.assetName}`);
                    skippedCount++;
                    skippedDetails.push(`Row ${importTxn.rowNumber}: Portfolio not found`);
                    continue;
                }

                // For transactions that require assets (BUY, SELL, DIVIDEND)
                let assetId = null;
                if (importTxn.requiresAsset) {
                    if (!importTxn.assetName) {
                        console.warn(`Asset required for ${importTxn.type} transaction at row ${importTxn.rowNumber}`);
                        skippedCount++;
                        skippedDetails.push(`Row ${importTxn.rowNumber}: ${importTxn.type} requires an asset`);
                        continue;
                    }
                    
                    // PRIORITY 1: Use Asset ID if available
                    assetId = importTxn.assetId;
                    
                    // PRIORITY 2: If no Asset ID, try to resolve from name mapping
                    if (!assetId) {
                        assetId = assetIdMap.get(`${portfolioId}_${importTxn.assetName}`);
                    }
                    
                    if (!assetId) {
                        console.warn(`Asset "${importTxn.assetName}" not found for transaction at row ${importTxn.rowNumber}`);
                        skippedCount++;
                        skippedDetails.push(`Row ${importTxn.rowNumber}: Asset "${importTxn.assetName}" not found`);
                        continue;
                    }
                }
                
                // PRIORITY 1: Use Account ID if available
                let accountId = importTxn.accountId;
                
                // PRIORITY 2: If no Account ID, try to resolve from name mapping
                if (!accountId && importTxn.accountName) {
                    accountId = accountIdMap.get(`${importTxn.portfolioName}_${importTxn.accountName}`);
                }

                // Validate account if specified
                if (importTxn.accountName && !accountId) {
                    console.warn(`Account "${importTxn.accountName}" not found for transaction at row ${importTxn.rowNumber}`);
                    skippedCount++;
                    skippedDetails.push(`Row ${importTxn.rowNumber}: Account "${importTxn.accountName}" not found`);
                    continue;
                }
                
                // PRIORITY 1: Use Destination Account ID if available (for TRANSFER transactions)
                let destinationAccountId = importTxn.destinationAccountId;
                
                // PRIORITY 2: If no Destination Account ID, try to resolve from name mapping
                if (!destinationAccountId && importTxn.destinationAccountName) {
                    destinationAccountId = accountIdMap.get(`${importTxn.portfolioName}_${importTxn.destinationAccountName}`);
                }

                try {
                    // Get account to check for cross-currency transactions
                    const account = accountId ? AccountManager.getAccount(accountId) : null;
                    const accountCurrency = account ? account.currency : importTxn.currency;
                    const isCrossCurrency = accountCurrency !== importTxn.currency;
                    
                    // Use transaction-specific exchange rate, or fall back to default
                    const txnExchangeRate = importTxn.exchangeRate || defaultExchangeRate;
                    
                    // Calculate converted amount for cross-currency transactions
                    let convertedAmount = importTxn.totalAmount;
                    
                    if (isCrossCurrency && importTxn.type === 'TRANSFER') {
                        // THB → USD conversion
                        if (importTxn.currency === 'THB' && accountCurrency === 'USD') {
                            convertedAmount = importTxn.totalAmount / txnExchangeRate;
                            console.log(`Cross-currency TRANSFER (row ${importTxn.rowNumber}): ${importTxn.totalAmount} THB → ${convertedAmount.toFixed(2)} USD (rate: ${txnExchangeRate})`);
                        }
                        // USD → THB conversion
                        else if (importTxn.currency === 'USD' && accountCurrency === 'THB') {
                            convertedAmount = importTxn.totalAmount * txnExchangeRate;
                            console.log(`Cross-currency TRANSFER (row ${importTxn.rowNumber}): ${importTxn.totalAmount} USD → ${convertedAmount.toFixed(2)} THB (rate: ${txnExchangeRate})`);
                        }
                    }
                    
                    // Build transaction data
                    const txnData = {
                        portfolioId: portfolioId,
                        assetId: assetId,
                        assetName: importTxn.assetName,
                        assetTicker: importTxn.assetName,
                        type: importTxn.type,
                        date: importTxn.date,
                        quantity: importTxn.quantity || 0,
                        pricePerUnit: importTxn.pricePerUnit || 0,
                        totalAmount: importTxn.totalAmount || 0,
                        fee: importTxn.fee || 0,
                        currency: importTxn.currency || 'THB',
                        accountId: accountId,
                        notes: importTxn.notes || '',
                        exchangeRate: txnExchangeRate
                    };

                    // Handle different transaction types
                    if (['DEPOSIT', 'WITHDRAW', 'TRANSFER'].includes(importTxn.type)) {
                        // For account-only transactions, save directly and update account balance
                        const transaction = {
                            id: Utils.generateId(),
                            ...txnData
                        };
                        const transactions = StorageManager.getTransactions();
                        transactions.push(transaction);
                        StorageManager.saveTransactions(transactions);
                        
                        // Update account balance with converted amount
                        if (accountId && account) {
                            let newBalance = account.balance;
                            if (importTxn.type === 'DEPOSIT' || importTxn.type === 'TRANSFER') {
                                newBalance += convertedAmount;
                            } else if (importTxn.type === 'WITHDRAW') {
                                newBalance -= convertedAmount;
                            }
                            StorageManager.updateAccount(accountId, { balance: newBalance });
                            console.log(`Updated ${account.name} balance: ${account.balance.toFixed(2)} → ${newBalance.toFixed(2)} ${accountCurrency}`);
                        }
                        transactionCount++;
                    } else {
                        // For investment transactions (BUY, SELL, DIVIDEND), use TransactionManager
                        // This will handle FIFO lots and account balances automatically
                        TransactionManager.recordTransaction(txnData);
                        transactionCount++;
                    }
                } catch (error) {
                    console.warn(`Failed to import transaction at row ${importTxn.rowNumber}: ${error.message}`);
                    skippedCount++;
                    skippedDetails.push(`Row ${importTxn.rowNumber}: ${error.message}`);
                }
            }

            // STEP 5: Skip direct FIFO import - transactions already created FIFO data
            console.log('Step 5: Skipping direct FIFO import (rebuilt from transactions)');

            // Show success message
            let summary = `
✅ Import completed successfully!

• ${importData.portfolios.length} portfolios
• ${importData.accounts.length} accounts  
• ${transactionCount} transactions imported
${skippedCount > 0 ? `• ${skippedCount} transactions skipped` : ''}
• FIFO lots and sales rebuilt from transactions

${validation.warnings.length > 0 ? `\n⚠️ ${validation.warnings.length} warnings (non-critical)` : ''}
            `.trim();

            // Add skipped transaction details if any
            if (skippedCount > 0 && skippedDetails.length > 0) {
                summary += '\n\n📋 Skipped Transaction Details:\n';
                summary += skippedDetails.slice(0, 10).join('\n');
                if (skippedDetails.length > 10) {
                    summary += `\n... and ${skippedDetails.length - 10} more (see console for full details)`;
                }
            }

            Utils.showNotification('Import completed!', 'success');
            alert(summary);

            // Reload page to show imported data
            if (confirm('Import successful! Reload page to see the imported data?')) {
                window.location.reload();
            }

        } catch (error) {
            console.error('Import execution error:', error);
            Utils.showNotification(`Import failed: ${error.message}`, 'error');
            alert(`Import Error: ${error.message}\n\nPlease check the console for details.`);
            throw error;
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ExportManager.init();
    ImportManager.init();
});

// Export for use in other modules
window.ExportManager = ExportManager;
window.ImportManager = ImportManager;
