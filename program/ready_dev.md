# Pre-Development Review: Technical & Business Inquiries
## Investment Portfolio Management System

**Reviewer**: Financial IT Expert  
**Review Date**: February 28, 2026  
**Status**: ✅ RESOLVED - Ready for Development
**Resolution Date**: February 28, 2026

---

## Executive Summary

After reviewing `program/requirement.md` (technical specifications) and `program/development_topic.md` (business discussions), all critical inquiries have been resolved through detailed business discussions. This document now reflects final decisions and provides clear technical guidance for development.

**Status**: All 🔴 CRITICAL items resolved. All 🟡 IMPORTANT items have clear direction. Development can proceed.

**Key Architectural Decisions Made**:
1. ✅ Portfolio-scoped account structure (THB/FCD accounts within each portfolio)
2. ✅ Interest calculation on payment date (bi-annually: June 30 & Dec 31)
3. ✅ Two-tier rebalancing warnings (10% yellow, 15% red)
4. ✅ Actual Dime interest rates incorporated (THB: 3.0%/1.2%/0.5%, FCD: 4.5%/2.5%/0.5%)
5. ✅ Transaction-based interest calculation (not daily real-time)

---

## Section 1: Data Management & Storage

### 1.1 Historical Price Data Storage Strategy 🔴 CRITICAL

**Issue**: Requirements specify "maintain price history" but no details on retention policy, storage optimization, or query patterns.

**Technical Questions**:
- How many years of historical prices should we store?
- Store daily prices only, or support intraday granularity?
- When to archive or purge old price data?
- How to handle missing data gaps (market holidays, delisted assets)?

**Impact**: 
- Affects Local Storage capacity planning (5-10MB limit)
- Determines query performance for charts and backtesting
- Influences data export file sizes

**Proposed Solution**:
```javascript
// Option A: Rolling window (last 5 years)
const PRICE_RETENTION_DAYS = 1825; // 5 years

// Option B: Tiered storage (granular recent, sparse historical)
const PRICE_TIERS = {
  last30Days: 'daily',     // Keep all daily prices
  last365Days: 'weekly',   // Keep weekly prices
  older: 'monthly'         // Keep monthly prices only
};
```

**Business Alignment**: Check development_topic.md - no discussion about historical data retention policy.

**✅ DECISION RESOLVED**: 

**Approach**: Option A - Rolling window (last 5 years) with optimization for Local Storage.

**Implementation**:
```javascript
const PRICE_RETENTION_DAYS = 1825; // 5 years maximum

// Store structure optimized for space
{
  assetId: 'asset_001',
  prices: [
    { date: '2026-02-28', price: 450.25, source: 'Yahoo Finance' },
    // Daily prices for recent data
  ],
  // Auto-purge prices older than 5 years on save
}

// Granularity strategy
- Last 30 days: Daily prices (all)
- 30-365 days: Daily prices (keep all for charts)
- 1-5 years: Weekly average (compress to save space)
- >5 years: Purge automatically
```

**Missing Data Handling**:
- Market holidays: Leave gaps, chart library handles
- Delisted assets: Keep historical data, mark as "delisted"
- Failed fetches: Show last known price with timestamp

**Rationale**: 5 years sufficient for CAGR calculations and charts. Weekly averages for older data save 85% storage while maintaining trend visibility.

---

### 1.2 Transaction History vs Position Tracking 🟡 IMPORTANT

**Issue**: Requirements show both `investments` (transactions) and `positions` (aggregated) tables. Need clarification on update strategy.

**Technical Questions**:
- Real-time position updates after each transaction, or batch at EOD?
- Reconciliation process if positions drift from transactions?
- How to handle position adjustments (splits, mergers, spinoffs)?
- Performance implications of recalculating positions on every view?

**Current Schema** (from requirement.md):
```javascript
// Transactions: Granular record
investments: [{ id, portfolioId, assetId, date, amount, units, ... }]

// Positions: Aggregated view
positions: [{ portfolioId, assetId, totalUnits, totalCost, averageCost, transactions[] }]
```

