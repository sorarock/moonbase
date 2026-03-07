/* ============================================================================
   REBALANCING MANAGER
   Portfolio rebalancing calculations and recommendations
   ============================================================================ */

const RebalancingManager = {
    /**
     * Calculate drift for all assets in a portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {object} Drift analysis with asset details
     */
    calculateDrift(portfolioId) {
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        const positions = TransactionManager.getPortfolioPositions(portfolioId);
        const accounts = AccountManager.getAllAccounts().filter(acc => acc.portfolioId === portfolioId);
        
        // Calculate total portfolio value
        let totalValue = 0;
        const assetValues = {};
        
        portfolio.assets.forEach(asset => {
            let assetValue = 0;
            
            // Check if savings asset (use account balances)
            if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
                const linkedAccounts = accounts.filter(acc => 
                    acc.linkedAssetId === asset.id || 
                    (acc.linkedAssetType === asset.type && acc.linkedAssetName === asset.name)
                );
                assetValue = linkedAccounts.reduce((sum, acc) => {
                    if (acc.currency === 'USD') {
                        return sum + convertUSDToTHB(acc.balance);
                    }
                    return sum + acc.balance;
                }, 0);
            } else {
                // Regular asset (use positions × current price)
                const position = positions.find(p => p.assetId === asset.id);
                if (position) {
                    const priceData = PriceManager.getCurrentPrice(asset.id);
                    if (priceData) {
                        assetValue = position.quantity * priceData.price;
                        // Convert USD to THB if needed
                        if (priceData.currency === 'USD') {
                            assetValue = convertUSDToTHB(assetValue);
                        }
                    }
                }
            }
            
            assetValues[asset.id] = assetValue;
            totalValue += assetValue;
        });
        
        // Calculate drift for each asset
        const driftAnalysis = portfolio.assets.map(asset => {
            const currentValue = assetValues[asset.id] || 0;
            const currentAllocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
            const targetAllocation = asset.allocation;
            const drift = currentAllocation - targetAllocation;
            const driftPercentage = targetAllocation > 0 ? (drift / targetAllocation) * 100 : 0;
            
            // Determine status and severity
            let status = 'balanced';
            let severity = 'low';
            let color = 'var(--color-success)';
            
            if (Math.abs(drift) > 0.1) {
                status = drift > 0 ? 'overweight' : 'underweight';
                
                if (Math.abs(drift) > 10) {
                    severity = 'high';
                    color = 'var(--color-danger)';
                } else if (Math.abs(drift) > 5) {
                    severity = 'medium';
                    color = 'var(--color-warning)';
                } else {
                    severity = 'low';
                    color = 'var(--color-info)';
                }
            }
            
            return {
                assetId: asset.id,
                assetName: asset.name,
                assetTicker: asset.ticker,
                assetType: asset.type,
                currency: asset.currency,
                currentValue: currentValue,
                currentAllocation: currentAllocation,
                targetAllocation: targetAllocation,
                drift: drift,
                driftPercentage: driftPercentage,
                status: status,
                severity: severity,
                color: color,
                needsRebalancing: Math.abs(drift) > 5
            };
        });
        
        // Calculate overall portfolio health
        const maxDrift = Math.max(...driftAnalysis.map(a => Math.abs(a.drift)));
        const avgDrift = driftAnalysis.reduce((sum, a) => sum + Math.abs(a.drift), 0) / driftAnalysis.length;
        const assetsNeedingRebalancing = driftAnalysis.filter(a => a.needsRebalancing).length;
        
        return {
            portfolioId: portfolioId,
            portfolioName: portfolio.name,
            totalValue: totalValue,
            driftAnalysis: driftAnalysis,
            summary: {
                maxDrift: maxDrift,
                avgDrift: avgDrift,
                assetsNeedingRebalancing: assetsNeedingRebalancing,
                overallHealth: maxDrift < 5 ? 'healthy' : maxDrift < 10 ? 'moderate' : 'needs-rebalancing'
            }
        };
    },

    /**
     * Get rebalancing recommendations
     * @param {string} portfolioId - Portfolio ID
     * @param {string} strategy - Strategy: 'cashflow', 'full', or 'tax-efficient'
     * @param {number} threshold - Drift threshold (default 5%)
     * @param {object} options - Additional options
     * @returns {object} Rebalancing recommendations
     */
    getRebalancingRecommendations(portfolioId, strategy = 'full', threshold = 5, options = {}) {
        const driftData = this.calculateDrift(portfolioId);
        const portfolio = PortfolioManager.getPortfolio(portfolioId);
        
        // Filter assets that need rebalancing
        const assetsToRebalance = driftData.driftAnalysis.filter(a => Math.abs(a.drift) > threshold);
        
        if (assetsToRebalance.length === 0) {
            return {
                needsRebalancing: false,
                message: 'Portfolio is well balanced. No action needed.',
                driftData: driftData
            };
        }
        
        // Generate recommendations based on strategy
        let recommendations = [];
        
        switch (strategy) {
            case 'cashflow':
                recommendations = this._generateCashFlowRecommendations(portfolioId, driftData, options);
                break;
            case 'full':
                recommendations = this._generateFullRebalanceRecommendations(portfolioId, driftData, options);
                break;
            case 'tax-efficient':
                recommendations = this._generateTaxEfficientRecommendations(portfolioId, driftData, options);
                break;
            default:
                throw new Error('Invalid strategy');
        }
        
        return {
            needsRebalancing: true,
            strategy: strategy,
            threshold: threshold,
            driftData: driftData,
            recommendations: recommendations,
            estimatedImpact: this._calculateImpact(driftData, recommendations)
        };
    },

    /**
     * Generate cash flow rebalancing recommendations (add money only)
     * @private
     */
    _generateCashFlowRecommendations(portfolioId, driftData, options) {
        const recommendations = [];
        const newCash = options.availableCash || 0;
        
        if (newCash <= 0) {
            return [{
                type: 'INFO',
                message: 'No cash available. Add funds to rebalance using cash flow method.'
            }];
        }
        
        // Find underweighted assets
        const underweightedAssets = driftData.driftAnalysis
            .filter(a => a.drift < -1 && a.assetType !== 'thb_savings' && a.assetType !== 'fcd_account')
            .sort((a, b) => a.drift - b.drift); // Most underweighted first
        
        if (underweightedAssets.length === 0) {
            return [{
                type: 'INFO',
                message: 'All assets are at or above target. Consider rebalancing with full strategy.'
            }];
        }
        
        // Distribute new cash proportionally to underweighted assets
        const totalUnderweight = underweightedAssets.reduce((sum, a) => sum + Math.abs(a.drift), 0);
        
        underweightedAssets.forEach(asset => {
            const proportion = Math.abs(asset.drift) / totalUnderweight;
            const amountToInvest = newCash * proportion;
            
            if (amountToInvest > 100) { // Minimum investment threshold
                const priceData = PriceManager.getCurrentPrice(asset.assetId);
                if (priceData) {
                    let quantity = amountToInvest / priceData.price;
                    if (priceData.currency === 'USD') {
                        quantity = amountToInvest / convertUSDToTHB(priceData.price);
                    }
                    
                    recommendations.push({
                        type: 'BUY',
                        assetId: asset.assetId,
                        assetName: asset.assetName,
                        assetTicker: asset.assetTicker,
                        currency: asset.currency,
                        quantity: quantity,
                        estimatedPrice: priceData.price,
                        estimatedValue: amountToInvest,
                        reason: `Underweighted by ${Math.abs(asset.drift).toFixed(1)}%`,
                        priority: asset.severity === 'high' ? 1 : asset.severity === 'medium' ? 2 : 3
                    });
                }
            }
        });
        
        return recommendations;
    },

    /**
     * Generate full rebalancing recommendations (buy and sell)
     * @private
     */
    _generateFullRebalanceRecommendations(portfolioId, driftData, options) {
        const recommendations = [];
        const minTradeValue = options.minTradeValue || 1000;
        
        // Calculate target values for each asset
        driftData.driftAnalysis.forEach(asset => {
            if (asset.assetType === 'thb_savings' || asset.assetType === 'fcd_account') {
                return; // Skip savings accounts
            }
            
            const targetValue = driftData.totalValue * (asset.targetAllocation / 100);
            const difference = targetValue - asset.currentValue;
            
            if (Math.abs(difference) > minTradeValue) {
                const priceData = PriceManager.getCurrentPrice(asset.assetId);
                if (!priceData) {
                    return; // Skip if no price available
                }
                
                const positions = TransactionManager.getPortfolioPositions(portfolioId);
                const position = positions.find(p => p.assetId === asset.assetId);
                const currentQuantity = position ? position.quantity : 0;
                
                let price = priceData.price;
                if (priceData.currency === 'USD') {
                    price = convertUSDToTHB(priceData.price);
                }
                
                const quantityChange = difference / price;
                const newQuantity = currentQuantity + quantityChange;
                
                if (quantityChange > 0) {
                    // BUY
                    recommendations.push({
                        type: 'BUY',
                        assetId: asset.assetId,
                        assetName: asset.assetName,
                        assetTicker: asset.assetTicker,
                        currency: asset.currency,
                        quantity: Math.abs(quantityChange),
                        estimatedPrice: priceData.price,
                        estimatedValue: Math.abs(difference),
                        currentQuantity: currentQuantity,
                        newQuantity: newQuantity,
                        reason: `Underweighted by ${Math.abs(asset.drift).toFixed(1)}%`,
                        priority: asset.severity === 'high' ? 1 : asset.severity === 'medium' ? 2 : 3
                    });
                } else {
                    // SELL
                    recommendations.push({
                        type: 'SELL',
                        assetId: asset.assetId,
                        assetName: asset.assetName,
                        assetTicker: asset.assetTicker,
                        currency: asset.currency,
                        quantity: Math.abs(quantityChange),
                        estimatedPrice: priceData.price,
                        estimatedValue: Math.abs(difference),
                        currentQuantity: currentQuantity,
                        newQuantity: newQuantity,
                        reason: `Overweighted by ${Math.abs(asset.drift).toFixed(1)}%`,
                        priority: asset.severity === 'high' ? 1 : asset.severity === 'medium' ? 2 : 3
                    });
                }
            }
        });
        
        // Sort by priority
        return recommendations.sort((a, b) => a.priority - b.priority);
    },

    /**
     * Generate tax-efficient rebalancing recommendations
     * @private
     */
    _generateTaxEfficientRecommendations(portfolioId, driftData, options) {
        // Start with cash flow approach (most tax-efficient)
        const cashflowRecs = this._generateCashFlowRecommendations(portfolioId, driftData, options);
        
        // If cash flow doesn't solve the problem, add strategic sells
        const stillOverweighted = driftData.driftAnalysis.filter(a => a.drift > 5);
        
        if (stillOverweighted.length > 0 && cashflowRecs[0]?.type !== 'INFO') {
            stillOverweighted.forEach(asset => {
                if (asset.assetType === 'thb_savings' || asset.assetType === 'fcd_account') {
                    return;
                }
                
                const priceData = PriceManager.getCurrentPrice(asset.assetId);
                if (priceData) {
                    const targetValue = driftData.totalValue * (asset.targetAllocation / 100);
                    const difference = asset.currentValue - targetValue;
                    
                    if (difference > 1000) {
                        let price = priceData.price;
                        if (priceData.currency === 'USD') {
                            price = convertUSDToTHB(priceData.price);
                        }
                        
                        const quantityToSell = difference / price;
                        
                        cashflowRecs.push({
                            type: 'SELL',
                            assetId: asset.assetId,
                            assetName: asset.assetName,
                            assetTicker: asset.assetTicker,
                            currency: asset.currency,
                            quantity: quantityToSell,
                            estimatedPrice: priceData.price,
                            estimatedValue: difference,
                            reason: `Overweighted by ${asset.drift.toFixed(1)}% - Strategic sell`,
                            priority: 2,
                            taxNote: 'Consider tax implications before selling'
                        });
                    }
                }
            });
        }
        
        return cashflowRecs;
    },

    /**
     * Calculate impact of rebalancing
     * @private
     */
    _calculateImpact(driftData, recommendations) {
        const beforeDrift = driftData.summary.maxDrift;
        
        // Estimate after-rebalancing drift (simplified)
        const buyValue = recommendations
            .filter(r => r.type === 'BUY')
            .reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
        const sellValue = recommendations
            .filter(r => r.type === 'SELL')
            .reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
        
        const estimatedFees = recommendations.length * 10; // 10 THB per trade estimate
        
        return {
            beforeDrift: beforeDrift,
            estimatedAfterDrift: 1.0, // Simplified - would be close to 0
            improvement: beforeDrift > 0 ? ((beforeDrift - 1.0) / beforeDrift) * 100 : 0,
            totalBuyValue: buyValue,
            totalSellValue: sellValue,
            estimatedFees: estimatedFees,
            netCashFlow: sellValue - buyValue - estimatedFees,
            numberOfTrades: recommendations.length
        };
    },

    /**
     * Format drift data for display
     * @param {object} driftData - Drift analysis data
     * @returns {string} HTML formatted drift display
     */
    formatDriftDisplay(driftData) {
        if (!driftData || !driftData.driftAnalysis) {
            return '<p>No drift data available</p>';
        }
        
        const rows = driftData.driftAnalysis.map(asset => {
            const driftArrow = asset.drift > 0 ? '▲' : asset.drift < 0 ? '▼' : '●';
            const driftSign = asset.drift > 0 ? '+' : '';
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm); background: var(--color-bg-secondary); border-radius: var(--radius-sm); margin-bottom: var(--space-xs); border-left: 4px solid ${asset.color};">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${asset.assetName} (${asset.assetTicker})</div>
                        <div style="font-size: 12px; color: var(--color-text-secondary);">
                            Current: ${asset.currentAllocation.toFixed(1)}% • Target: ${asset.targetAllocation.toFixed(1)}%
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: 600; color: ${asset.color};">
                            ${driftArrow} ${driftSign}${asset.drift.toFixed(1)}%
                        </div>
                        <div style="font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase;">
                            ${asset.status}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div style="margin-bottom: var(--space-lg);">
                <h4 style="margin-bottom: var(--space-md);">Drift Analysis</h4>
                ${rows}
            </div>
        `;
    },

    /**
     * Format recommendations for display
     * @param {array} recommendations - Array of recommendations
     * @returns {string} HTML formatted recommendations
     */
    formatRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return '<p>No recommendations available</p>';
        }
        
        if (recommendations[0]?.type === 'INFO') {
            return `<div class="alert alert-info">${recommendations[0].message}</div>`;
        }
        
        const rows = recommendations.map((rec, index) => {
            const icon = rec.type === 'BUY' ? '🛒' : '💵';
            const color = rec.type === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)';
            
            return `
                <div style="padding: var(--space-md); background: var(--color-bg-secondary); border-radius: var(--radius-sm); margin-bottom: var(--space-sm); border-left: 4px solid ${color};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-sm);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 24px;">${icon}</span>
                            <div>
                                <div style="font-weight: 600; font-size: 16px;">${rec.type} ${rec.assetName}</div>
                                <div style="font-size: 12px; color: var(--color-text-secondary);">${rec.assetTicker}</div>
                            </div>
                        </div>
                        <span class="status-badge status-${rec.priority === 1 ? 'danger' : rec.priority === 2 ? 'warning' : 'info'}">
                            Priority ${rec.priority}
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-sm); margin-bottom: var(--space-sm);">
                        <div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">Quantity</div>
                            <div style="font-weight: 600;">${rec.quantity.toFixed(4)} shares</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">Estimated Value</div>
                            <div style="font-weight: 600;">${Utils.formatCurrency(rec.estimatedValue, 'THB')}</div>
                        </div>
                    </div>
                    
                    <div style="padding: var(--space-xs); background: var(--color-bg); border-radius: var(--radius-sm); font-size: 13px;">
                        💡 ${rec.reason}
                    </div>
                    
                    ${rec.taxNote ? `
                        <div style="margin-top: var(--space-xs); padding: var(--space-xs); background: var(--color-warning); color: white; border-radius: var(--radius-sm); font-size: 12px;">
                            ⚠️ ${rec.taxNote}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        return rows;
    }
};

// Export for use in other modules
window.RebalancingManager = RebalancingManager;