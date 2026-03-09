/* ============================================================================
   EXCEL IMPORTER
   Import historical transactions and FIFO lots from Excel files
   ============================================================================ */

const ExcelImporter = {
    // Mapping tables (populated from localStorage)
    portfolioMap: {},      // 'nowhere' -> portfolio ID
    accountMap: {},        // 'portfolioId_type' -> account ID
    assetMap: {},          // 'portfolioId_TICKER' -> asset ID
    tickerToPortfolioMap: {},  // 'TICKER' -> portfolio ID (for auto-fix)

    // Parsed data cache
    parsedTransactions: [],
    parsedFIFOLots: [],

    // Backup data
    backupData: null,

    /**
     * Handle file selection from input
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Selected file:', file.name);
        this.importFromFile(file);

        // Reset file input so same file can be selected again
        event.target.value = '';
    },

    /**
     * Main import flow
     */
    async importFromFile(file) {
        try {
            Utils.showNotification('Reading Excel file...', 'info');

            // Read Excel file
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            console.log('Workbook loaded:', workbook.SheetNames);

            // Build ID mappings from localStorage
            this.buildMappings();

            // Parse sheets
            this.parsedTransactions = this.parseTransactionSheet(workbook);
            this.parsedFIFOLots = this.parseFIFOSheet(workbook);

            console.log(`Parsed ${this.parsedTransactions.length} transactions`);
            console.log(`Parsed ${this.parsedFIFOLots.length} FIFO lots`);

            // Validate all data
            const issues = this.validateAll();

            if (issues.critical.length > 0) {
                this.showValidationErrors(issues);
                return;
            }

            // Show preview modal
            this.showPreviewModal(issues);

        } catch (error) {
            console.error('Import failed:', error);
            Utils.showNotification(`Import failed: ${error.message}`, 'error');
        }
    },

    /**
     * Build mapping tables from localStorage
     */
    buildMappings() {
        const portfolios = StorageManager.getPortfolios();
        const accounts = StorageManager.getAccounts();

        console.log('Building mappings from:', {
            portfolios: portfolios.length,
            accounts: accounts.length
        });

        // Portfolio name map (case-insensitive)
        this.portfolioMap = {};
        portfolios.forEach(p => {
            const key = p.name.toLowerCase().trim();
            this.portfolioMap[key] = p.id;
            console.log(`Portfolio map: "${key}" -> ${p.id}`);
        });

        // Account type map
        this.accountMap = {};
        accounts.forEach(a => {
            const key = `${a.portfolioId}_${a.type}`;
            this.accountMap[key] = a.id;
        });

        // Asset ticker map (portfolio + ticker -> asset ID)
        this.assetMap = {};
        // Ticker to portfolio map (for auto-fixing incorrect portfolio assignments)
        this.tickerToPortfolioMap = {};
        portfolios.forEach(p => {
            p.assets.forEach(asset => {
                const ticker = asset.ticker.toUpperCase();
                const key = `${p.id}_${ticker}`;
                this.assetMap[key] = asset.id;

                // Build reverse lookup: ticker -> portfolio ID
                this.tickerToPortfolioMap[ticker] = p.id;
                console.log(`Asset map: ${ticker} -> portfolio ${p.name} (${p.id})`);
            });
        });
    },

    /**
     * Parse Transaction sheet from workbook
     */
    parseTransactionSheet(workbook) {
        const sheetName = 'Transaction';
        if (!workbook.SheetNames.includes(sheetName)) {
            throw new Error(`Sheet "${sheetName}" not found in Excel file`);
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${rows.length} rows in Transaction sheet`);

        const transactions = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Skip rows with zero or empty amount
            if (!row['Total Amount'] || row['Total Amount'] === 0) {
                console.warn(`Row ${i + 2}: Skipping (zero amount)`);
                continue;
            }

            try {
                const txn = this.transformTransaction(row, i + 2);
                if (txn) {
                    transactions.push(txn);
                }
            } catch (error) {
                console.error(`Row ${i + 2}: ${error.message}`);
                throw error;
            }
        }

        return transactions;
    },

    /**
     * Parse US FCD sheet (FIFO lots) from workbook
     */
    parseFIFOSheet(workbook) {
        const sheetName = 'US FCD';
        if (!workbook.SheetNames.includes(sheetName)) {
            console.warn(`Sheet "${sheetName}" not found - skipping FIFO lots`);
            return [];
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${rows.length} rows in US FCD sheet`);

        const lots = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                const lot = this.transformFIFOLot(row, i + 2);
                if (lot) {
                    lots.push(lot);
                }
            } catch (error) {
                console.error(`FIFO Row ${i + 2}: ${error.message}`);
                // Don't throw - continue processing other lots
            }
        }

        return lots;
    },

    /**
     * Transform Excel row to transaction object
     */
    transformTransaction(row, rowIndex) {
        // Determine transaction type first
        const type = (row['Transaction Type'] || '').toUpperCase();
        if (!['DEPOSIT', 'WITHDRAW', 'BUY'].includes(type)) {
            throw new Error(`Invalid transaction type: ${type}`);
        }

        // Parse asset ticker for BUY transactions
        let assetTicker = '';
        let correctPortfolioId = null;

        if (type === 'BUY') {
            const assetName = row['Asset'] || '';
            assetTicker = this.extractTicker(assetName);

            if (assetTicker) {
                // AUTO-FIX: Find which portfolio actually contains this asset
                correctPortfolioId = this.tickerToPortfolioMap[assetTicker];

                if (correctPortfolioId) {
                    console.log(`Row ${rowIndex}: Auto-fixed ${assetTicker} to correct portfolio`);
                } else {
                    console.warn(`Row ${rowIndex}: Asset ${assetTicker} not found in any portfolio`);
                }
            }
        }

        // Map portfolio name from Excel (for DEPOSIT/WITHDRAW)
        // For BUY transactions, use the correct portfolio we found
        let portfolioId;
        let portfolioName = (row['Project'] || row['Portfolio'] || '').toLowerCase().trim();

        if (type === 'BUY' && correctPortfolioId) {
            // Use the portfolio that actually contains the asset
            portfolioId = correctPortfolioId;
            console.log(`Row ${rowIndex}: Using correct portfolio for ${assetTicker}`);
        } else {
            // Use portfolio from Excel
            portfolioId = this.portfolioMap[portfolioName];
        }

        if (!portfolioId) {
            throw new Error(`Portfolio "${row['Project'] || row['Portfolio']}" not found`);
        }

        // Find account (FCD for all transactions in this import)
        const accountKey = `${portfolioId}_fcd_account`;
        const accountId = this.accountMap[accountKey];

        if (!accountId) {
            throw new Error(`FCD account not found for portfolio`);
        }

        // Get asset ID if BUY transaction
        let assetId = null;
        if (type === 'BUY' && assetTicker) {
            const assetKey = `${portfolioId}_${assetTicker}`;
            assetId = this.assetMap[assetKey];

            if (!assetId) {
                console.warn(`Asset ${assetTicker} not found in portfolio ${portfolioId}`);
            }
        }

        // Parse date
        const date = this.parseExcelDate(row['Date']);

        // Parse amounts
        const unit = parseFloat(row['Unit']) || 0;
        const price = parseFloat(row['Price']) || 0;
        const currency = (row['Currency'] || 'USD').toUpperCase();

        // Debug: Log available columns and FX rate value
        if (rowIndex === 2) { // Only log for first data row
            console.log('Transaction row columns:', Object.keys(row));
            console.log('FX Rate column values:', {
                'FX Rate (THB per USD)': row['FX Rate (THB per USD)'],
                'Price': row['Price'],
                'All columns': row
            });
        }

        // For DEPOSIT transactions, the 'Price' column contains the FX rate
        // For other transaction types, look for dedicated FX Rate column
        let fxRate;
        if (type === 'DEPOSIT') {
            fxRate = parseFloat(row['Price']) || 1;
            console.log(`Row ${rowIndex}: DEPOSIT using Price as FX Rate = ${fxRate}`);
        } else {
            fxRate = parseFloat(row['FX Rate (THB per USD)']) || parseFloat(row['Price']) || 1;
        }

        console.log(`Row ${rowIndex}: Type=${type}, Unit=${unit}, Price=${price}, FX Rate=${fxRate}`);

        // For DEPOSIT: totalAmount is USD from Unit column (not Total Amount column)
        // For WITHDRAW/BUY: totalAmount is Unit × Price
        let totalAmountUSD;
        if (type === 'DEPOSIT') {
            totalAmountUSD = unit;  // Get USD from Unit column
        } else {
            totalAmountUSD = unit * price;  // Calculate from Unit × Price
        }

        // For DEPOSIT/WITHDRAW, pricePerUnit should be 1 (not exchange rate)
        // Exchange rate is preserved in exchangeRate field for FIFO tracking
        const pricePerUnit = (type === 'DEPOSIT' || type === 'WITHDRAW') ? 1 : price;

        return {
            id: Utils.generateId(),
            portfolioId: portfolioId,
            accountId: accountId,
            assetId: assetId,
            type: type,
            assetName: row['Asset'] || '',
            assetTicker: assetTicker,
            quantity: unit,
            pricePerUnit: pricePerUnit,
            totalAmount: totalAmountUSD,
            currency: currency,
            fee: 0,
            exchangeRate: fxRate,
            date: date,
            notes: row['Investment Record'] || '',
            description: `${type} ${row['Asset'] || ''} - Imported from Excel`,
            _importSource: 'excel',
            _importRow: rowIndex,
            _originalPortfolio: portfolioName
        };
    },

    /**
     * Transform Excel row to FIFO lot object
     */
    transformFIFOLot(row, rowIndex) {
        // Parse lot data
        const initialUSD = parseFloat(row['USD In']) || parseFloat(row['Initial USD']) || 0;
        const remainingUSD = parseFloat(row['USD Remaining']) || parseFloat(row['Remaining USD']) || 0;
        const fxRate = parseFloat(row['FX Rate (THB per USD)']) || 0;
        const thbCost = parseFloat(row['THB Cost']) || (initialUSD * fxRate);

        if (initialUSD === 0 || fxRate === 0) {
            console.warn(`FIFO Row ${rowIndex}: Invalid data (USD=${initialUSD}, FX=${fxRate})`);
            return null;
        }

        // Determine status
        const status = remainingUSD > 0 ? 'OPEN' : 'CLOSED';

        // Try to find matching DEPOSIT transaction
        const matchedTxn = this.findMatchingDeposit(initialUSD, fxRate);

        if (!matchedTxn) {
            console.warn(`FIFO Row ${rowIndex}: No matching DEPOSIT found for ${initialUSD} USD @ ${fxRate}`);
        }

        const lotDate = matchedTxn ? matchedTxn.date : this.parseExcelDate(row['Date']);

        return {
            id: Utils.generateId(),
            portfolioId: matchedTxn?.portfolioId || null,
            assetId: 'USD_CURRENCY',
            accountId: matchedTxn?.accountId || null,
            transactionId: matchedTxn?.id || null,
            purchaseDate: lotDate,
            quantity: initialUSD,
            remainingQuantity: remainingUSD,
            pricePerUnit: fxRate,
            currency: 'USD',
            exchangeRate: fxRate,
            costBasisTHB: thbCost,
            status: status,
            createdAt: new Date().toISOString(),
            closedAt: status === 'CLOSED' ? new Date().toISOString() : null,
            _importSource: 'excel',
            _importRow: rowIndex
        };
    },

    /**
     * Find matching DEPOSIT transaction for FIFO lot
     */
    findMatchingDeposit(usdAmount, fxRate) {
        const tolerance = 0.5; // Allow $0.50 difference
        const fxTolerance = 0.05; // Allow 0.05 THB/USD difference (increased from 0.01)

        const deposits = this.parsedTransactions.filter(txn => txn.type === 'DEPOSIT');

        console.log(`Looking for DEPOSIT matching ${usdAmount} USD @ ${fxRate} THB/USD`);
        console.log(`Available DEPOSIT transactions:`, deposits.map(d =>
            `${d.totalAmount} USD @ ${d.exchangeRate} THB/USD`
        ));

        return this.parsedTransactions.find(txn =>
            txn.type === 'DEPOSIT' &&
            Math.abs(txn.totalAmount - usdAmount) < tolerance &&
            Math.abs(txn.exchangeRate - fxRate) < fxTolerance
        );
    },

    /**
     * Extract ticker symbol from asset name
     */
    extractTicker(assetName) {
        if (!assetName) return '';

        const name = assetName.toUpperCase().trim();

        // Direct matches
        if (name.includes('NVIDIA') || name.includes('NVDA')) return 'NVDA';
        if (name.includes('UFO')) return 'UFO';
        if (name.includes('BITCOIN') || name.includes('BTC')) return 'BTC';
        if (name.includes('GOLD')) return 'GOLD';
        if (name.includes('SPYM')) return 'SPYM';
        if (name.includes('DGRO')) return 'DGRO';
        if (name.includes('SCHD')) return 'SCHD';

        // Try to extract first word as ticker
        const words = name.split(/[\s-]+/);
        return words[0] || '';
    },

    /**
     * Parse Excel date (handles both serial numbers and strings)
     */
    parseExcelDate(excelDate) {
        if (!excelDate) {
            return new Date().toISOString();
        }

        if (typeof excelDate === 'number') {
            // Excel serial date (days since 1900-01-01)
            const date = XLSX.SSF.parse_date_code(excelDate);
            return new Date(date.y, date.m - 1, date.d).toISOString();
        } else if (typeof excelDate === 'string') {
            // Parse string date
            return new Date(excelDate).toISOString();
        } else if (excelDate instanceof Date) {
            return excelDate.toISOString();
        }

        throw new Error('Invalid date format');
    },

    /**
     * Validate all parsed data
     */
    validateAll() {
        const issues = {
            critical: [],
            warnings: [],
            info: []
        };

        // Validate portfolio mappings
        const unmappedPortfolios = new Set();
        this.parsedTransactions.forEach(t => {
            if (!t.portfolioId && t._originalPortfolio) {
                unmappedPortfolios.add(t._originalPortfolio);
            }
        });
        if (unmappedPortfolios.size > 0) {
            issues.critical.push(`Unmapped portfolios: ${Array.from(unmappedPortfolios).join(', ')}`);
        }

        // Validate asset mappings for BUY transactions
        const unmappedAssets = new Set();
        this.parsedTransactions.filter(t => t.type === 'BUY').forEach(t => {
            if (!t.assetId && t.assetTicker) {
                unmappedAssets.add(`${t.assetTicker} (${t._originalPortfolio})`);
            }
        });
        if (unmappedAssets.size > 0) {
            issues.warnings.push(`Unmapped assets (will skip): ${Array.from(unmappedAssets).join(', ')}`);
        }

        // Validate transaction data
        const invalidAmounts = this.parsedTransactions.filter(t => t.totalAmount <= 0).length;
        if (invalidAmounts > 0) {
            issues.critical.push(`${invalidAmounts} transactions have invalid amounts`);
        }

        // Validate FIFO lot data
        if (this.parsedFIFOLots.length > 0) {
            const totalUSD = this.parsedFIFOLots.reduce((sum, lot) => sum + lot.quantity, 0);
            const remainingUSD = this.parsedFIFOLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
            const openLots = this.parsedFIFOLots.filter(l => l.status === 'OPEN').length;
            const closedLots = this.parsedFIFOLots.filter(l => l.status === 'CLOSED').length;

            issues.info.push(`USD deposited: $${totalUSD.toFixed(2)}, Remaining: $${remainingUSD.toFixed(2)}`);
            issues.info.push(`Lot status: ${openLots} OPEN, ${closedLots} CLOSED`);

            const unmatchedLots = this.parsedFIFOLots.filter(l => !l.transactionId).length;
            if (unmatchedLots > 0) {
                issues.warnings.push(`${unmatchedLots} FIFO lots have no matching DEPOSIT transaction`);
            }
        }

        return issues;
    },

    /**
     * Show validation errors modal
     */
    showValidationErrors(issues) {
        let html = '<div style="padding: 20px;">';
        html += '<h3 style="color: #d32f2f; margin-top: 0;">❌ Validation Failed</h3>';
        html += '<p>The following critical issues must be resolved before importing:</p>';

        html += '<ul style="color: #d32f2f;">';
        issues.critical.forEach(issue => {
            html += `<li>${issue}</li>`;
        });
        html += '</ul>';

        if (issues.warnings.length > 0) {
            html += '<h4>Warnings:</h4>';
            html += '<ul style="color: #f57c00;">';
            issues.warnings.forEach(issue => {
                html += `<li>${issue}</li>`;
            });
            html += '</ul>';
        }

        html += '<p>Please check your Excel file and ensure:</p>';
        html += '<ul>';
        html += '<li>Portfolio names match exactly (case-insensitive): NoWhere, MoonShot, Alien</li>';
        html += '<li>Asset tickers exist in the corresponding portfolios</li>';
        html += '<li>All amounts are positive numbers</li>';
        html += '</ul>';
        html += '</div>';

        const modal = document.getElementById('importPreviewModal');
        const content = document.getElementById('importPreviewContent');
        content.innerHTML = html;
        modal.style.display = 'block';

        // Hide confirm button, show only cancel
        const actions = modal.querySelector('.modal-actions');
        actions.innerHTML = '<button class="btn btn-secondary" onclick="ExcelImporter.closePreview()">Close</button>';
    },

    /**
     * Show preview modal with import summary
     */
    showPreviewModal(issues) {
        let html = '<div style="padding: 20px;">';
        html += '<h3 style="margin-top: 0;">📊 Import Preview</h3>';

        // Summary stats
        html += '<div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
        html += '<h4 style="margin: 0 0 10px 0;">Summary</h4>';
        html += `<p style="margin: 5px 0;"><strong>Transactions:</strong> ${this.parsedTransactions.length}</p>`;

        const deposits = this.parsedTransactions.filter(t => t.type === 'DEPOSIT').length;
        const withdraws = this.parsedTransactions.filter(t => t.type === 'WITHDRAW').length;
        const buys = this.parsedTransactions.filter(t => t.type === 'BUY').length;

        html += `<p style="margin: 5px 0;">  • DEPOSIT: ${deposits}</p>`;
        html += `<p style="margin: 5px 0;">  • WITHDRAW: ${withdraws}</p>`;
        html += `<p style="margin: 5px 0;">  • BUY: ${buys}</p>`;

        if (this.parsedFIFOLots.length > 0) {
            html += `<p style="margin: 5px 0;"><strong>FIFO Lots:</strong> ${this.parsedFIFOLots.length}</p>`;
        }

        // Date range
        const dates = this.parsedTransactions.map(t => new Date(t.date)).sort((a, b) => a - b);
        if (dates.length > 0) {
            const firstDate = dates[0].toLocaleDateString();
            const lastDate = dates[dates.length - 1].toLocaleDateString();
            html += `<p style="margin: 5px 0;"><strong>Date Range:</strong> ${firstDate} → ${lastDate}</p>`;
        }

        html += '</div>';

        // Warnings/Info
        if (issues.warnings.length > 0) {
            html += '<div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
            html += '<h4 style="margin: 0 0 10px 0; color: #f57c00;">⚠️ Warnings</h4>';
            issues.warnings.forEach(warning => {
                html += `<p style="margin: 5px 0;">${warning}</p>`;
            });
            html += '</div>';
        }

        if (issues.info.length > 0) {
            html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
            html += '<h4 style="margin: 0 0 10px 0;">ℹ️ Information</h4>';
            issues.info.forEach(info => {
                html += `<p style="margin: 5px 0;">${info}</p>`;
            });
            html += '</div>';
        }

        // Safety reminder
        html += '<div style="background: #e8f5e9; padding: 15px; border-radius: 8px;">';
        html += '<h4 style="margin: 0 0 10px 0; color: #2e7d32;">✅ Safety</h4>';
        html += '<p style="margin: 5px 0;">• A backup will be created before import</p>';
        html += '<p style="margin: 5px 0;">• You can rollback if something goes wrong</p>';
        html += '<p style="margin: 5px 0;">• Original Excel files remain unchanged</p>';
        html += '</div>';

        html += '</div>';

        const modal = document.getElementById('importPreviewModal');
        const content = document.getElementById('importPreviewContent');
        content.innerHTML = html;
        modal.style.display = 'block';
    },

    /**
     * Close preview modal
     */
    closePreview() {
        const modal = document.getElementById('importPreviewModal');
        modal.style.display = 'none';
    },

    /**
     * Confirm and execute import
     */
    async confirmImport() {
        try {
            Utils.showNotification('Creating backup...', 'info');
            this.createBackup();

            Utils.showNotification('Importing data...', 'info');
            await this.executeImport();

            Utils.showNotification(
                `✓ Imported ${this.parsedTransactions.length} transactions and ${this.parsedFIFOLots.length} FIFO lots`,
                'success'
            );

            // Close modal
            this.closePreview();

            // Reload page after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Import execution failed:', error);
            Utils.showNotification(`Import failed: ${error.message}`, 'error');
        }
    },

    /**
     * Execute the import
     */
    async executeImport() {
        // Sort transactions chronologically
        this.parsedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Import transactions
        const existingTxns = StorageManager.getTransactions() || [];
        const newTransactions = [...existingTxns, ...this.parsedTransactions];
        StorageManager.saveTransactions(newTransactions);

        console.log(`Imported ${this.parsedTransactions.length} transactions (total: ${newTransactions.length})`);

        // Import FIFO lots from "US FCD" sheet
        if (this.parsedFIFOLots.length > 0) {
            const existingLots = FIFOManager.getAllLots() || [];
            const newLots = [...existingLots, ...this.parsedFIFOLots];
            FIFOManager.saveLots(newLots);

            console.log(`Imported ${this.parsedFIFOLots.length} FIFO lots from US FCD sheet (total: ${newLots.length})`);
        } else {
            // Create USD FIFO lots for DEPOSIT transactions ONLY if there's no "US FCD" sheet
            // This ensures DEPOSIT transactions create FIFO lots when US FCD sheet is missing
            const depositTransactions = this.parsedTransactions.filter(t =>
                t.type === 'DEPOSIT' && t.currency === 'USD'
            );

            if (depositTransactions.length > 0 && window.FIFOManager) {
                console.log(`No US FCD sheet found. Creating USD FIFO lots for ${depositTransactions.length} DEPOSIT transactions...`);

                const existingLots = FIFOManager.getAllLots() || [];

                depositTransactions.forEach(txn => {
                    try {
                        // Create lot manually (since createCurrencyLot only works with TRANSFER type)
                        const lot = {
                            id: Utils.generateId(),
                            portfolioId: txn.portfolioId,
                            assetId: 'USD_CURRENCY',
                            accountId: txn.accountId,
                            transactionId: txn.id,
                            purchaseDate: txn.date,
                            quantity: txn.totalAmount,
                            remainingQuantity: txn.totalAmount,
                            pricePerUnit: txn.exchangeRate,
                            currency: 'USD',
                            exchangeRate: txn.exchangeRate,
                            costBasisTHB: txn.totalAmount * txn.exchangeRate,
                            status: 'OPEN',
                            createdAt: new Date().toISOString(),
                            source: 'DEPOSIT',
                            description: txn.description || 'Imported deposit'
                        };

                        existingLots.push(lot);
                        console.log(`✓ Created USD FIFO lot: ${txn.totalAmount} USD @ ${txn.exchangeRate.toFixed(4)} THB/USD`);
                    } catch (error) {
                        console.warn(`Failed to create USD FIFO lot for transaction ${txn.id}:`, error.message);
                    }
                });

                // Save all lots at once
                FIFOManager.saveLots(existingLots);
                console.log(`✓ Total FIFO lots after import: ${existingLots.length}`);
            }
        }

        // Recalculate positions
        this.recalculatePositions();

        // Recalculate account balances from all transactions
        this.recalculateAccountBalances();
    },

    /**
     * Recalculate positions from imported transactions
     */
    recalculatePositions() {
        const positions = StorageManager.loadFromLocal('positions') || [];
        const positionMap = {};

        // Index existing positions
        positions.forEach(p => {
            const key = `${p.portfolioId}_${p.assetId}`;
            positionMap[key] = p;
        });

        // Update positions with imported BUY transactions
        this.parsedTransactions
            .filter(t => t.type === 'BUY' && t.assetId)
            .forEach(t => {
                const key = `${t.portfolioId}_${t.assetId}`;

                if (positionMap[key]) {
                    // Update existing position
                    const pos = positionMap[key];
                    pos.quantity += t.quantity;
                    pos.totalCost += t.totalAmount * t.exchangeRate;
                    pos.averageCost = pos.totalCost / pos.quantity;
                } else {
                    // Create new position
                    const totalCost = t.totalAmount * t.exchangeRate;
                    positionMap[key] = {
                        id: Utils.generateId(),
                        portfolioId: t.portfolioId,
                        assetId: t.assetId,
                        quantity: t.quantity,
                        totalCost: totalCost,
                        averageCost: totalCost / t.quantity
                    };
                }
            });

        // Save updated positions
        const updatedPositions = Object.values(positionMap);
        StorageManager.saveToLocal('positions', updatedPositions);

        console.log(`Recalculated ${updatedPositions.length} positions`);
    },

    /**
     * Recalculate account balances from all transactions
     * This ensures account.balance field matches the sum of all transactions
     */
    recalculateAccountBalances() {
        const accounts = AccountManager.getAllAccounts();
        const currentDate = new Date();

        accounts.forEach(account => {
            const calculatedBalance = AccountManager.calculateBalanceAsOfDate(account.id, currentDate);
            account.balance = calculatedBalance;
        });

        StorageManager.saveAccounts(accounts);
        console.log('✓ Account balances recalculated after import');
    },

    /**
     * Create backup before import
     */
    createBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            transactions: StorageManager.getTransactions() || [],
            positions: StorageManager.loadFromLocal('positions') || [],
            fifoLots: FIFOManager.getAllLots() || [],
            fifoSales: FIFOManager.getAllSales() || []
        };

        // Save to localStorage
        localStorage.setItem('IMPORT_BACKUP', JSON.stringify(backup));

        // Trigger browser download
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${backup.timestamp.replace(/[:.]/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.backupData = backup;
        console.log('Backup created:', backup.timestamp);
    },

    /**
     * Rollback to backup
     */
    rollbackToBackup() {
        const backup = localStorage.getItem('IMPORT_BACKUP');
        if (!backup) {
            alert('No backup found');
            return;
        }

        if (!confirm('Restore from backup? This will undo the import.')) {
            return;
        }

        const data = JSON.parse(backup);
        StorageManager.saveTransactions(data.transactions);
        StorageManager.saveToLocal('positions', data.positions);
        FIFOManager.saveLots(data.fifoLots);
        FIFOManager.saveSales(data.fifoSales);

        Utils.showNotification('✓ Backup restored', 'success');
        setTimeout(() => window.location.reload(), 1000);
    }
};

console.log('Excel Importer loaded');