**Proposed Approach**:
- **Option A**: Update positions immediately after transaction (write penalty, fast reads)
- **Option B**: Calculate positions on-demand from transactions (slow first load, no sync issues)
- **Option C**: Hybrid - cache positions, rebuild on data load

**✅ DECISION RESOLVED**:

**Approach**: Option B - Calculate positions on-demand from transactions (with caching).

**Implementation Strategy**:
```javascript
// No separate positions table in storage
// Calculate dynamically when needed
function calculatePositions(portfolioId) {
  const transactions = getTransactions(portfolioId);
  const positions = {};
  
  transactions.forEach(tx => {
    if (!positions[tx.assetId]) {
      positions[tx.assetId] = {
        totalUnits: 0,
        totalCost: 0,
        transactions: []
      };
    }
    
    if (tx.type === 'BUY') {
      positions[tx.assetId].totalUnits += tx.units;
      positions[tx.assetId].totalCost += tx.amount;
    }
    // Handle SELL, SPLIT, etc.
    
    positions[tx.assetId].transactions.push(tx.id);
  });
  
  // Calculate average cost
  Object.keys(positions).forEach(assetId => {
    positions[assetId].averageCost = 
      positions[assetId].totalCost / positions[assetId].totalUnits;
  });
  
  return positions;
}

// Cache in memory for session
let positionsCache = {};
```

**Reconciliation**: Source of truth is transactions. Positions always calculated from transactions, ensuring perfect sync.

**Performance**: Calculate once per page load, cache in memory. Recalculate only when transactions change.

**Rationale**: Eliminates sync issues between transactions and positions. Simpler data model. Storage-efficient.

---

### 1.3 Multi-Portfolio Management 🟡 IMPORTANT

**Issue**: Requirements support multiple portfolios but unclear on cross-portfolio analytics and consolidated views.

**Technical Questions**:
- Show aggregate portfolio value across all portfolios?
- Consolidated asset allocation view (all portfolios combined)?
- Can same asset exist in multiple portfolios? (Yes, but how to aggregate?)
- Performance dashboard: single portfolio or all portfolios?

**User Experience Questions**:
- Portfolio selector in navigation?
- "All Portfolios" consolidated view?
- How to compare portfolio performance side-by-side?

**Business Implications**:
- User may have "Retirement" + "Short-term" + "Kids Education" portfolios
- Need consolidated view for total net worth
- But also need isolated view for goal-specific portfolios

**✅ DECISION RESOLVED**:

**Consolidated View**: YES - Phase 1 includes consolidated dashboard.

**Implementation**:
```javascript
// Dashboard shows:
1. Total Net Worth (all portfolios in THB)
2. Portfolio selector dropdown
3. Selected portfolio detailed view
4. "All Portfolios" option for consolidated metrics

// Consolidated view displays:
- Total value across all portfolios (converted to THB)
- Combined allocation by asset class (aggregated)
- Total gain/loss (all portfolios)
- Risk distribution (weighted average)

// Individual portfolio view shows:
- Portfolio-specific allocation
- Asset breakdown
- Rebalancing warnings
- Performance metrics
```

**Navigation**:
```
Header:
[Portfolio Selector: All Portfolios ▼]
Options: All Portfolios, Retirement Fund, Short-term Goals, etc.

Dashboard adapts based on selection
```

**Cross-Portfolio Asset Handling**:
- Same asset in multiple portfolios: Show separately in each
- Consolidated view: Aggregate same assets across portfolios
- Example: VOO in Portfolio A (2 shares) + Portfolio B (3 shares) = 5 shares total in consolidated

**Rationale**: Users need both consolidated net worth view AND individual portfolio goal tracking.

---

### 1.4 Data Backup and Recovery 🔴 CRITICAL

**Issue**: Local Storage data can be lost (browser cache clear, computer replacement). Requirements mention "backup" but no implementation details.

**Technical Questions**:
- Auto-export to file periodically?
- Cloud sync capability (future)?
- Import/restore functionality?
- Data migration between browsers/devices?

**Risk**: Users lose all investment data if browser storage cleared.

