/* ============================================================================
   REPORTS MODULE
   Portfolio performance reports and analytics
   ============================================================================ */

const ReportsManager = {
    
    /**
     * Generate timeline data for portfolio value over time
     * @param {string} portfolioId - Portfolio ID
     * @param {string} timeframe - '1M', '3M', '6M', '1Y', 'YTD', 'ALL'
     * @param {string} asOfDate - As of date (YYYY-MM-DD), defaults to today
     * @param {string} granularity - 'day', 'week', 'month', 'year' - data aggregation level
     * @returns {object} Timeline data with dates and values
     */
    generateTimelineData(portfolioId, timeframe = 'ALL', asOfDate = null, granularity = 'day') {
        const allTransactions = TransactionManager.getTransactions({ portfolioId });
        // Filter transactions by as-of-date
        const transactions = asOfDate ? Utils.filterTransactionsByAsOfDate(allTransactions, asOfDate) : allTransactions;
        if (transactions.length === 0) {
            return {
                dates: [],
                marketValueValues: [],
                depositValues: [],
                cashFlowEvents: [],
                startDate: null,
                endDate: null,
                firstTransactionDate: null,
                limitedByHistory: false
            };
        }
        
        // Sort transactions by date
        const sortedTxns = [...transactions].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        // Find first transaction date (this is when portfolio actually started)
        const firstTransactionDate = new Date(sortedTxns[0].date);
        
        // Determine date range based on timeframe
        // Use asOfDate if provided, otherwise use today
        const today = asOfDate ? new Date(asOfDate) : new Date();
        const endDate = today;
        let requestedStartDate;
        
        switch(timeframe) {
            case '1M':
                requestedStartDate = new Date(today);
                requestedStartDate.setMonth(today.getMonth() - 1);
                break;
            case '3M':
                requestedStartDate = new Date(today);
                requestedStartDate.setMonth(today.getMonth() - 3);
                break;
            case '6M':
                requestedStartDate = new Date(today);
                requestedStartDate.setMonth(today.getMonth() - 6);
                break;
            case '1Y':
                requestedStartDate = new Date(today);
                requestedStartDate.setFullYear(today.getFullYear() - 1);
                break;
            case 'YTD':
                requestedStartDate = new Date(today.getFullYear(), 0, 1);
                break;
            case 'ALL':
            default:
                requestedStartDate = new Date(sortedTxns[0].date);
                break;
        }
        
        // CRITICAL FIX: Start date cannot be before first transaction
        // If requested lookback goes before first transaction, start from first transaction instead
        const actualStartDate = requestedStartDate < firstTransactionDate ? firstTransactionDate : requestedStartDate;
        const limitedByHistory = requestedStartDate < firstTransactionDate;
        
        // Get exchange rates from transfers for currency conversion
        const exchangeRates = PortfolioManager.getExchangeRatesFromTransfers(portfolioId);
        const globalExchangeRate = typeof getExchangeRate === 'function' ? getExchangeRate() : 35;
        
        // Generate daily snapshots
        const timeline = [];
        const cashFlowEvents = [];
        let currentDate = new Date(actualStartDate);
        
        // Calculate value at each date
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Get transactions up to this date
            const txnsUpToDate = sortedTxns.filter(txn => 
                new Date(txn.date) <= currentDate
            );
            
            // Calculate MARKET VALUE = Account Balances + Asset Market Value
            let accountBalances = 0;
            
            // Calculate total deposits for the DEPOSITS line
            let totalDeposits = 0;
            
            // Track asset quantities at this date
            const assetQuantities = {}; // { assetId: quantity }
            
            txnsUpToDate.forEach(txn => {
                // Convert to THB using transaction exchange rate or global rate
                let amountInTHB = txn.totalAmount;
                let feeInTHB = txn.fee || 0;
                
                if (txn.currency === 'USD') {
                    // Use transaction exchange rate if available, otherwise use global rate
                    const rate = txn.exchangeRate || exchangeRates.USD_TO_THB || globalExchangeRate;
                    amountInTHB = txn.totalAmount * rate;
                    feeInTHB = (txn.fee || 0) * rate;
                }
                
                // Process transaction type
                if (txn.type === 'DEPOSIT') {
                    accountBalances += amountInTHB;
                    totalDeposits += amountInTHB; // Track cumulative deposits
                    
                } else if (txn.type === 'WITHDRAW') {
                    accountBalances -= amountInTHB;
                    
                } else if (txn.type === 'BUY') {
                    // Remove money from account and track asset quantity
                    accountBalances -= (amountInTHB + feeInTHB);
                    if (txn.assetId) {
                        assetQuantities[txn.assetId] = (assetQuantities[txn.assetId] || 0) + txn.quantity;
                    }
                    
                } else if (txn.type === 'SELL') {
                    // Add money to account and reduce asset quantity
                    accountBalances += (amountInTHB - feeInTHB);
                    if (txn.assetId) {
                        assetQuantities[txn.assetId] = (assetQuantities[txn.assetId] || 0) - txn.quantity;
                    }
                    
                } else if (txn.type === 'DIVIDEND' || txn.type === 'INTEREST') {
                    // Add to account balance
                    accountBalances += amountInTHB;
                    
                } else if (txn.type === 'TRANSFER') {
                    // Transfers move money between accounts (net zero effect on total)
                    // But fees reduce total balance
                    accountBalances -= feeInTHB;
                }
            });
            
            // Calculate market value of all assets using CURRENT prices
            let assetsMarketValue = 0;
            for (const assetId in assetQuantities) {
                const quantity = assetQuantities[assetId];
                if (quantity > 0) {
                    const priceData = PriceManager.getCurrentPrice(assetId);
                    if (priceData) {
                        let assetValue = quantity * priceData.price;
                        // Convert USD to THB if needed
                        if (priceData.currency === 'USD') {
                            assetValue = assetValue * globalExchangeRate;
                        }
                        assetsMarketValue += assetValue;
                    }
                }
            }
            
            // Market Value = Account Balances + Asset Market Value
            const marketValue = accountBalances + assetsMarketValue;
            
            timeline.push({
                date: dateStr,
                marketValue: marketValue,
                deposits: totalDeposits
            });
            
            // Check for cash flow events on this date
            const dayTxns = txnsUpToDate.filter(txn => txn.date === dateStr);
            const cashFlows = dayTxns.filter(txn => 
                txn.type === 'DEPOSIT' || txn.type === 'WITHDRAW'
            );
            
            if (cashFlows.length > 0) {
                cashFlowEvents.push({
                    date: dateStr,
                    transactions: cashFlows
                });
            }
            
            // Move to next interval based on granularity
            switch(granularity) {
                case 'day':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'week':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'month':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'year':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
                default:
                    currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        const result = {
            dates: timeline.map(t => t.date),
            marketValueValues: timeline.map(t => t.marketValue),
            depositValues: timeline.map(t => t.deposits),
            cashFlowEvents,
            startDate: actualStartDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            firstTransactionDate: firstTransactionDate.toISOString().split('T')[0],
            limitedByHistory: limitedByHistory
        };
        
        // Debug logging
        console.log('=== TIMELINE DATA DEBUG ===');
        console.log('Dates count:', result.dates.length);
        console.log('Market Value values:', result.marketValueValues);
        console.log('Deposit values:', result.depositValues);
        console.log('Sample - Last date:', result.dates[result.dates.length - 1]);
        console.log('Sample - Last market value:', result.marketValueValues[result.marketValueValues.length - 1]);
        console.log('Sample - Last deposits:', result.depositValues[result.depositValues.length - 1]);
        
        return result;
    },
    
    /**
     * Calculate current portfolio value
     * @param {string} portfolioId - Portfolio ID
     * @returns {number} Current total value
     */
    calculateCurrentPortfolioValue(portfolioId) {
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        if (!portfolio) return 0;
        
        const positions = TransactionManager.getPortfolioPositions(portfolioId);
        const accounts = AccountManager.getAllAccounts().filter(acc => 
            acc.portfolioId === portfolioId
        );
        
        let totalValue = 0;
        
        // Add asset values
        portfolio.assets.forEach(asset => {
            if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
                // For savings assets, use account balances
                const linkedAccounts = accounts.filter(acc => 
                    acc.linkedAssetId === asset.id ||
                    (acc.linkedAssetType === asset.type && acc.linkedAssetName === asset.name)
                );
                totalValue += linkedAccounts.reduce((sum, acc) => {
                    // Convert USD to THB if needed
                    if (acc.currency === 'USD') {
                        return sum + convertUSDToTHB(acc.balance);
                    }
                    return sum + acc.balance;
                }, 0);
            } else {
                // For regular assets, use positions × current price
                const position = positions.find(p => p.assetId === asset.id);
                if (position) {
                    const priceData = PriceManager.getCurrentPrice(asset.id);
                    if (priceData) {
                        let assetValue = position.quantity * priceData.price;
                        // Convert USD to THB if needed
                        if (priceData.currency === 'USD') {
                            assetValue = convertUSDToTHB(assetValue);
                        }
                        totalValue += assetValue;
                    }
                }
            }
        });
        
        return totalValue;
    },
    
    /**
     * Extract cash flows for display in timeline
     * @param {string} portfolioId - Portfolio ID
     * @param {string} asOfDate - As of date (YYYY-MM-DD)
     * @returns {array} Array of cash flow events with dates and amounts
     */
    extractCashFlows(portfolioId, asOfDate = null) {
        const cashFlowData = this.getDCACashFlows(portfolioId, asOfDate);
        
        if (cashFlowData.cashFlows.length === 0) {
            return [];
        }
        
        // Convert to display format
        const flows = [];
        
        // Add all deposits (negative cash flows)
        for (let i = 0; i < cashFlowData.cashFlows.length - 1; i++) {
            flows.push({
                date: cashFlowData.dates[i],
                amount: cashFlowData.cashFlows[i], // Already negative
                description: 'Deposit'
            });
        }
        
        // Add current value (positive cash flow)
        flows.push({
            date: cashFlowData.dates[cashFlowData.dates.length - 1],
            amount: cashFlowData.currentValue,
            description: 'Current Portfolio Value'
        });
        
        return flows;
    },
    
    /**
     * Extract cash flows from deposit transactions
     * @param {string} portfolioId - Portfolio ID
     * @param {string} asOfDate - As of date (YYYY-MM-DD), defaults to today
     * @returns {object} Cash flows and dates for XIRR calculation
     */
    getDCACashFlows(portfolioId, asOfDate = null) {
        const allTransactions = TransactionManager.getTransactions({ portfolioId });
        const filteredTransactions = asOfDate ? Utils.filterTransactionsByAsOfDate(allTransactions, asOfDate) : allTransactions;
        
        // Get all deposit transactions (negative cash flows)
        const deposits = filteredTransactions
            .filter(txn => txn.type === 'DEPOSIT')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (deposits.length === 0) {
            return {
                cashFlows: [],
                dates: [],
                totalInvested: 0,
                numberOfDeposits: 0,
                firstDate: null,
                lastDate: null
            };
        }
        
        // Build cash flow arrays
        const cashFlows = [];
        const dates = [];
        let totalInvested = 0;
        
        deposits.forEach(deposit => {
            // Convert to THB if needed
            let amountInTHB = deposit.totalAmount;
            if (deposit.currency === 'USD') {
                const rate = getExchangeRate();
                amountInTHB = deposit.totalAmount * rate;
            }
            
            // Deposits are negative cash flows (money going out)
            cashFlows.push(-amountInTHB);
            dates.push(deposit.date);
            totalInvested += amountInTHB;
        });
        
        // Add final portfolio value as positive cash flow
        // Use the same calculation as Transaction menu's "Total Asset as of" value
        const endDate = asOfDate || new Date().toISOString().split('T')[0];
        const stats = TransactionManager.calculatePortfolioStats(portfolioId);
        const currentValue = stats.totalAssetValueAsOf;
        cashFlows.push(currentValue);
        dates.push(endDate);
        
        return {
            cashFlows,
            dates,
            totalInvested,
            numberOfDeposits: deposits.length,
            firstDate: deposits[0].date,
            lastDate: deposits[deposits.length - 1].date,
            currentValue
        };
    },
    
    /**
     * Calculate simple IRR (Internal Rate of Return)
     * Assumes equal time periods between cash flows
     * Uses Newton-Raphson method to solve for rate
     * @param {array} cashFlows - Array of cash flows (negative for investments, positive for returns)
     * @param {number} periodsPerYear - Number of periods per year (12 for monthly, 4 for quarterly, etc.)
     * @returns {number} Annualized IRR as decimal (e.g., 0.0824 = 8.24%)
     */
    calculateSimpleIRR(cashFlows, periodsPerYear = 12) {
        if (cashFlows.length < 2) {
            return 0;
        }
        
        // Newton-Raphson iteration to find IRR
        let guess = 0.1; // Initial guess of 10% per period
        const maxIterations = 1000;
        const tolerance = 0.0001;
        
        for (let i = 0; i < maxIterations; i++) {
            let npv = 0;
            let dnpv = 0;
            
            // Calculate NPV and its derivative
            for (let t = 0; t < cashFlows.length; t++) {
                const factor = Math.pow(1 + guess, t);
                npv += cashFlows[t] / factor;
                
                // Calculate derivative for all terms (t=0 will be zero anyway)
                dnpv -= cashFlows[t] * t / (factor * (1 + guess));
            }
            
            // Check for convergence
            if (Math.abs(npv) < tolerance) {
                // Convert periodic rate to annual rate
                const annualRate = Math.pow(1 + guess, periodsPerYear) - 1;
                return annualRate;
            }
            
            // Update guess
            if (dnpv === 0) {
                return 0; // Avoid division by zero
            }
            
            const newGuess = guess - npv / dnpv;
            
            // Prevent negative rates
            if (newGuess <= -1) {
                guess = guess / 2;
            } else {
                guess = newGuess;
            }
        }
        
        // Return best guess after max iterations (annualized)
        const annualRate = Math.pow(1 + guess, periodsPerYear) - 1;
        return annualRate;
    },
    
    /**
     * Calculate XIRR (Extended Internal Rate of Return)
     * Uses Newton-Raphson method to solve for rate
     * @param {array} cashFlows - Array of cash flows (negative for investments, positive for returns)
     * @param {array} dates - Array of dates corresponding to cash flows (YYYY-MM-DD)
     * @returns {number} XIRR as decimal (e.g., 0.0824 = 8.24%)
     */
    calculateXIRR(cashFlows, dates) {
        if (cashFlows.length !== dates.length || cashFlows.length < 2) {
            return 0;
        }
        
        // Convert dates to days from first date
        const firstDate = new Date(dates[0]);
        const daysDiff = dates.map(date => {
            const d = new Date(date);
            return (d - firstDate) / (1000 * 60 * 60 * 24);
        });
        
        // Newton-Raphson iteration
        let guess = 0.1; // Initial guess of 10%
        const maxIterations = 1000;
        const tolerance = 0.0001;
        
        for (let i = 0; i < maxIterations; i++) {
            let npv = 0;
            let dnpv = 0;
            
            // Calculate NPV and its derivative
            for (let j = 0; j < cashFlows.length; j++) {
                const days = daysDiff[j];
                const years = days / 365.0;
                const factor = Math.pow(1 + guess, years);
                
                npv += cashFlows[j] / factor;
                dnpv -= cashFlows[j] * years / (factor * (1 + guess));
            }
            
            // Check for convergence
            if (Math.abs(npv) < tolerance) {
                return guess;
            }
            
            // Update guess
            if (dnpv === 0) {
                return 0; // Avoid division by zero
            }
            
            const newGuess = guess - npv / dnpv;
            
            // Prevent negative rates
            if (newGuess <= -1) {
                guess = guess / 2;
            } else {
                guess = newGuess;
            }
        }
        
        // Return best guess after max iterations
        return guess;
    },
    
    /**
     * Calculate CAGR (Compound Annual Growth Rate)
     * @param {number} startValue - Starting value
     * @param {number} endValue - Ending value
     * @param {number} years - Number of years
     * @returns {number} CAGR as percentage
     */
    calculateCAGR(startValue, endValue, years) {
        if (startValue <= 0 || years <= 0) return 0;
        
        const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
        return cagr;
    },
    
    /**
     * Calculate comprehensive IRR metrics for a portfolio
     * @param {string} portfolioId - Portfolio ID
     * @param {string} asOfDate - As of date (YYYY-MM-DD), defaults to today
     * @returns {object} Complete IRR analysis
     */
    calculateIRRMetrics(portfolioId, asOfDate = null) {
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        if (!portfolio) return null;
        
        // Get cash flows
        const cashFlowData = this.getDCACashFlows(portfolioId, asOfDate);
        
        if (cashFlowData.numberOfDeposits === 0) {
            return {
                hasData: false,
                message: 'No deposit transactions found for this portfolio'
            };
        }
        
        // Calculate time period
        const firstDate = new Date(cashFlowData.firstDate);
        const lastDate = new Date(cashFlowData.lastDate);
        const endDate = asOfDate ? new Date(asOfDate) : new Date();
        const totalDays = (endDate - firstDate) / (1000 * 60 * 60 * 24);
        const totalYears = totalDays / 365.25;
        const totalMonths = Math.round(totalYears * 12);
        
        // Calculate simple IRR (assumes equal periods)
        // Determine average period frequency (monthly, quarterly, etc.)
        const avgDaysBetweenDeposits = totalDays / Math.max(1, cashFlowData.numberOfDeposits);
        let periodsPerYear = 12; // Default to monthly
        
        if (avgDaysBetweenDeposits >= 80 && avgDaysBetweenDeposits <= 100) {
            periodsPerYear = 4; // Quarterly
        } else if (avgDaysBetweenDeposits >= 25 && avgDaysBetweenDeposits <= 35) {
            periodsPerYear = 12; // Monthly
        } else if (avgDaysBetweenDeposits >= 6 && avgDaysBetweenDeposits <= 8) {
            periodsPerYear = 52; // Weekly
        } else if (avgDaysBetweenDeposits >= 350) {
            periodsPerYear = 1; // Yearly
        }
        
        const irrDecimal = this.calculateSimpleIRR(cashFlowData.cashFlows, periodsPerYear);
        const irrPercent = irrDecimal * 100;
        
        // Calculate XIRR
        const xirrDecimal = this.calculateXIRR(cashFlowData.cashFlows, cashFlowData.dates);
        const xirrPercent = xirrDecimal * 100;
        
        // Calculate CAGR for comparison
        const cagr = this.calculateCAGR(
            cashFlowData.totalInvested,
            cashFlowData.currentValue,
            totalYears
        );
        
        // Calculate gains
        const totalGainLoss = cashFlowData.currentValue - cashFlowData.totalInvested;
        const absoluteReturnPercent = cashFlowData.totalInvested > 0 
            ? (totalGainLoss / cashFlowData.totalInvested) * 100 
            : 0;
        
        // Calculate average investment
        const averageInvestment = cashFlowData.totalInvested / cashFlowData.numberOfDeposits;
        
        // Performance vs expected
        const expectedReturn = portfolio.weightedReturn || 0;
        const performanceDiff = xirrPercent - expectedReturn;
        const isOutperforming = performanceDiff >= 0;
        
        return {
            hasData: true,
            
            // Investment summary
            firstInvestmentDate: cashFlowData.firstDate,
            latestInvestmentDate: cashFlowData.lastDate,
            investmentPeriodMonths: totalMonths,
            investmentPeriodYears: totalYears,
            numberOfDeposits: cashFlowData.numberOfDeposits,
            totalInvested: cashFlowData.totalInvested,
            averageInvestment: averageInvestment,
            
            // Current status
            currentValue: cashFlowData.currentValue,
            totalGainLoss: totalGainLoss,
            absoluteReturnPercent: absoluteReturnPercent,
            
            // Annualized returns
            irr: irrPercent,
            xirr: xirrPercent,
            cagr: cagr,
            
            // Performance comparison
            expectedReturn: expectedReturn,
            performanceDiff: performanceDiff,
            isOutperforming: isOutperforming,
            
            // Cash flow details for visualization
            cashFlows: cashFlowData.cashFlows,
            dates: cashFlowData.dates
        };
    },
    
    /**
     * Calculate week number of the year (ISO week)
     * @param {Date} date - Date object
     * @returns {number} Week number (1-53)
     */
    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    },
    
    /**
     * Format timeline data for Chart.js
     * @param {object} timelineData - Raw timeline data
     * @param {string} granularity - 'day', 'week', 'month', 'year'
     * @returns {object} Chart.js compatible data
     */
    formatTimelineForChart(timelineData, granularity = 'day') {
        return {
            labels: timelineData.dates.map(date => {
                const d = new Date(date);
                
                switch(granularity) {
                    case 'day':
                        // dd/mm/yy format
                        const day = d.getDate().toString().padStart(2, '0');
                        const month = (d.getMonth() + 1).toString().padStart(2, '0');
                        const year = d.getFullYear().toString().substr(-2);
                        return `${day}/${month}/${year}`;
                        
                    case 'week':
                        // Week #/YY format
                        const weekNum = this.getWeekNumber(d);
                        const yearShort = d.getFullYear().toString().substr(-2);
                        return `Week ${weekNum}/${yearShort}`;
                        
                    case 'month':
                        // MM/YY format
                        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
                        const yy = d.getFullYear().toString().substr(-2);
                        return `${mm}/${yy}`;
                        
                    case 'year':
                        // YYYY format
                        return d.getFullYear().toString();
                        
                    default:
                        // Fallback to default format
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            }),
            datasets: [
                {
                    label: 'Portfolio Value',
                    data: timelineData.marketValueValues,
                    borderColor: '#007AFF',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#007AFF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Total Deposits',
                    data: timelineData.depositValues,
                    borderColor: '#FF9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#FF9500',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderDash: [5, 5] // Dashed line for deposits
                }
            ]
        };
    },
    
    /**
     * Format cash flow events as chart annotations
     * @param {array} cashFlowEvents - Cash flow events
     * @returns {array} Chart annotation objects
     */
    formatCashFlowAnnotations(cashFlowEvents) {
        return cashFlowEvents.map(event => {
            const totalDeposit = event.transactions
                .filter(txn => txn.type === 'DEPOSIT')
                .reduce((sum, txn) => sum + txn.totalAmount, 0);
            
            const totalWithdraw = event.transactions
                .filter(txn => txn.type === 'WITHDRAW')
                .reduce((sum, txn) => sum + txn.totalAmount, 0);
            
            const netFlow = totalDeposit - totalWithdraw;
            
            return {
                date: event.date,
                type: netFlow >= 0 ? 'deposit' : 'withdrawal',
                amount: Math.abs(netFlow),
                label: netFlow >= 0 ? '⬇️' : '⬆️'
            };
        });
    }
};

// Export for use in other modules
window.ReportsManager = ReportsManager;