**Proposed Solutions**:
```javascript
// Option A: Manual backup reminders
- Show reminder: "Last backup: 30 days ago"
- One-click export all data to JSON

// Option B: Auto-backup to browser downloads
- Weekly auto-export to Downloads folder
- Keep last 4 backups

// Option C: Browser sync storage (limited to 100KB)
- Not feasible for full dataset
```

**Business Alignment**: development_topic.md mentions "backup data regularly" but no technical strategy.

**✅ DECISION RESOLVED**:

**Approach**: Option A - Manual backup with reminders (Phase 1).

**Implementation**:
```javascript
// Backup reminder system
const BACKUP_REMINDER_DAYS = 30;

// Check on app load
function checkBackupReminder() {
  const lastBackup = localStorage.getItem('lastBackupDate');
  const daysSinceBackup = calculateDaysSince(lastBackup);
  
  if (daysSinceBackup > BACKUP_REMINDER_DAYS) {
    showNotification({
      type: 'warning',
      message: `Last backup: ${daysSinceBackup} days ago`,
      actions: ['Backup Now', 'Remind Later']
    });
  }
}

// One-click backup
function backupAllData() {
  const allData = {
    portfolios: loadFromStorage('portfolios'),
    accounts: loadFromStorage('accounts'),
    investments: loadFromStorage('investments'),
    deposits: loadFromStorage('deposits'),
    prices: loadFromStorage('assetPrices'),
    settings: loadFromStorage('userSettings'),
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const filename = `portfolio_backup_${formatDate(new Date())}.json`;
  downloadJSON(allData, filename);
  
  localStorage.setItem('lastBackupDate', new Date().toISOString());
}

// Restore from backup
function restoreFromBackup(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target.result);
    
    // Validate data structure
    if (validateBackupData(data)) {
      // Restore to localStorage
      Object.keys(data).forEach(key => {
        if (key !== 'exportDate' && key !== 'version') {
          saveToStorage(key, data[key]);
        }
      });
      
      showNotification('Data restored successfully!');
      location.reload();
    }
  };
  reader.readAsText(file);
}
```

**UI Elements**:
- Settings page: "Backup & Restore" section
- Dashboard: Backup reminder badge (if overdue)
- "Export All Data" button (JSON format)
- "Import Data" file picker
- Last backup date display

**Future Enhancement (Phase 4)**:
- Auto-backup to Downloads folder (requires user permission)
- Cloud sync via Google Drive/Dropbox API
- Backup scheduling (weekly/monthly)

**Rationale**: Manual backup is simple, no external dependencies, full user control. Reminder system ensures users don't forget.

---

## Section 2: API Integration & External Data

### 2.1 Mutual Fund Data Source 🔴 CRITICAL

**Issue**: Requirements specify supporting mutual funds (e.g., SCBSEMI(E)) but NO specific API mentioned for Thai mutual funds.

**Technical Gap**:
- Yahoo Finance: Doesn't cover Thai mutual funds
- Alpha Vantage: US-focused
- CoinGecko: Crypto only
- **Missing**: Thai mutual fund data source

**Thai Mutual Fund Specifics**:
- Fund codes format: SCBSEMI(E), K-CHINA-A, etc.
- Data needed: NAV (Net Asset Value), returns, fund details
- Potential sources:
  - Morningstar (paid API)
  - Fund company websites (web scraping - unreliable)
  - Manual entry only

**Critical Question**: Without API, how do we fetch mutual fund prices and returns?

**Proposed Solutions**:
1. **Manual entry only** (Phase 1) - Users enter NAV manually
2. **Web scraping** - Brittle, may break
3. **Paid API** - Morningstar or Bloomberg (expensive)
4. **Hybrid** - Auto-fetch for some funds, manual for others

**Business Impact**: Many Thai investors hold mutual funds. Manual-only entry is major limitation.

**Decision Needed**: ✋ Mutual fund data strategy?

---

### 2.2 API Rate Limiting & Caching 🟡 IMPORTANT

**Issue**: Requirements mention "cache API responses" but no specifics on cache duration, invalidation, or rate limit handling.

**Technical Questions**:
- Cache duration: 1 hour? 24 hours? User-configurable?
- Price data vs return rate data (different cache TTL)?
- Handle rate limits: Queue requests? Show error? Exponential backoff?
- Clear cache mechanism for users?

**API Limits** (known):
- Yahoo Finance: ~2000 requests/hour
- CoinGecko Free: 50 calls/minute
- Alpha Vantage Free: 5 calls/minute, 500/day

**Multiple Users Scenario**: If 100 users refresh prices simultaneously, we hit rate limits.

**Proposed Caching Strategy**:
```javascript
const CACHE_TTL = {
  prices: 15 * 60 * 1000,      // 15 minutes (market data)
  historicalReturns: 24 * 60 * 60 * 1000,  // 24 hours (stable)
  exchangeRates: 60 * 60 * 1000  // 1 hour (forex)
};

// Cache structure
{
  key: 'price_VOO',
  data: { price: 450.25, currency: 'USD' },
  timestamp: 1709065200000,
  source: 'Yahoo Finance'
}
```

**Rate Limit Handling**:
```javascript
// Exponential backoff
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (error.status === 429) { // Rate limited
        await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Decision Needed**: ✋ Approve caching strategy? Adjust TTLs?

---

### 2.3 Exchange Rate Data Freshness 🟡 IMPORTANT

**Issue**: THB/USD conversion critical for reporting, but requirements don't specify update frequency or fallback strategy.

**Technical Questions**:
- Fetch rate on every transaction entry? (overkill)
- Fetch once per session? (may be stale)
- Store historical rates for transaction replay?
- Fallback rate if API fails?

**Use Cases**:
1. **Transaction time**: Need rate at transaction date (historical)
2. **Reporting time**: Need current rate for present value
3. **Goal planning**: Need rate assumptions for projections

**Proposed Solution**:
```javascript
// Store historical rates
conversionRates: [{
  date: '2026-02-28',
  fromCurrency: 'USD',
  toCurrency: 'THB',
  rate: 35.5,
  source: 'exchangerate-api.com'
}]

// Update strategy
- Fetch current rate on app load (cache 1 hour)
- Store rate snapshot with each transaction
- Allow manual rate entry for historical transactions
- Fallback: Use last known rate if API fails
```

**Business Alignment**: development_topic.md discusses currency risk but not rate freshness.

**Decision Needed**: ✋ Approve exchange rate update strategy?

---

### 2.4 API Failure Recovery 🔴 CRITICAL

**Issue**: Requirements say "provide fallback for API failures" but user experience during failures is undefined.

**Technical Questions**:
- Show last cached data with "stale" warning?
- Disable features that require fresh data?
- Retry mechanism: automatic or user-initiated?
- Error messaging strategy?

**Failure Scenarios**:
1. **API down**: Use cached data, show warning
2. **Rate limited**: Queue request, show "updating..." status
3. **Network offline**: Graceful degradation, offline mode
4. **Invalid response**: Log error, use manual entry

**User Experience During Failures**:
```javascript
// Scenario: Can't fetch VOO price
Option A: Show last price with warning
  "Price as of 2 hours ago (unable to refresh)"
  
Option B: Show error, require manual entry
  "Unable to fetch current price. Enter manually?"
  
Option C: Estimate based on trend
  "Estimated price (market closed): $450.25"
```

**Proposed Approach**:
- Use cached data with timestamp warning
- Provide manual override option
- Log failures for debugging
- Graceful degradation (app still works)

**Decision Needed**: ✋ Which failure handling approach?

---

## Section 3: User Experience & Workflow

### 3.1 First-Time User Onboarding 🟡 IMPORTANT

**Issue**: Requirements focus on feature functionality but no onboarding flow for new users.

**Questions**:
- Setup wizard for first portfolio?
- Sample portfolio with demo data?
- Tutorial/tooltips for key features?
- Required fields: user name, base currency, risk profile?

**New User Journey**:
```
1. Landing → What is this app?
2. Create first portfolio → Guide through asset selection
3. Set risk profile → Explain Conservative/Moderate/Aggressive
4. Add account → Explain THB/USD accounts
5. First transaction → Show how to record investment
6. View dashboard → Highlight key metrics
```

**Business Alignment**: development_topic.md doesn't cover onboarding, assumes user knows what to do.

**Decision Needed**: ✋ Include onboarding wizard in Phase 1, or defer to Phase 6?

---

### 3.2 User Preferences & Settings 🟡 IMPORTANT

**Issue**: Requirements don't specify user-level settings storage.

**Settings Needed**:
- Base currency preference (THB or USD)
- Risk profile (Conservative/Moderate/Aggressive)
- Default portfolio view
- Number format preferences (1,000.00 vs 1.000,00)
- Language (future: Thai/English)
- Theme (future: light/dark mode)
- Notification preferences

**Storage Schema**:
```javascript
{
  userSettings: {
    baseCurrency: 'THB',
    riskProfile: 'moderate',
    defaultPortfolio: 'portfolio_001',
    numberFormat: 'en-US',
    decimalPlaces: 2,
    dateFormat: 'YYYY-MM-DD',
    theme: 'light'
  }
}
```

**Decision Needed**: ✋ Which settings for Phase 1?

---

### 3.3 Mobile Responsiveness Priority 🟡 IMPORTANT

**Issue**: Requirements say "mobile-first" but don't specify which features are mobile-optimized vs desktop-only.

**Complex Features on Mobile**:
- Monte Carlo simulation (data-heavy charts)
- Excel export (mobile file handling)
- Multi-column tables (horizontal scrolling?)
- Interactive calculators (small screen input)

**Approach Options**:
- **Option A**: All features fully responsive (more dev time)
- **Option B**: Core features mobile, advanced features desktop-recommended
- **Option C**: Simplified mobile UI, full desktop UI

**Proposed Mobile Priority**:
```
Mobile-First (Phase 1):
✅ Dashboard view
✅ Portfolio list
✅ Transaction entry
✅ Price updates
✅ Account balances

Desktop-Recommended (Phase 5):
📊 Monte Carlo simulation
📊 Complex charts
📊 Multi-portfolio comparison
📊 Excel export
```

**Decision Needed**: ✋ Mobile feature priority?

---

## Section 4: Business Logic Clarifications

### 4.1 Portfolio Rebalancing Execution 🟡 IMPORTANT

**Issue**: development_topic.md discusses rebalancing suggestions, but requirements don't specify if system executes trades or just suggests.

**Clarification Needed**:
- Is this a **suggestion tool** only? (most likely)
- Or does it generate **executable orders**? (out of scope?)
- Integration with brokers? (future feature?)

**Current Assumption**: Suggestion only, user manually executes via broker.

**UI Implication**:
```
Rebalancing Suggestions:
❌ "Click to Execute" button (not in scope)
✅ "Copy trade list" for manual execution
✅ "Export to Excel" for broker upload
```

**Decision Needed**: ✋ Confirm: suggestions only, no execution?

---

### 4.2 FIFO Cost Basis Tracking & Multi-Portfolio Reporting ✅ RESOLVED

**Issue**: How to accurately track THB cost basis for USD assets when exchange rates vary over time. Also, how to handle single vs multi-portfolio reporting.

**✅ DECISION RESOLVED**: 

**Approach**: FIFO (First-In-First-Out) lot tracking for FCD deposits with dual reporting modes.

**Key Implementation Requirements**:

**1. FIFO Lot Tracking:**
```javascript
// Track each FCD deposit as separate lot
{
  fcdAccount: {
    lots: [
      {
        lotId: "lot_001",
        depositDate: "2026-01-15",
        depositAmountUSD: 20000,
        conversionRate: 31.50,
        remainingAmountUSD: 10000,
        withdrawals: [/* withdrawal history */]
      }
    ]
  }
}

// Withdrawal rules:
- Use oldest lot first (FIFO)
- If same date: smallest lot first
- Track which lots funded each asset purchase
- Remove depleted lots (balance = 0)
```

**2. Asset Cost Basis:**
```javascript
{
  asset: {
    costBasisLots: [
      {
        lotId: "lot_001",
        amountUSD: 10000,
        conversionRate: 31.50,
        costBasisTHB: 315000
      }
    ],
    totalCostTHB: 315000,
    reportingConversionRate: 31.50  // Weighted average
  }
}
```

**3. Dual-Value Reporting:**
- **Cost Basis** (Historical FIFO rates): For tax basis, performance tracking
- **Current Value** (As-of-date rate): For net worth, allocation %
- Show both columns side-by-side in reports

**4. Gains Breakdown:**
```
Total Gain = Asset Gain + FX Gain
- Asset Gain (USD): Price appreciation in original currency
- FX Gain (THB): Currency movement impact
- Separate for tax and analysis purposes
```

**5. Two Report Types:**

**Single Portfolio Report:**
- Full allocation analysis (Plan % vs Actual %)
- Rebalancing warnings (yellow: >10%, red: >15%)
- Specific rebalancing suggestions
- FIFO lot detail transparency

**Multi-Portfolio Consolidated Report:**
- Aggregate all selected portfolios
- % of total cost basis per asset
- % of total current value per asset
- Group by asset type summary
- **NO allocation warnings** (different strategies)
- **NO rebalancing suggestions** (ambiguous which portfolio to rebalance)

**6. Report Selection Logic:**
```javascript
function generateReport(selectedPortfolioIds, reportDate) {
  if (selectedPortfolioIds.length === 1) {
    return generateSinglePortfolioReport(selectedPortfolioIds[0], reportDate);
  } else if (selectedPortfolioIds.length > 1) {
    return generateConsolidatedReport(selectedPortfolioIds, reportDate);
  }
}
```

**Implementation Priority**: Phase 2 (after core portfolio and account features)

**Reference**: See requirement.md Feature 9 and development_topic.md Topic 11 for detailed specifications.

---

### 4.3 Tax Reporting Requirements 🟡 IMPORTANT

**Issue**: development_topic.md mentions "tax implications" warnings but requirements don't specify tax reporting features beyond FIFO cost basis.

**Questions**:
- Generate tax reports (IRS Form 8949 equivalent)?
- Support multiple tax jurisdictions (Thailand, US)?
- Tax rate calculations?

**Current Scope** (from requirements):
- ✅ Track cost basis per transaction (FIFO)
- ✅ Calculate unrealized gains
- ✅ Separate asset gain vs FX gain
- ✅ Cost basis transparency with lot details
- ❌ Tax form generation (not specified)
- ❌ Tax rate calculations (not specified)

**Proposed Phase 1 Approach**:
- Track cost basis with FIFO (foundation for tax)
- Show realized vs unrealized gains (for user awareness)
- Display gain breakdown (asset vs FX)
- General tax warning messages
- 🔮 Future: Full tax reporting module

**Decision Needed**: ✋ Confirm tax form generation out of scope for Phase 1?

---

### 4.3 Corporate Actions Handling 🟡 IMPORTANT

**Issue**: Requirements mention "corporate actions history" but no implementation details.

**Corporate Actions**:
- Stock splits (2-for-1, 3-for-2)
- Reverse splits
- Dividends (cash, stock)
- Mergers & acquisitions
- Spinoffs
- Rights issues

**Technical Challenges**:
- Adjust position quantities retroactively
- Adjust cost basis correctly
- Maintain audit trail
- Update price history for splits

**Phase 1 Scope Question**:
- Support splits/dividends? Or manual adjustment only?
- Auto-detect from API? Or user-entered?

**Proposed Approach**:
```javascript
// Phase 1: Manual entry with validation
{
  corporateActions: [{
    id: 'ca_001',
    assetId: 'asset_001',
    actionType: 'STOCK_SPLIT',
    actionDate: '2026-03-15',
    ratio: '2:1', // 2 new shares for 1 old share
    affectedTransactions: ['inv_001', 'inv_002']
  }]
}
```

**Decision Needed**: ✋ Phase 1 corporate actions scope?

---

## Section 5: Technical Architecture

### 5.1 State Management Strategy 🔴 CRITICAL

**Issue**: Requirements specify Vanilla JS but complex state management needs are apparent.

**State Complexity**:
- Multiple portfolios with real-time updates
- Cross-component data dependencies
- Undo/redo for transactions?
- Optimistic UI updates?

**Architecture Options**:

**Option A: Global State Object**
```javascript
const AppState = {
  portfolios: [],
  accounts: [],
  investments: [],
  prices: {},
  settings: {}
};

// Event-based updates
window.addEventListener('state:update', renderUI);
```

**Option B: Module Pattern**
```javascript
const PortfolioModule = (() => {
  let portfolios = loadFromStorage('portfolios');
  
  return {
    getAll: () => portfolios,
    add: (portfolio) => { /* ... */ },
    update: (id, data) => { /* ... */ }
  };
})();
```

**Option C: Lightweight Framework** (Redux-like)
```javascript
// Define actions
const actions = {
  ADD_PORTFOLIO: 'ADD_PORTFOLIO',
  UPDATE_PRICES: 'UPDATE_PRICES'
};

// Reducer pattern
function portfolioReducer(state, action) {
  switch(action.type) {
    case actions.ADD_PORTFOLIO:
      return [...state, action.payload];
  }
}
```

**Recommendation**: Option B (Module Pattern) for Phase 1 - balance simplicity with structure.

**Decision Needed**: ✋ Approve state management approach?

---

### 5.2 Code Organization & File Structure 🟡 IMPORTANT

**Issue**: Requirements don't specify file/folder structure for the codebase.

**Proposed Structure**:
```
program/
├── index.html
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── app.js (main entry point)
│   │   ├── modules/
│   │   │   ├── portfolio.js
│   │   │   ├── accounts.js
│   │   │   ├── transactions.js
│   │   │   ├── prices.js
│   │   │   └── calculations.js
│   │   ├── utils/
│   │   │   ├── storage.js
│   │   │   ├── api.js
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   ├── ui/
│   │   │   ├── dashboard.js
│   │   │   ├── portfolio-view.js
│   │   │   ├── charts.js
│   │   │   └── forms.js
│   │   └── constants.js
│   └── lib/
│       ├── chart.min.js
│       └── xlsx.min.js
├── requirement.md
├── development_topic.md
└── ready_dev.md (this file)
```

**Decision Needed**: ✋ Approve folder structure?

---

## Summary: Critical Path to Development

### Must Resolve Before Phase 1 🔴
1. **Mutual Fund API Strategy** - Without this, can't fetch Thai mutual fund data
2. **Historical Price Retention** - Affects storage design from day 1
3. **Data Backup Strategy** - Risk of data loss without this
4. **API Failure Recovery** - Core user experience issue
5. **State Management Approach** - Foundation for entire architecture

### Should Resolve Before Phase 2 🟡
6. Multi-portfolio consolidated view requirements
7. API caching strategy approval
8. Exchange rate update frequency
9. User preferences/settings scope
10. Mobile responsiveness priorities
11. Portfolio rebalancing scope confirmation
12. Corporate actions Phase 1 scope

### Nice to Have (Can Defer) ⚪
- First-time user onboarding wizard
- Tax reporting features
- Advanced mobile features

---

## Recommended Actions

### Immediate (Before Development)
1. **Create API integration specification** for mutual funds
2. **Define data retention policies** for prices and history
3. **Approve state management architecture**
4. **Clarify backup/recovery strategy**
5. **Document API failure handling UX**

### Short-term (Before Phase 2)
6. Finalize user settings schema
7. Prioritize mobile features
8. Scope corporate actions handling
9. Approve caching strategies

### Long-term (Phase 3+)
10. Tax reporting requirements
11. Advanced onboarding flow
12. Broker integration roadmap

---

## Next Steps

**Option A**: Address all inquiries in a meeting/discussion, then update this document with decisions

**Option B**: Create separate decision documents for each major topic (5 documents for the 5 critical items)

**Option C**: Provide answers inline in this document, then I'll update requirement.md with clarifications

**Your Decision Needed**: ✋ How would you like to proceed?

---

**Document Status**: 🟡 Awaiting Decisions  
**Blocking Issues**: 5 critical, 7 important  
**Ready to Develop**: No - requires clarifications  
**Last Updated**: February 28, 2026

---

*This document should be reviewed and updated with decisions before development begins. All items marked 🔴 CRITICAL must be resolved.*