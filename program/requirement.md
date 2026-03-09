# Investment Portfolio Management System - Technical Requirements Specification

## Document Information
- **Project Name**: Investment Portfolio Management System
- **Version**: 1.0
- **Last Updated**: February 28, 2026
- **Document Type**: Technical Requirements Specification

---

## 1. System Overview

### 1.1 Purpose
A web-based investment portfolio management application that enables investors to track investments, manage portfolios, analyze performance, and plan investment goals across multiple asset classes with support for both THB and USD currencies.

### 1.2 Scope
The system provides comprehensive portfolio management including:
- Portfolio creation and asset allocation
- Investment account management with tiered interest rates
- Transaction tracking and reporting
- DCA (Dollar Cost Average) and lump sum investment planning
- Investment goal planning with compound return projections
- Monte Carlo simulation for risk analysis
- Real-time asset price tracking
- Multi-currency support (THB/USD)
- Excel export functionality
- Performance tracking and portfolio rebalancing suggestions

### 1.3 Technology Stack

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla JS)
- UI Design: Modern, Apple.com-inspired theme
- Responsive, mobile-first design
- Chart.js for visualizations
- SheetJS (xlsx.js) for Excel export

**Authentication:**
- Local password protection (browser-based)
- CryptoJS for password hashing (SHA-256)
- Session management via sessionStorage
- Auto-lock after 15 minutes inactivity
- No backend server required

**Data Storage:**
- File System Access API + Cloud Storage Sync (Google Drive/OneDrive)
- JSON files in cloud folder
- Encrypted master password in localStorage
- Optional multi-profile support
- Offline-first with cloud sync

**External APIs:**
- Yahoo Finance API (stocks) - No API key required
- CoinGecko API (cryptocurrency) - No API key required
- Exchange rate APIs - Free tier, no key required
- Tesseract.js for OCR (PDF/image import) - Client-side, no key

**Installation Requirements:**
- ✅ Modern web browser (Chrome 86+, Edge 86+)
- ✅ Cloud storage app (Google Drive Desktop, OneDrive)
- ❌ NO backend server needed
- ❌ NO database installation needed (PostgreSQL/MongoDB not required)
- ❌ NO Node.js/Python required

**All libraries loaded via CDN - no installation needed!**

---

## 2. Core Features

### Feature 1: Create Portfolio

#### 2.1.1 Overview
Allow investors to create named portfolios with custom asset allocation strategies.

#### 2.1.2 Functional Requirements
- **FR-1.1**: Create portfolio with unique name
- **FR-1.2**: Select multiple assets to include in portfolio
- **FR-1.3**: Set allocation percentage for each asset
- **FR-1.4**: Validate total allocation equals 100%
- **FR-1.5**: Support various asset types:
  - Stocks (ticker symbols, e.g., VOO, AAPL)
  - Mutual Funds (fund codes, e.g., SCBSEMI(E))
  - Cryptocurrencies (e.g., Bitcoin, BTC)
  - Bonds
  - ETFs
  - Real Estate/REITs
  - Cash/Money Market

#### 2.1.3 Asset Configuration
Each asset must include:
- Asset name/identifier (ticker, fund code, crypto symbol)
- Asset type (stock, mutual_fund, crypto, bond, etc.)
- Asset sub-type (for mutual funds: rmf, ltf, regular; for stocks: individual_stock, etf, index_fund)
- Allocation percentage
- Risk level (Low, Medium, High)
- Currency (THB or USD)
- Expected return rate (auto-fetched or manual entry)
- Platform/broker information (e.g., "Dime!", "SCB Securities", "KBank")
- Optional account number

#### 2.1.4 Return Rate Fetching
- **FR-1.6**: Fetch historical return rates from internet APIs based on asset identifier
- **FR-1.7**: Calculate annualized return rate (CAGR) from historical data
- **FR-1.8**: Support multiple timeframes (1-year, 3-year, 5-year)
- **FR-1.9**: Display calculated return rate with data source and date
- **FR-1.10**: Allow manual override of return rate
- **FR-1.11**: Store single expected return value (midpoint of expected range)
- **FR-1.12**: For assets with ranges (e.g., 10.5%-11%), store midpoint (10.75%)

**API Integration Examples:**
```javascript
// Fetch stock return rate
async function fetchStockReturnRate(ticker) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
  const data = await response.json();
  // Calculate CAGR from historical prices
  return calculateCAGR(data);
}

// Fetch crypto return rate  
async function fetchCryptoReturnRate(symbol) {
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?days=1825`);
  const data = await response.json();
  return calculateCAGR(data.prices);
}
```

#### 2.1.5 RMF (Retirement Mutual Fund) Support
- **FR-1.13**: Support RMF asset sub-type for Thai retirement mutual funds
- **FR-1.14**: Flag RMF assets for special tax reporting features
- **FR-1.15**: Track annual RMF contribution totals for tax deduction calculations
- **FR-1.16**: Monitor RMF contribution limits per year
- **FR-1.17**: Calculate lock-in period (until age 55 or special conditions)
- **FR-1.18**: Display RMF-specific warnings for early withdrawal penalties

#### 2.1.6 Asset Substitution Tracking
- **FR-1.19**: Detect when user purchases asset not matching target allocation plan
- **FR-1.20**: Display warning when ticker mismatch detected (e.g., plan=VTI, purchase=SPYM)
- **FR-1.21**: Allow user to update plan to reflect actual purchase
- **FR-1.22**: Track original plan vs actual purchase with optional user notes
- **FR-1.23**: Include substitutions in rebalancing recommendations
- **FR-1.24**: User choice with informed consent (proceed after warning)

#### 2.1.7 Risk Balance Validation
- **FR-1.25**: Display risk distribution (Low/Medium/High percentages)
- **FR-1.26**: Warn if portfolio is heavily skewed to one risk level
- **FR-1.27**: Suggest balanced ratio based on investor profile

#### 2.1.8 Data Storage (Local Storage)
```javascript
{
  "portfolios": [
    {
      "id": "portfolio_001",
      "name": "Retirement Fund",
      "createdDate": "2026-02-28",
      "assets": [
        {
          "id": "asset_001",
          "name": "VOO",
          "type": "stock",
          "subType": "etf",
          "ticker": "VOO",
          "allocation": 60,
          "riskLevel": "high",
          "currency": "USD",
          "expectedReturn": 8.5,
          "returnSource": "Yahoo Finance",
          "returnDate": "2026-02-28",
          "returnTimeframe": "5-year",
          "platform": "Dime!",
          "accountNumber": "optional"
        },
        {
          "id": "asset_002",
          "name": "SCBRMWORLD(A)",
          "type": "mutual_fund",
          "subType": "rmf",
          "fundCode": "SCBRMWORLD(A)",
          "allocation": 40,
          "riskLevel": "medium",
          "currency": "THB",
          "expectedReturn": 10.65,
          "platform": "SCB Securities",
          "rmfDetails": {
            "taxBenefitEligible": true,
            "lockInUntilAge": 55,
            "annualContributionLimit": 500000
          }
        }
      ],
      "totalAllocation": 100,
      "weightedReturn": 8.23
    }
  ]
}
```

---

### Feature 2: Portfolio Analysis & Rebalancing Warnings

#### 2.2.1 Overview
Analyze portfolio composition, track allocation drift from targets, and provide color-coded warnings with specific rebalancing suggestions to maintain optimal allocation.

#### 2.2.2 Functional Requirements
- **FR-2.1**: Calculate current portfolio allocation based on asset values
- **FR-2.2**: Compare current allocation vs target allocation
- **FR-2.3**: Identify assets that deviate from target allocation
- **FR-2.4**: Calculate allocation drift percentage for each asset
- **FR-2.5**: Provide two-tier warning system:
  - Yellow Warning: >10% deviation from target
  - Red Warning: >15% deviation from target
- **FR-2.6**: Highlight assets requiring rebalancing with visual indicators
- **FR-2.7**: Suggest specific actions to return to target allocation
- **FR-2.8**: Detect over-allocation conditions (asset exceeds target by >50%)
- **FR-2.9**: Display severity levels for rebalancing alerts:
  - 🟢 Normal: Within ±10% of target
  - 🟡 Caution: 10-50% deviation
  - 🔴 Critical: >50% deviation (requires immediate action)
- **FR-2.10**: Track asset substitutions in portfolio (planned vs actual purchases)
- **FR-2.11**: Include substitution tracking in rebalancing recommendations
- **FR-2.12**: Analyze risk distribution (Low/Medium/High)
- **FR-2.13**: Evaluate if portfolio risk profile matches investor goals
- **FR-2.14**: Calculate portfolio-wide metrics:
  - Weighted average return rate
  - Total portfolio value (in THB)
  - Unrealized gain/loss
  - Allocation deviation summary

#### 2.2.3 Allocation Calculation

**Current Allocation Formula:**
```javascript
function calculateCurrentAllocation(portfolio) {
  // Calculate total portfolio value in THB
  const totalValue = calculateTotalPortfolioValue(portfolio);
  
  const allocations = portfolio.assets.map(asset => {
    const currentValue = getAssetValue(asset.id); // In THB equivalent
    const currentAllocation = (currentValue / totalValue) * 100;
    const targetAllocation = asset.allocation;
    const deviation = currentAllocation - targetAllocation;
    const deviationPercent = Math.abs(deviation);
    
    return {
      assetId: asset.id,
      assetName: asset.name,
      currentValue: currentValue,
      currentAllocation: currentAllocation.toFixed(2),
      targetAllocation: targetAllocation,
      deviation: deviation.toFixed(2),
      deviationPercent: deviationPercent.toFixed(2),
      warningLevel: getWarningLevel(deviationPercent)
    };
  });
  
  return {
    totalValue: totalValue,
    allocations: allocations,
    hasWarnings: allocations.some(a => a.warningLevel !== 'none')
  };
}

function getWarningLevel(deviationPercent) {
  if (deviationPercent >= 15) return 'red';
  if (deviationPercent >= 10) return 'yellow';
  return 'none';
}
```

#### 2.2.4 Portfolio Value Calculation (Multi-Currency)

```javascript
function calculateTotalPortfolioValue(portfolio) {
  let totalValueTHB = 0;
  
  portfolio.assets.forEach(asset => {
    const assetValue = getAssetCurrentValue(asset.id);
    const assetCurrency = asset.currency;
    
    if (assetCurrency === 'THB') {
      totalValueTHB += assetValue;
    } else if (assetCurrency === 'USD') {
      const currentRate = getCurrentExchangeRate('USD', 'THB');
      totalValueTHB += assetValue * currentRate;
    }
  });
  
  return totalValueTHB;
}
```

#### 2.2.5 Rebalancing Suggestions

```javascript
function generateRebalancingSuggestions(portfolio, allocations, totalValue) {
  const suggestions = [];
  
  allocations.forEach(allocation => {
    if (allocation.warningLevel === 'none') return;
    
    const asset = portfolio.assets.find(a => a.id === allocation.assetId);
    const targetValue = totalValue * (asset.allocation / 100);
    const currentValue = allocation.currentValue;
    const difference = targetValue - currentValue;
    
    const suggestion = {
      assetName: asset.name,
      assetType: asset.type,
      warningLevel: allocation.warningLevel,
      currentAllocation: allocation.currentAllocation + '%',
      targetAllocation: allocation.targetAllocation + '%',
      deviation: allocation.deviation + '%',
      action: difference > 0 ? 'INCREASE' : 'DECREASE',
      amount: Math.abs(difference),
      currency: asset.currency,
      specificAction: generateSpecificAction(asset, difference)
    };
    
    suggestions.push(suggestion);
  });
  
  return suggestions;
}

function generateSpecificAction(asset, difference) {
  if (asset.type === 'thb_savings' || asset.type === 'fcd_account') {
    // For saving accounts, suggest deposits or transfers
    if (difference > 0) {
      return `Deposit ${Math.abs(difference).toFixed(2)} ${asset.currency} into ${asset.name}`;
    } else {
      return `Transfer ${Math.abs(difference).toFixed(2)} ${asset.currency} from ${asset.name} to purchase other assets`;
    }
  } else {
    // For investment assets, suggest buy/sell
    if (difference > 0) {
      const sourceAccount = asset.currency === 'THB' ? 'THB Saving Account' : 'FCD Saving Account';
      return `Buy ${Math.abs(difference).toFixed(2)} ${asset.currency} of ${asset.name} from ${sourceAccount}`;
    } else {
      return `Reduce ${asset.name} position by ${Math.abs(difference).toFixed(2)} ${asset.currency}`;
    }
  }
}
```

#### 2.2.6 Warning Display Examples

**Yellow Warning (10-15% deviation):**
```
⚠️ Portfolio Rebalancing Recommended

THB Saving Account
Current: 45% | Target: 30% | Deviation: +15%
Action: Transfer 150,000 THB to purchase other assets

VOO Stock  
Current: 18% | Target: 30% | Deviation: -12%
Action: Buy 120,000 THB worth of VOO from FCD Saving Account
```

**Red Warning (>15% deviation):**
```
🔴 Portfolio Significantly Out of Balance

THB Saving Account
Current: 50% | Target: 30% | Deviation: +20%
⚠️ URGENT: Transfer 200,000 THB immediately

Bitcoin
Current: 5% | Target: 20% | Deviation: -15%
⚠️ URGENT: Purchase 150,000 THB worth of Bitcoin
```

---

### Feature 3: Investment Plan (DCA & Lump Sum with Goal Planning)

#### 2.3.1 Overview
Help investors plan regular (DCA) or one-time (lump sum) investments with goal-based projections.

#### 2.3.2 Investment Methods

**A. Dollar Cost Average (DCA)**
- **FR-3.1**: Set monthly investment amount
- **FR-3.2**: Specify investment date each month (e.g., 1st, 15th)
- **FR-3.3**: Calculate distribution across assets based on portfolio allocation
- **FR-3.4**: Generate monthly investment schedule

**B. Lump Sum Investment**
- **FR-3.5**: Enter one-time investment amount
- **FR-3.6**: Calculate distribution across assets based on portfolio allocation
- **FR-3.7**: Show breakdown by asset and currency

#### 2.3.3 Investment Distribution Calculator
```javascript
function calculateInvestmentDistribution(amount, portfolio) {
  const distribution = [];
  
  portfolio.assets.forEach(asset => {
    const assetAmount = amount * (asset.allocation / 100);
    distribution.push({
      assetName: asset.name,
      assetId: asset.id,
      allocation: asset.allocation,
      investmentAmount: assetAmount,
      currency: asset.currency
    });
  });
  
  return distribution;
}
```

#### 2.3.4 Investment Goal Planning

**Prerequisites:**
- Portfolio must be created with assets and allocations set (100% total)
- Expected return rates must be available for all assets

**Goal Planning Features:**
- **FR-3.8**: Set investment timeline (number of years)
- **FR-3.9**: Calculate weighted portfolio return rate from asset allocations
- **FR-3.10**: Project portfolio value with compound returns over timeline
- **FR-3.11**: Display year-by-year projection table
- **FR-3.12**: Set target investment amount (optional)
- **FR-3.13**: Calculate required monthly DCA to reach target
- **FR-3.14**: Show if current DCA is sufficient or needs adjustment

#### 2.3.5 Compound Return Calculations

**Weighted Portfolio Return:**
```javascript
function calculateWeightedReturn(portfolio) {
  let weightedReturn = 0;
  portfolio.assets.forEach(asset => {
    weightedReturn += (asset.allocation / 100) * asset.expectedReturn;
  });
  return weightedReturn;
}
```

**Future Value with Regular Contributions:**
```javascript
function calculateFutureValue(monthlyDCA, annualReturn, years) {
  const monthlyRate = annualReturn / 12 / 100;
  const months = years * 12;
  
  const fv = monthlyDCA * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate);
  
  return fv;
}
```

**Required Monthly DCA for Target:**
```javascript
function calculateRequiredDCA(targetAmount, annualReturn, years) {
  const monthlyRate = annualReturn / 12 / 100;
  const months = years * 12;
  
  const pmt = targetAmount * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
  
  return pmt;
}
```

#### 2.3.6 Year-by-Year Projection Table

**FR-3.15**: Generate projection table with columns:
- Year number
- Annual investment amount (DCA × 12)
- Cumulative investment total
- Estimated portfolio value (with compound returns)
- Annual return/gain amount
- Year-end portfolio balance

---

### Feature 4: Deposit Account Process & Account Management

#### 2.4.1 Overview
Complete fund flow architecture from initial investor deposits through currency conversion to final asset purchases. The system supports a structured 3-step process that tracks money movement through different account types, each earning different interest rates and serving specific investment purposes.

#### 2.4.2 Three-Step Deposit Flow

**FR-4.1: Investor Deposit Process Architecture**

The system implements a structured flow from external funds through internal accounts to final investments:

**Step 1: Main Investment Account (Entry Point)**
- **Purpose**: Primary deposit point for all investor funds
- **Source**: External bank accounts, salary transfers, savings
- **Interest Rate**: Configurable base rate (typically 0.5% or platform-specific)
- **Account Type**: Holding/staging account
- **Functions**:
  - Receive deposits from external sources
  - Hold funds temporarily before allocation
  - Track total available capital for investment
  - Generate deposit records with date/amount/source
- **Business Rules**:
  - No minimum balance required
  - Funds can be allocated to portfolios on demand
  - Acts as buffer between external funds and portfolio investments
  - Optional interest earning (platform-dependent)

**Step 2: THB Investment Account (Portfolio Level)**
- **Purpose**: Portfolio-specific THB holdings earning savings interest
- **Source**: Withdrawals from Main Investment Account
- **Interest Rate**: Tiered savings rate (e.g., Dime: 3.0%/1.2%/0.5%)
- **Account Type**: Portfolio investment asset + funding source
- **Functions**:
  - Hold THB funds allocated to specific portfolio
  - Earn tiered savings interest on balance
  - Fund Thai mutual fund purchases (RMF, LTF, regular funds)
  - Fund Thai stock purchases
  - Source for THB→USD conversions (to FCD account)
  - Optional source for cryptocurrency purchases
- **Allocation**: Has target allocation % in portfolio (e.g., 30%)
- **Business Rules**:
  - Each portfolio has independent THB account(s)
  - Can have multiple THB accounts per portfolio (different banks/rates)
  - Part of portfolio asset allocation and performance tracking
  - Balance decreases when purchasing assets or converting to USD
  - Interest accrual tracked daily, paid bi-annually

**Step 3: FCD Account (Foreign Currency Deposit - USD Conversion)**
- **Purpose**: USD holdings for international investments earning higher USD interest
- **Source**: Currency conversion from THB Investment Account
- **Interest Rate**: Tiered USD rate (e.g., Dime: 4.5%/2.5%/0.5%)
- **Account Type**: Portfolio investment asset + funding source
- **Currency**: USD
- **Functions**:
  - Hold USD funds after THB→USD conversion
  - Earn tiered USD savings interest
  - Fund US stock purchases (individual stocks, ETFs)
  - Fund international investment purchases
  - Optional source for USD-priced cryptocurrency purchases
  - FIFO lot tracking begins at this point
- **Allocation**: Has target allocation % in portfolio (e.g., 20%)
- **FIFO Tracking**: Each deposit creates a "lot" with conversion rate recorded
- **Business Rules**:
  - Each portfolio has independent FCD account(s)
  - Can have multiple FCD accounts per portfolio
  - Part of portfolio asset allocation and performance tracking
  - Conversion rate locked per deposit (FIFO lot)
  - Balance decreases when purchasing USD assets
  - Interest accrual tracked daily, paid bi-annually

#### 2.4.3 Account Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                EXTERNAL BANK ACCOUNT                      │
│          (Salary, Savings, Other Sources)                 │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Deposit
                     ↓
┌──────────────────────────────────────────────────────────┐
│           MAIN INVESTMENT ACCOUNT                         │
│        (Entry Point - Base Interest ~0.5%)                │
│                                                            │
│  Functions:                                               │
│  • Receive all external deposits                          │
│  • Hold funds temporarily                                 │
│  • Allocate to portfolios on demand                       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Withdraw & Allocate to Portfolio
                     ↓
┌──────────────────────────────────────────────────────────┐
│         THB INVESTMENT ACCOUNT (Portfolio-Scoped)         │
│     (Tiered Interest: 3.0% / 1.2% / 0.5%)                │
│                                                            │
│  Functions:                                               │
│  • Portfolio-specific THB holdings                        │
│  • Earn THB savings interest                              │
│  • Part of portfolio allocation (e.g., 30%)               │
└─────────────┬────────────────────────┬───────────────────┘
              │                        │
              │                        │ Convert THB→USD
              │                        │ (Record FX rate)
              │                        ↓
              │            ┌────────────────────────────────┐
              │            │  FCD ACCOUNT (USD)             │
              │            │  (Tiered Interest:             │
              │            │   4.5% / 2.5% / 0.5%)         │
              │            │                                │
              │            │  Functions:                    │
              │            │  • USD holdings                │
              │            │  • FIFO lot tracking           │
              │            │  • Earn USD interest           │
              │            │  • Part of allocation (20%)    │
              │            └──────┬─────────────────────────┘
              │                   │
              │ Buy THB Assets    │ Buy USD Assets
              ↓                   ↓
┌──────────────────┐    ┌────────────────────────────────┐
│ Thai RMF Funds   │    │ US Stocks/ETFs                 │
│ Thai Mutual Funds│    │ International Assets           │
│ Thai Stocks      │    │ USD-based Crypto (optional)    │
│ THB Crypto (opt) │    │                                │
└──────────────────┘    └────────────────────────────────┘
```

#### 2.4.4 Detailed Account Specifications

**Main Investment Account:**

#### 2.4.3 Deposit Account Process Flow

**FR-4.32: Three-Step Deposit-to-Investment Process**

The system supports a structured flow from initial deposits through currency conversion to final asset purchases:

**Step 1: Main Investment Account Deposit**
- Investor deposits cash into main THB investment account
- Account earns base savings interest rate
- Serves as primary entry point for all funds

**Step 2: THB Portfolio Saving Account**
- Investor withdraws from main account
- Deposits to portfolio-specific THB saving account
- Earns THB saving interest rate (e.g., 1.5%-2.0% annually)
- Can purchase THB-denominated assets directly (mutual funds, Thai stocks)
- Serves as both investment asset AND funding source

**Step 3: FCD Account (Optional USD Conversion)**
- Investor converts THB to USD at current market FX rate
- Deposits USD to portfolio's FCD saving account
- Earns FCD interest rate (4.5%-5.2% annually)
- Can purchase USD-denominated assets (US stocks, ETFs)
- Serves as both investment asset AND funding source for USD purchases

**Key Principles:**
- Each step is optional based on investment needs
- THB and FCD accounts are portfolio assets with target allocations
- Interest rates stored per account type, updated periodically
- All conversions tracked with historical FX rates for cost basis

#### 2.4.4 Transaction Flow Examples

**Monthly Investment Workflow Example:**

**Step 1: Deposit into THB Saving Account**
```
Action: Investor deposits 100,000 THB
├── THB Saving Account balance: 0 → 100,000 THB
├── Portfolio allocation: 100% THB Saving
└── System Alert: 🔴 Red Warning - THB Saving exceeds target 30% by 70%
└── Suggestion: Purchase assets or transfer to FCD to rebalance
```

**Step 2: Transfer THB to FCD Saving Account**
```
Action: Transfer 30,000 THB to FCD Saving
├── Input: Amount = 30,000 THB
├── Input: Conversion Rate = 33.33 THB/USD
├── Converted: 30,000 ÷ 33.33 = $900 USD
├── THB Saving balance: 100,000 → 70,000 THB
├── FCD Saving balance: $0 → $900 USD
├── Portfolio allocation: THB 70%, FCD 30% (in THB equivalent)
└── System Alert: 🟡 Yellow Warning - Still need to purchase other assets
```

**Step 3: Buy USD Asset from FCD Saving Account**
```
Action: Purchase VOO stock
├── Source: FCD Saving Account
├── Amount: $900 USD (all available)
├── Units: 2 shares @ $450/share
├── THB Saving balance: 70,000 THB
├── FCD Saving balance: $900 → $0 USD
├── VOO Stock value: $900 USD (~30,000 THB equivalent)
├── Portfolio allocation: THB 70%, VOO 30%
└── System Alert: 🟡 Continue rebalancing to reach target allocation
```

**Step 4: Buy THB Asset from THB Saving Account**
```
Action: Purchase SCBSEMI mutual fund
├── Source: THB Saving Account
├── Amount: 10,000 THB
├── THB Saving balance: 70,000 → 60,000 THB
├── SCBSEMI value: 10,000 THB
├── Portfolio allocation: THB 60%, VOO 30%, SCBSEMI 10%
└── System Alert: Allocation approaching targets
```

**Step 5: Buy Cryptocurrency (User Chooses Source)**
```
Action: Purchase Bitcoin
├── User selects source: THB Saving Account (or could choose FCD if USD-priced)
├── Amount: 10,000 THB
├── THB Saving balance: 60,000 → 50,000 THB
├── Bitcoin value: 10,000 THB
├── Final allocation: THB 50%, VOO 30%, SCBSEMI 10%, BTC 10%
└── System Alert: Portfolio balanced ✓
```

#### 2.4.5 Functional Requirements

**Main Investment Account:**
- **FR-4.1**: Record deposits into main investment account
- **FR-4.2**: Track main account balance
- **FR-4.3**: Record withdrawals from main account for transfers
- **FR-4.4**: Optional interest rate configuration for main account

**THB Investment Account:**
- **FR-4.5**: Create THB investment account as portfolio asset type
- **FR-4.6**: Record deposits from main account to THB account
- **FR-4.7**: Track THB account balance
- **FR-4.8**: Maintain tiered interest rate structure for THB account
- **FR-4.9**: Calculate interest earned based on balance tiers
- **FR-4.10**: Include THB account in portfolio allocation options
- **FR-4.11**: Use THB interest rate as expected return in portfolio calculations
- **FR-4.12**: Support yearly interest rate updates

**FCD Investment Account:**
- **FR-4.13**: Create FCD account as portfolio asset type (USD)
- **FR-4.14**: Record THB to USD conversions
- **FR-4.15**: Track conversion rates with date/time
- **FR-4.16**: Record deposits into FCD account
- **FR-4.17**: Track FCD account balance in USD
- **FR-4.18**: Maintain tiered interest rate structure for FCD account
- **FR-4.19**: Calculate interest earned based on USD balance tiers
- **FR-4.20**: Include FCD account in portfolio allocation options
- **FR-4.21**: Use FCD interest rate as expected return in portfolio calculations
- **FR-4.22**: Maintain conversion rate history
- **FR-4.23**: Calculate THB equivalent for reporting
- **FR-4.24**: Fetch current THB/USD exchange rate from API
- **FR-4.25**: Allow manual entry of conversion rate

**Account Transfers:**
- **FR-4.26**: Track all transfers between accounts
- **FR-4.27**: Validate sufficient balance before transfer
- **FR-4.28**: Create linked transaction records for transfers
- **FR-4.29**: Record transfer date and amounts
- **FR-4.30**: Maintain complete transfer history

#### 2.4.6 Integration with Portfolio Creation

When creating a portfolio (Feature 1), THB and FCD accounts should be available as asset type options:

**Asset Type Options:**
- Stocks (ticker symbols, e.g., VOO, AAPL)
- Mutual Funds (fund codes, e.g., SCBSEMI(E))
- Cryptocurrencies (e.g., Bitcoin, BTC)
- Bonds
- ETFs
- Real Estate/REITs
- **THB Savings Account** (interest-bearing THB account)
- **FCD Account** (interest-bearing USD account)
- Cash/Money Market

**Example Portfolio with Savings Accounts:**
```javascript
{
  "id": "portfolio_001",
  "name": "Balanced Portfolio",
  "assets": [
    {
      "id": "asset_001",
      "name": "VOO",
      "type": "stock",
      "allocation": 40,
      "expectedReturn": 8.5,
      "currency": "USD"
    },
    {
      "id": "asset_002",
      "name": "THB Savings",
      "type": "thb_savings",
      "allocation": 30,
      "expectedReturn": 1.25,  // Current THB saving interest rate
      "currency": "THB"
    },
    {
      "id": "asset_003",
      "name": "FCD Account",
      "type": "fcd_account",
      "allocation": 30,
      "expectedReturn": 2.5,  // Current FCD interest rate
      "currency": "USD"
    }
  ],
  "totalAllocation": 100,
  "weightedReturn": 4.38  // Calculated from all assets including savings accounts
}
```

#### 2.4.7 Account Interest Rate Structures

**Interest Payment Schedule:**
- Calculation: Based on transaction history and balance tiers for the period
- Payment Frequency: Bi-annually (June 30 & December 31)
- Method: User records actual interest received and confirms against estimated

**THB Saving Account Tiers (Dime - as of Feb 1, 2026):**
```javascript
{
  "accountId": "thb_saving_001",
  "portfolioId": "portfolio_001",
  "type": "THB_SAVINGS",
  "balance": 125000,
  "currency": "THB",
  "minimumBalance": 0,  // No minimum required
  "interestRates": [
    {
      "year": 2026,
      "effectiveDate": "2026-02-01",
      "source": "Dime (powered by KKP Bank)",
      "tiers": [
        { "minBalance": 0, "maxBalance": 10000, "rate": 3.0 },
        { "minBalance": 10001, "maxBalance": 500000, "rate": 1.2 },
        { "minBalance": 500001, "maxBalance": null, "rate": 0.5 }
      ]
    }
  ],
  "lastInterestPayment": {
    "date": "2025-12-31",
    "amount": 1250,
    "periodStart": "2025-07-01",
    "periodEnd": "2025-12-31"
  }
}
```

**FCD (USD) Saving Account Tiers (Dime - as of Feb 1, 2026):**
```javascript
{
  "accountId": "fcd_account_001",
  "portfolioId": "portfolio_001",
  "type": "FCD_ACCOUNT",
  "balance": 5000,  // USD
  "currency": "USD",
  "minimumBalance": 0,  // No minimum required
  "interestRates": [
    {
      "year": 2026,
      "effectiveDate": "2026-02-01",
      "source": "Dime (powered by KKP Bank)",
      "paymentSchedule": "Bi-annually: June 30 & December 31",
      "calculationMethod": "Daily accrual, paid semi-annually",
      "tiers": [
        { "minBalance": 0, "maxBalance": 3000, "rate": 4.5 },
        { "minBalance": 3001, "maxBalance": 30000, "rate": 2.5 },
        { "minBalance": 30001, "maxBalance": null, "rate": 0.5 }
      ]
    }
  ],
  "lastInterestPayment": {
    "date": "2025-12-31",
    "amount": 112.50,  // USD
    "periodStart": "2025-07-01",
    "periodEnd": "2025-12-31"
  }
}
```

#### 2.4.7 Interest Calculation Logic

**Calculate Interest for Payment Period:**
```javascript
function calculateInterestForPeriod(accountId, startDate, endDate) {
  const account = getAccount(accountId);
  const transactions = getTransactionsBetween(accountId, startDate, endDate);
  const interestRates = account.interestRates.find(r => r.year === endDate.getFullYear());
  
  let totalInterest = 0;
  let currentDate = new Date(startDate);
  let balance = getBalanceAtDate(accountId, startDate);
  
  // Sort transactions by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Process each day in the period
  while (currentDate <= endDate) {
    // Calculate daily interest for current balance
    const dailyInterest = calculateDailyInterest(balance, interestRates.tiers);
    totalInterest += dailyInterest;
    
    // Check if any transactions occurred on this date
    const dayTransactions = transactions.filter(t => 
      new Date(t.date).toDateString() === currentDate.toDateString()
    );
    
    // Update balance for next day
    dayTransactions.forEach(t => {
      if (t.type === 'DEPOSIT') balance += t.amount;
      if (t.type === 'WITHDRAWAL') balance -= t.amount;
      if (t.type === 'TRANSFER_OUT') balance -= t.amount;
      if (t.type === 'TRANSFER_IN') balance += t.amount;
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return totalInterest;
}

function calculateDailyInterest(balance, tiers) {
  let remainingBalance = balance;
  let dailyInterest = 0;
  
  for (const tier of tiers) {
    if (remainingBalance <= 0) break;
    
    const tierMin = tier.minBalance;
    const tierMax = tier.maxBalance || Infinity;
    const tierRange = tierMax - tierMin;
    const amountInTier = Math.min(remainingBalance, Math.max(0, tierRange));
    
    if (balance >= tierMin && amountInTier > 0) {
      // Daily interest = (balance × annual rate) / 365
      const dailyRate = tier.rate / 100 / 365;
      dailyInterest += amountInTier * dailyRate;
      remainingBalance -= amountInTier;
    }
  }
  
  return dailyInterest;
}
```

**Interest Payment Recording:**
```javascript
function recordInterestPayment(accountId, paymentDate, actualAmount, notes) {
  const account = getAccount(accountId);
  const lastPaymentDate = account.lastInterestPayment?.date || account.createdDate;
  
  // Calculate estimated interest based on transaction history
  const estimatedAmount = calculateInterestForPeriod(
    accountId,
    new Date(lastPaymentDate),
    new Date(paymentDate)
  );
  
  // Create interest credit transaction
  const interestPayment = {
    id: generateId(),
    accountId: accountId,
    portfolioId: account.portfolioId,
    type: 'INTEREST_CREDIT',
    date: paymentDate,
    amount: actualAmount,
    currency: account.currency,
    estimatedAmount: estimatedAmount,
    difference: actualAmount - estimatedAmount,
    periodStart: lastPaymentDate,
    periodEnd: paymentDate,
    notes: notes || `Interest payment for period ${lastPaymentDate} to ${paymentDate}`,
    paymentSchedule: 'Bi-annual (June 30 / Dec 31)',
    source: 'Dime Saving Account'
  };
  
  // Update account balance
  account.balance += actualAmount;
  
  // Update last payment record
  account.lastInterestPayment = {
    date: paymentDate,
    amount: actualAmount,
    periodStart: lastPaymentDate,
    periodEnd: paymentDate
  };
  
  // Save transaction
  saveTransaction(interestPayment);
  saveAccount(account);
  
  return {
    payment: interestPayment,
    message: `Interest recorded: ${actualAmount} ${account.currency}`,
    variance: actualAmount - estimatedAmount
  };
}
```

#### 2.4.8 Data Models

**Main Investment Account:**
```javascript
{
  "mainAccount": {
    "id": "main_account_001",
    "type": "MAIN_INVESTMENT",
    "balance": 50000,
    "currency": "THB",
    "interestRate": 0.5,  // Optional
    "createdDate": "2026-01-01"
  }
}
```

**Account Transfers:**
```javascript
{
  "accountTransfers": [
    {
      "id": "transfer_001",
      "fromAccountId": "main_account_001",
      "toAccountId": "thb_investment_001",
      "amount": 100000,
      "currency": "THB",
      "date": "2026-02-15",
      "transferType": "main_to_thb",
      "notes": "Initial THB investment allocation"
    },
    {
      "id": "transfer_002",
      "fromAccountId": "thb_investment_001",
      "toAccountId": "fcd_account_001",
      "amount": 50000,  // THB
      "convertedAmount": 1500,  // USD
      "currency": "THB",
      "targetCurrency": "USD",
      "conversionRate": 33.33,
      "date": "2026-02-20",
      "transferType": "thb_to_fcd",
      "notes": "Convert THB to USD for FCD investment"
    }
  ]
}
```

**Currency Conversions:**
```javascript
{
  "conversionRates": [
    {
      "id": "rate_001",
      "fromCurrency": "THB",
      "toCurrency": "USD",
      "rate": 33.33,
      "date": "2026-02-20",
      "source": "Bank of Thailand API",
      "timestamp": "2026-02-20T10:30:00Z"
    }
  ]
}
```

---

### Feature 5: Investment Account Management

#### 2.5.1 Overview
Manage investment accounts (THB and USD) with balance tracking, transaction history, and tiered interest rate calculations.

#### 2.5.2 Functional Requirements
- **FR-5.1**: Create and maintain THB and USD accounts separately
- **FR-5.2**: Track account balances in real-time
- **FR-5.3**: Record all deposits into accounts
- **FR-5.4**: Record all withdrawals from accounts for investment transactions
- **FR-5.5**: Match investment transactions with account withdrawals
- **FR-5.6**: Maintain tiered interest rate structures per account
- **FR-5.7**: Support yearly interest rate updates
- **FR-5.8**: Calculate interest earned based on balance tiers
- **FR-5.9**: Auto-withdraw from appropriate account when investment recorded
- **FR-5.10**: THB investment → withdraw from THB account
- **FR-5.11**: USD investment → withdraw from USD account
- **FR-5.12**: Validate sufficient balance before withdrawal
- **FR-5.13**: Create linked transaction record

#### 2.5.3 Tiered Interest Rate Structure

Example structure with multiple tiers and yearly updates:
```javascript
{
  "accounts": [
    {
      "id": "account_thb_001",
      "type": "THB",
      "balance": 125000,
      "interestRates": [
        {
          "year": 2026,
          "tiers": [
            { "minBalance": 0, "maxBalance": 10000, "rate": 3.0 },
            { "minBalance": 10001, "maxBalance": 100000, "rate": 1.25 },
            { "minBalance": 100001, "maxBalance": null, "rate": 0.75 }
          ]
        }
      ]
    }
  ]
}
```

#### 2.5.4 Interest Calculation Logic
```javascript
function calculateTieredInterest(balance, accountId, year) {
  const account = getAccount(accountId);
  const yearRates = account.interestRates.find(r => r.year === year);
  
  let totalInterest = 0;
  let remainingBalance = balance;
  
  for (const tier of yearRates.tiers) {
    if (remainingBalance <= 0) break;
    
    const tierMax = tier.maxBalance || Infinity;
    const tierMin = tier.minBalance;
    const tierRange = tierMax - tierMin;
    const amountInTier = Math.min(remainingBalance, tierRange);
    
    if (balance >= tierMin) {
      const interest = amountInTier * (tier.rate / 100);
      totalInterest += interest;
      remainingBalance -= amountInTier;
    }
  }
  
  return totalInterest;
}
```

---

### Feature 6: Actual Investment Transactions

#### 2.6.1 Overview
Record actual investment purchases using funds withdrawn from investment accounts.

#### 2.6.2 Functional Requirements
- **FR-6.1**: Record investment transaction for specific asset
- **FR-6.2**: Capture investment date
- **FR-6.3**: Capture investment amount
- **FR-6.4**: Specify currency (THB or USD)
- **FR-6.5**: Link to portfolio and asset
- **FR-6.6**: Automatically withdraw from corresponding account
- **FR-6.7**: Calculate units/shares purchased (if price available)
- **FR-6.8**: Track cost basis per transaction
- **FR-6.9**: Maintain complete transaction history
- **FR-6.10**: Verify selected asset belongs to selected portfolio
- **FR-6.11**: Verify sufficient account balance
- **FR-6.12**: Transaction date cannot be in the future
- **FR-6.13**: Amount must be positive number
- **FR-6.14**: Currency must match account type for withdrawal
- **FR-6.15**: Transaction amount validation - all transactions must have amount > 0
- **FR-6.16**: Reject zero or negative amount transactions at input
- **FR-6.17**: Display error message: "Transaction amount must be greater than zero"
- **FR-6.18**: Prevent placeholder or invalid entries

#### 2.6.3 Transaction Linking Schema

**FR-6.19: Multi-Transaction Linking**
Support linking related transactions using transaction ID arrays:

```javascript
{
  "transaction": {
    "transactionId": "tx_001",
    "type": "WITHDRAWAL",
    "date": "2026-02-20",
    "amount": 45.15,
    "currency": "USD",
    "accountId": "fcd_account_001",
    
    // Link to related transactions
    "linkedTransactions": ["tx_002", "tx_003"],
    "linkType": "FIFO_WITHDRAWAL_FOR_PURCHASE",
    "linkDescription": "FCD withdrawal to fund UFO stock purchase"
  },
  "relatedTransactions": [
    {
      "transactionId": "tx_002",
      "type": "BUY",
      "assetId": "asset_ufo_001",
      "amount": 45.15,
      "linkedTransactions": ["tx_001"],
      "linkType": "ASSET_PURCHASE"
    }
  ]
}
```

**Link Types:**
- `FIFO_WITHDRAWAL`: FCD account withdrawal using FIFO lots
- `ASSET_PURCHASE`: Asset purchase transaction
- `INTEREST_PAYMENT`: Interest credit to account
- `TRANSFER`: Account-to-account transfer
- `CURRENCY_CONVERSION`: THB to USD or USD to THB conversion

#### 2.6.4 Broker/Exchange Transaction Import (PDF & Image)

**Overview:**
Import transaction confirmations and account statements from brokers and exchanges to automatically populate transaction records. Supports multiple document formats including PDFs and mobile screenshots with OCR extraction.

**Supported Document Types:**
1. Stock/ETF transaction confirmations (PDF) - Dime Securities
2. Cryptocurrency transactions (Screenshots) - innOvestX, Bitkub
3. Account statements covered in Feature 6.5 below

**Functional Requirements - Stock/ETF Transactions:**
- **FR-6.20**: Upload broker confirmation notes in PDF format
- **FR-6.21**: OCR extraction of transaction data using Tesseract.js
- **FR-6.22**: Support for Thai broker formats (Dime Securities, SCB, K-Trade)
- **FR-6.23**: Extract transaction fields:
  - Transaction date and settlement date
  - Order ID/confirmation number
  - Transaction type (BUY/SELL)
  - Asset ticker/symbol and exchange
  - Units/shares purchased
  - Price per unit (USD)
  - Total amount in USD
  - Exchange rate (THB/USD)
  - THB equivalent amount
  - Fees and charges
  - Account number
- **FR-6.24**: Manual verification interface with editable fields
- **FR-6.25**: Store original PDF reference with transaction
- **FR-6.26**: Preview uploaded documents
- **FR-6.27**: Batch import multiple transactions from single document
- **FR-6.28**: Transaction deduplication detection
- **FR-6.29**: File size limit: 10MB per file
- **FR-6.30**: Supported formats: PDF for stock transactions

**Functional Requirements - Cryptocurrency Transactions:**
- **FR-6.31**: Upload mobile app screenshots (PNG, JPG, HEIC)
- **FR-6.32**: OCR for Thai+English cryptocurrency interfaces
- **FR-6.33**: Support for crypto platforms (innOvestX, Bitkub)
- **FR-6.34**: Extract crypto-specific fields:
  - Transaction ID
  - Date and time with seconds
  - Cryptocurrency symbol (BTC, ETH, etc.)
  - Quantity purchased (8+ decimal precision)
  - Total price in THB
  - Fee in THB
  - Payment account/source
  - Order type (Market/Limit)
  - Transaction status
- **FR-6.35**: Calculate unit price from total ÷ quantity
- **FR-6.36**: Handle high-precision decimal values (8+ decimals)
- **FR-6.37**: Detect platform from UI elements/logo
- **FR-6.38**: Support both completed and pending transactions
- **FR-6.39**: Validate cryptocurrency symbols against known assets
- **FR-6.40**: Convert screenshot timestamps to transaction records

**OCR Implementation - Dime Securities (Stock/ETF):**
```javascript
async function parseDimeSecuritiesConfirmation(pdfFile) {
  const { data: { text } } = await Tesseract.recognize(pdfFile, 'tha+eng');
  
  const transactions = [];
  const lines = text.split('\n');
  
  // Extract account info
  const accountMatch = text.match(/Account No\.(\d+)/);
  const accountNumber = accountMatch ? accountMatch[1] : null;
  
  // Extract date
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  const transactionDate = dateMatch ? parseDate(dateMatch[1]) : null;
  
  // Extract exchange rate
  const rateMatch = text.match(/THB\/USD\s*=\s*([\d.]+)/);
  const exchangeRate = rateMatch ? parseFloat(rateMatch[1]) : null;
  
  // Parse transaction rows (format: BUY TICKER [EXCHANGE] units price USD amount)
  const txPattern = /BUY\s+([A-Z]{2,5})\s+\[([A-Z]+)\]\s+([\d.]+)\s+([\d.]+)USD\s+([\d.]+)/g;
  let match;
  
  while ((match = txPattern.exec(text)) !== null) {
    const [, ticker, exchange, units, priceUSD, amountUSD] = match;
    
    transactions.push({
      date: transactionDate,
      type: 'BUY',
      ticker: ticker,
      exchange: exchange,
      units: parseFloat(units),
      pricePerUnit: parseFloat(priceUSD),
      amountUSD: parseFloat(amountUSD),
      currency: 'USD',
      exchangeRate: exchangeRate,
      thbEquivalent: parseFloat(amountUSD) * exchangeRate,
      accountNumber: accountNumber,
      broker: 'Dime Securities',
      sourceFile: pdfFile.name
    });
  }
  
  return transactions;
}
```

**OCR Implementation - innOvestX (Cryptocurrency):**
```javascript
async function parseInnOvestXScreenshot(imageFile) {
  const { data: { text } } = await Tesseract.recognize(imageFile, 'tha+eng');
  
  const transaction = {
    platform: 'innOvestX',
    type: 'BUY',
    cryptocurrency: null,
    quantity: null,
    totalPrice: null,
    currency: 'THB',
    fee: null,
    unitPrice: null,
    transactionId: null,
    date: null
  };
  
  // Extract transaction ID
  const txIdMatch = text.match(/เลขที่คำสั่งซื้อ:\s*([A-Z0-9]+)/);
  if (txIdMatch) transaction.transactionId = txIdMatch[1];
  
  // Extract date/time
  const dateMatch = text.match(/วันที่\s*(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})/);
  if (dateMatch) {
    transaction.date = parseDateTime(dateMatch[1], dateMatch[2]);
  }
  
  // Extract cryptocurrency symbol
  const cryptoMatch = text.match(/เหรียญที่ต้องการซื้อ.*?(BTC|ETH|USDT|[A-Z]{2,5})/);
  if (cryptoMatch) transaction.cryptocurrency = cryptoMatch[1];
  
  // Extract quantity (high precision)
  const qtyMatch = text.match(/จำนวนที่ซื้อ.*?([\d.]+)/);
  if (qtyMatch) transaction.quantity = parseFloat(qtyMatch[1]);
  
  // Extract total price
  const priceMatch = text.match(/ราคา \(บาท\).*?([\d,]+\.?\d*)/);
  if (priceMatch) {
    transaction.totalPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
  }
  
  // Extract fee
  const feeMatch = text.match(/ค่าธรรมเนียม.*?([\d.]+)/);
  if (feeMatch) transaction.fee = parseFloat(feeMatch[1]);
  
  // Calculate unit price
  if (transaction.totalPrice && transaction.quantity) {
    transaction.unitPrice = transaction.totalPrice / transaction.quantity;
  }
  
  return transaction;
}
```

**Data Model - Imported Transaction:**
```javascript
{
  "transactionId": "tx_imported_001",
  "importedFrom": "document",
  "sourceDocument": {
    "fileId": "doc_001",
    "fileName": "Sample_transaction.pdf",
    "fileType": "application/pdf",
    "uploadDate": "2026-02-28",
    "storagePath": "History_Track/Sample_transaction.pdf",
    "fileSize": 125000,
    "ocrConfidence": 0.92,
    "extractionMethod": "Tesseract.js",
    "platform": "Dime Securities"
  },
  "extractedData": {
    "date": "2026-02-26",
    "type": "BUY",
    "ticker": "DGRO",
    "exchange": "ARCX",
    "units": 0.1090394,
    "pricePerUnit": 73.37,
    "amountUSD": 8.00,
    "currency": "USD",
    "exchangeRate": 30.8772,
    "thbEquivalent": 247.02,
    "fee": 0.00,
    "accountNumber": "80001438766"
  },
  "verifiedBy": "user",
  "verificationDate": "2026-02-28",
  "imported": true
}
```

#### 2.6.5 Account Statement Import (THB & FCD Savings)

**Overview:**
Import bank account statements to automatically record deposits, withdrawals, interest payments, and verify account balances.

**Supported Statement Types:**
1. THB Savings Account statements (Dime! Save)
2. FCD Account statements (Dime! FCD)

**Functional Requirements:**
- **FR-6.41**: Upload THB savings account statements (PDF)
- **FR-6.42**: Upload FCD savings account statements (PDF)
- **FR-6.43**: OCR extraction of transaction history
- **FR-6.44**: Support Dime! statement format (KKP Bank)
- **FR-6.45**: Extract transaction fields:
  - Date
  - Transaction type (Transfer-in, Transfer-out, Interest)
  - Debit amount
  - Credit amount
  - Running balance
  - Channel (PROMPTPAY, DIME)
  - Details/reference
- **FR-6.46**: Identify interest payments automatically
- **FR-6.47**: Match statement period with existing data
- **FR-6.48**: Reconcile imported balance with system balance
- **FR-6.49**: Detect duplicate transactions
- **FR-6.50**: Batch import all transactions from statement
- **FR-6.51**: Flag discrepancies between statement and system
- **FR-6.52**: Support multi-page statements (3+ pages)
- **FR-6.53**: Verify final balance matches statement

**OCR Implementation - Dime! Savings Statement:**
```javascript
async function parseDimeSavingsStatement(pdfText, currency) {
  const statement = {
    accountNumber: null,
    accountType: currency === 'THB' ? 'THB_SAVINGS' : 'FCD_ACCOUNT',
    currency: currency,
    period: {},
    openingBalance: 0,
    closingBalance: 0,
    transactions: []
  };
  
  // Extract account number
  const accountMatch = pdfText.match(/Account No\.(\d+)/);
  if (accountMatch) statement.accountNumber = accountMatch[1];
  
  // Extract period
  const periodMatch = pdfText.match(/Period(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  if (periodMatch) {
    statement.period.startDate = parseDate(periodMatch[1]);
    statement.period.endDate = parseDate(periodMatch[2]);
  }
  
  // Extract closing balance
  const balanceMatch = pdfText.match(/Outstanding Balance([\d,]+\.?\d*)/);
  if (balanceMatch) {
    statement.closingBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }
  
  // Parse transaction lines
  const lines = pdfText.split('\n');
  for (const line of lines) {
    // Transaction pattern: Date Description [Debit] [Credit] Balance Channel
    const txMatch = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.?\d*)?\s+([\d,]+\.?\d*)?\s+([\d,]+\.?\d*)\s*(\w+)?/);
    
    if (txMatch) {
      const [, date, description, debit, credit, balance, channel] = txMatch;
      
      const transaction = {
        date: parseDate(date),
        description: description.trim(),
        debit: debit ? parseFloat(debit.replace(/,/g, '')) : null,
        credit: credit ? parseFloat(credit.replace(/,/g, '')) : null,
        balance: parseFloat(balance.replace(/,/g, '')),
        channel: channel || '',
        type: categorizeTransaction(description)
      };
      
      statement.transactions.push(transaction);
    }
  }
  
  return statement;
}

function categorizeTransaction(description) {
  if (description.includes('Interest')) return 'INTEREST_CREDIT';
  if (description.includes('Transfer-in')) return 'DEPOSIT';
  if (description.includes('Transfer-out') || description.includes('Transfer Other Bank')) {
    return 'WITHDRAWAL';
  }
  return 'OTHER';
}
```

**Balance Reconciliation:**
```javascript
function reconcileStatement(statement, systemAccount) {
  const discrepancies = [];
  
  // Check final balance
  if (Math.abs(statement.closingBalance - systemAccount.balance) > 0.01) {
    discrepancies.push({
      type: 'BALANCE_MISMATCH',
      statementBalance: statement.closingBalance,
      systemBalance: systemAccount.balance,
      difference: statement.closingBalance - systemAccount.balance
    });
  }
  
  // Check for duplicate transactions
  statement.transactions.forEach(stmtTx => {
    const existing = systemAccount.transactions.find(sysTx => 
      sysTx.date === stmtTx.date && 
      Math.abs(sysTx.amount - (stmtTx.credit || stmtTx.debit)) < 0.01
    );
    
    if (existing) {
      discrepancies.push({
        type: 'DUPLICATE_TRANSACTION',
        date: stmtTx.date,
        amount: stmtTx.credit || stmtTx.debit,
        existingId: existing.id
      });
    }
  });
  
  return {
    reconciled: discrepancies.length === 0,
    discrepancies: discrepancies,
    newTransactions: statement.transactions.length - discrepancies.filter(d => d.type === 'DUPLICATE_TRANSACTION').length
  };
}
```

**Data Model - Account Statement:**
```javascript
{
  "accountStatementId": "stmt_001",
  "accountId": "thb_saving_001",
  "accountNumber": "2072992100",
  "accountType": "THB_SAVINGS",
  "currency": "THB",
  "statementPeriod": {
    "startDate": "2025-02-01",
    "endDate": "2026-02-28"
  },
  "openingBalance": 0.00,
  "closingBalance": 231181.24,
  "importDate": "2026-02-28",
  "sourceFile": {
    "fileName": "THB Statement.pdf",
    "fileSize": 245000,
    "uploadDate": "2026-02-28"
  },
  "transactions": [
    {
      "date": "2025-10-24",
      "description": "Transfer-in Other Bank",
      "debit": null,
      "credit": 5000.00,
      "balance": 5000.00,
      "channel": "PROMPTPAY",
      "type": "DEPOSIT"
    },
    {
      "date": "2025-12-31",
      "description": "Interest",
      "debit": null,
      "credit": 55.18,
      "balance": 10080.13,
      "channel": "",
      "details": "DD4400",
      "type": "INTEREST_CREDIT"
    }
  ],
  "summary": {
    "totalDeposits": 520000.00,
    "totalWithdrawals": 288818.76,
    "totalInterest": 55.18,
    "transactionCount": 45
  },
  "reconciliation": {
    "reconciled": true,
    "discrepancies": [],
    "newTransactions": 40
  }
}
```

---

### Feature 7: Current Asset Value (Price Tracking)

#### 2.7.1 Overview
Fetch and maintain current market prices for all assets in portfolios.

#### 2.7.2 Functional Requirements
- **FR-7.1**: Fetch current prices from internet for all asset types
- **FR-7.2**: Store price with timestamp
- **FR-7.3**: Allow manual price entry for specific dates
- **FR-7.4**: Maintain price history for each asset
- **FR-7.5**: Support different asset types (stocks, crypto, mutual funds, bonds)
- **FR-7.6**: Display price change and percentage change
- **FR-7.7**: Show last update timestamp
- **FR-7.8**: "Update Prices" button to refresh all asset prices
- **FR-7.9**: Individual asset price update
- **FR-7.10**: Date selector for historical price entry
- **FR-7.11**: Manual price entry form

#### 2.7.3 Price Fetching Implementation

**Stock Prices:**
```javascript
async function fetchStockPrice(ticker) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
  const data = await response.json();
  const price = data.chart.result[0].meta.regularMarketPrice;
  const timestamp = data.chart.result[0].meta.regularMarketTime;
  
  return {
    ticker: ticker,
    price: price,
    currency: data.chart.result[0].meta.currency,
    timestamp: new Date(timestamp * 1000).toISOString(),
    source: "Yahoo Finance"
  };
}
```

**Cryptocurrency Prices:**
```javascript
async function fetchCryptoPrice(symbol) {
  const coinId = symbol.toLowerCase();
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,thb&include_last_updated_at=true`
  );
  const data = await response.json();
  
  return {
    symbol: symbol,
    priceUSD: data[coinId].usd,
    priceTHB: data[coinId].thb,
    timestamp: new Date(data[coinId].last_updated_at * 1000).toISOString(),
    source: "CoinGecko"
  };
}
```

---

### Feature 8: Tracking & Reporting

#### 2.8.1 Overview
Period-based portfolio performance analysis and reporting.

#### 2.8.2 Functional Requirements
- **FR-8.1**: Display tracking by month, year, or custom date range
- **FR-8.2**: Constrain period from portfolio start date to current date
- **FR-8.3**: Align to month boundaries (start of month to end of month)
- **FR-8.4**: Show per-asset allocation ratio and investment amounts
- **FR-8.5**: Check if asset values still match target allocation
- **FR-8.6**: Flag assets with values exceeding allocation ratio
- **FR-8.7**: Display total asset value and total investment value
- **FR-8.8**: Calculate portfolio gain/loss
- **FR-8.9**: Show portfolio return percentage
- **FR-8.10**: Generate performance charts
- **FR-8.11**: Asset allocation pie chart
- **FR-8.12**: Portfolio value over time line chart

---

### Feature 9: FIFO Cost Basis Tracking & Multi-Portfolio Reporting

#### 2.9.1 Overview
Implement First-In-First-Out (FIFO) lot tracking for FCD account deposits to accurately track conversion rates and calculate cost basis for USD assets. This enables precise THB reporting using historical conversion rates and supports both single portfolio analysis and multi-portfolio consolidated views.

#### 2.9.2 FIFO Lot Tracking for FCD Deposits

**Business Rationale:**
When USD assets are purchased from the FCD account, the system must track which specific USD deposits (with their conversion rates) were used. This ensures accurate THB cost basis for tax reporting and performance analysis.

**Functional Requirements:**
- **FR-9.1**: Track each FCD deposit as a separate "lot" with its conversion rate
- **FR-9.2**: When withdrawing from FCD to buy assets, use FIFO order (oldest deposits first)
- **FR-9.3**: If multiple deposits occur on same date, use smallest lot first
- **FR-9.4**: Maintain remaining balance for each lot after partial withdrawals
- **FR-9.5**: Automatically remove depleted lots (balance = 0)
- **FR-9.6**: Auto-calculate lot status: 'OPEN' when remainingAmountUSD > 0, 'CLOSED' when remainingAmountUSD = 0
- **FR-9.7**: No manual status override - status derived from remaining balance
- **FR-9.8**: Link each asset purchase to the FCD lots that funded it
- **FR-9.9**: Calculate weighted average conversion rate for assets funded by multiple lots
- **FR-9.10**: Store both FIFO lot rate (for cost basis) and current market rate (for reference)
- **FR-9.11**: Use FIFO lot rate for all cost basis calculations and tax reporting
- **FR-9.12**: Store current market rate separately for gain/loss analysis

#### 2.9.3 FCD Lot Data Structure

```javascript
{
  "fcdAccount": {
    "accountId": "fcd_001",
    "portfolioId": "portfolio_001",
    "type": "FCD_ACCOUNT",
    "currency": "USD",
    "totalBalance": 20000,  // USD
    
    // FIFO queue - oldest lots first
    "lots": [
      {
        "lotId": "lot_001",
        "depositDate": "2026-01-15",
        "depositAmountUSD": 20000,
        "depositAmountTHB": 630000,
        "conversionRate": 31.50,  // THB/USD
        "remainingAmountUSD": 10000,  // After withdrawals
        "remainingAmountTHB": 315000,
        "withdrawals": [
          {
            "withdrawalId": "w_001",
            "date": "2026-02-15",
            "amountUSD": 10000,
            "purpose": "BUY_ASSET",
            "assetId": "asset_voo_001",
            "transactionId": "tx_001"
          }
        ]
      },
      {
        "lotId": "lot_002",
        "depositDate": "2026-02-01",
        "depositAmountUSD": 30000,
        "depositAmountTHB": 960000,
        "conversionRate": 32.00,
        "remainingAmountUSD": 10000,
        "remainingAmountTHB": 320000,
        "withdrawals": [
          {
            "withdrawalId": "w_002",
            "date": "2026-02-20",
            "amountUSD": 20000,
            "purpose": "BUY_ASSET",
            "assetId": "asset_aapl_001",
            "transactionId": "tx_002"
          }
        ]
      }
    ]
  }
}
```

#### 2.9.4 Asset Cost Basis with FIFO Lots

```javascript
{
  "asset": {
    "assetId": "asset_voo_001",
    "portfolioId": "portfolio_001",
    "name": "VOO",
    "type": "stock",
    "currency": "USD",
    "purchaseDate": "2026-02-15",
    
    // FIFO cost basis tracking
    "costBasisLots": [
      {
        "lotId": "lot_001",
        "amountUSD": 10000,
        "conversionRate": 31.50,
        "costBasisTHB": 315000,
        "originalDepositDate": "2026-01-15"
      }
    ],
    
    "totalCostUSD": 10000,
    "totalCostTHB": 315000,
    "reportingConversionRate": 31.50,  // Weighted average for reporting
    
    // Current market value
    "currentUnits": 22.22,  // shares
    "currentPriceUSD": 450,
    "currentValueUSD": 10000,
    
    // For sale tracking
    "saleDate": null,
    "saleAmountUSD": null,
    "saleConversionRate": null
  }
}
```

#### 2.9.5 FIFO Withdrawal Algorithm

```javascript
function withdrawFromFCD(accountId, amountUSD, transactionDate, purpose, referenceId) {
  const account = getAccount(accountId);
  const withdrawalLots = [];
  let remainingToWithdraw = amountUSD;
  
  // Sort lots by date (FIFO), then by amount (smallest first for same date)
  const sortedLots = account.lots.sort((a, b) => {
    if (a.depositDate !== b.depositDate) {
      return new Date(a.depositDate) - new Date(b.depositDate);
    }
    return a.remainingAmountUSD - b.remainingAmountUSD;
  });
  
  // Process lots in FIFO order
  for (let lot of sortedLots) {
    if (remainingToWithdraw <= 0) break;
    if (lot.remainingAmountUSD <= 0) continue;
    
    const amountFromThisLot = Math.min(lot.remainingAmountUSD, remainingToWithdraw);
    const thbFromThisLot = amountFromThisLot * lot.conversionRate;
    
    // Record withdrawal from this lot
    const withdrawal = {
      withdrawalId: generateId(),
      date: transactionDate,
      amountUSD: amountFromThisLot,
      purpose: purpose,  // 'BUY_ASSET', 'TRANSFER_TO_THB', etc.
      referenceId: referenceId,
      conversionRateUsed: lot.conversionRate
    };
    
    lot.withdrawals.push(withdrawal);
    lot.remainingAmountUSD -= amountFromThisLot;
    lot.remainingAmountTHB -= thbFromThisLot;
    
    withdrawalLots.push({
      lotId: lot.lotId,
      amountUSD: amountFromThisLot,
      conversionRate: lot.conversionRate,
      thbAmount: thbFromThisLot,
      originalDepositDate: lot.depositDate
    });
    
    remainingToWithdraw -= amountFromThisLot;
  }
  
  // Remove depleted lots
  account.lots = account.lots.filter(lot => lot.remainingAmountUSD > 0);
  
  // Update total balance
  account.totalBalance -= amountUSD;
  
  // Calculate weighted average rate
  const totalTHB = withdrawalLots.reduce((sum, lot) => sum + lot.thbAmount, 0);
  const weightedAvgRate = totalTHB / amountUSD;
  
  return {
    withdrawalLots: withdrawalLots,
    totalUSD: amountUSD,
    totalTHB: totalTHB,
    weightedAvgRate: weightedAvgRate
  };
}
```

#### 2.9.6 Asset Purchase with FIFO Tracking

```javascript
function purchaseAssetFromFCD(assetId, amountUSD, fcdAccountId, purchaseDate) {
  // Withdraw from FCD with FIFO tracking
  const withdrawal = withdrawFromFCD(fcdAccountId, amountUSD, purchaseDate, 'BUY_ASSET', assetId);
  
  // Create or update asset
  const asset = getAsset(assetId) || createNewAsset(assetId);
  
  // Add cost basis lots to asset
  withdrawal.withdrawalLots.forEach(lot => {
    asset.costBasisLots.push({
      lotId: lot.lotId,
      amountUSD: lot.amountUSD,
      conversionRate: lot.conversionRate,
      costBasisTHB: lot.thbAmount,
      purchaseDate: purchaseDate,
      originalDepositDate: lot.originalDepositDate
    });
  });
  
  // Update asset totals
  asset.totalCostUSD += amountUSD;
  asset.totalCostTHB += withdrawal.totalTHB;
  asset.reportingConversionRate = asset.totalCostTHB / asset.totalCostUSD;
  
  // Create transaction record
  const transaction = {
    id: generateId(),
    type: 'BUY',
    assetId: assetId,
    date: purchaseDate,
    amountUSD: amountUSD,
    costBasisTHB: withdrawal.totalTHB,
    conversionRate: withdrawal.weightedAvgRate,
    fcdAccountId: fcdAccountId,
    fifoLots: withdrawal.withdrawalLots
  };
  
  saveTransaction(transaction);
  saveAsset(asset);
  
  return {
    asset: asset,
    transaction: transaction
  };
}
```

#### 2.9.7 Asset Sale with Capital Gains Tracking

```javascript
function sellAsset(assetId, saleDate, saleAmountUSD) {
  const asset = getAsset(assetId);
  const currentExchangeRate = getExchangeRate('USD', 'THB', saleDate);
  
  // Calculate sale proceeds in THB
  const saleAmountTHB = saleAmountUSD * currentExchangeRate;
  
  // Calculate gains
  const assetGainUSD = saleAmountUSD - asset.totalCostUSD;
  const assetGainTHB = assetGainUSD * currentExchangeRate;
  const fxGainTHB = (currentExchangeRate - asset.reportingConversionRate) * asset.totalCostUSD;
  const totalGainTHB = saleAmountTHB - asset.totalCostTHB;
  
  // Update asset
  asset.saleDate = saleDate;
  asset.saleAmountUSD = saleAmountUSD;
  asset.saleConversionRate = currentExchangeRate;
  asset.capitalGains = {
    assetGainUSD: assetGainUSD,
    assetGainTHB: assetGainTHB,
    fxGainTHB: fxGainTHB,
    totalGainTHB: totalGainTHB
  };
  
  // Create sale transaction
  const transaction = {
    id: generateId(),
    type: 'SELL',
    assetId: assetId,
    date: saleDate,
    amountUSD: saleAmountUSD,
    amountTHB: saleAmountTHB,
    conversionRate: currentExchangeRate,
    costBasisTHB: asset.totalCostTHB,
    capitalGains: asset.capitalGains
  };
  
  saveTransaction(transaction);
  saveAsset(asset);
  
  return {
    asset: asset,
    transaction: transaction,
    gains: asset.capitalGains
  };
}
```

#### 2.9.8 FCD to THB Transfer with FX Gains

```javascript
function transferFCDtoTHB(fcdAccountId, thbAccountId, amountUSD, transferDate) {
  const currentExchangeRate = getExchangeRate('USD', 'THB', transferDate);
  
  // Withdraw from FCD with FIFO tracking
  const withdrawal = withdrawFromFCD(fcdAccountId, amountUSD, transferDate, 'TRANSFER_TO_THB', null);
  
  // Calculate THB received
  const thbReceived = amountUSD * currentExchangeRate;
  
  // Calculate FX gain
  const originalCostTHB = withdrawal.totalTHB;  // From FIFO lots
  const fxGain = thbReceived - originalCostTHB;
  
  // Deposit to THB account
  const thbAccount = getAccount(thbAccountId);
  thbAccount.balance += thbReceived;
  
  // Create transfer record
  const transfer = {
    id: generateId(),
    type: 'FCD_TO_THB',
    date: transferDate,
    fromAccountId: fcdAccountId,
    toAccountId: thbAccountId,
    amountUSD: amountUSD,
    amountTHB: thbReceived,
    conversionRate: currentExchangeRate,
    originalCostTHB: originalCostTHB,
    fxGain: fxGain,
    fifoLots: withdrawal.withdrawalLots
  };
  
  saveTransaction(transfer);
  saveAccount(thbAccount);
  
  return {
    transfer: transfer,
    fxGain: fxGain
  };
}
```

#### 2.9.9 THB Reporting Using FIFO Rates

```javascript
function calculateAssetValueInTHB(asset, reportDate, useHistoricalRates = true) {
  if (asset.currency === 'THB') {
    return asset.currentValueTHB;
  }
  
  // For USD assets
  if (useHistoricalRates) {
    // Use FIFO cost basis rates (for cost basis reporting)
    return asset.totalCostTHB;
  } else {
    // Use current market rate (for current value reporting)
    const currentRate = getExchangeRate('USD', 'THB', reportDate);
    return asset.currentValueUSD * currentRate;
  }
}

function generateAssetValuationReport(assetId, reportDate) {
  const asset = getAsset(assetId);
  const currentExchangeRate = getExchangeRate('USD', 'THB', reportDate);
  
  // Cost basis (using FIFO rates)
  const costBasisTHB = asset.totalCostTHB;
  const avgCostRate = asset.reportingConversionRate;
  
  // Current value (using as-of-date rate)
  const currentValueUSD = asset.currentValueUSD;
  const currentValueTHB = currentValueUSD * currentExchangeRate;
  
  // Gains analysis
  const unrealizedGainTHB = currentValueTHB - costBasisTHB;
  const assetGainUSD = currentValueUSD - asset.totalCostUSD;
  const assetGainTHB = assetGainUSD * currentExchangeRate;
  const fxGainTHB = (currentExchangeRate - avgCostRate) * asset.totalCostUSD;
  
  return {
    assetName: asset.name,
    assetType: asset.type,
    
    // Cost basis (historical FIFO rates)
    costBasis: {
      amountUSD: asset.totalCostUSD,
      conversionRate: avgCostRate,
      amountTHB: costBasisTHB,
      lots: asset.costBasisLots  // Detail breakdown
    },
    
    // Current value (as-of-date rate)
    currentValue: {
      amountUSD: currentValueUSD,
      conversionRate: currentExchangeRate,
      amountTHB: currentValueTHB,
      priceDate: reportDate
    },
    
    // Gains analysis
    unrealizedGain: {
      totalTHB: unrealizedGainTHB,
      assetGainUSD: assetGainUSD,
      assetGainTHB: assetGainTHB,
      fxGainTHB: fxGainTHB,
      percentageReturn: (unrealizedGainTHB / costBasisTHB) * 100
    }
  };
}
```

#### 2.9.10 Single Portfolio Report with Allocation Analysis

**Functional Requirements:**
- **FR-9.35**: Generate detailed report for single portfolio
- **FR-9.36**: Compare plan allocation % vs actual allocation %
- **FR-9.37**: Show rebalancing warnings (yellow: >10%, red: >15%)
- **FR-9.38**: Provide specific rebalancing suggestions
- **FR-9.39**: Display cost basis vs current value for each asset
- **FR-9.40**: Show FIFO lot details for USD assets
- **FR-9.41**: Calculate unrealized gains with FX gain breakdown

```javascript
function generateSinglePortfolioReport(portfolioId, reportDate) {
  const portfolio = getPortfolio(portfolioId);
  const currentExchangeRate = getExchangeRate('USD', 'THB', reportDate);
  
  // Calculate asset valuations
  const assetDetails = portfolio.assets.map(asset => {
    const valuation = generateAssetValuationReport(asset.id, reportDate);
    
    return {
      ...valuation,
      targetAllocation: asset.allocation,  // From portfolio plan
      actualAllocation: null,  // Calculated below
      deviation: null,
      warningLevel: null,
      suggestion: null
    };
  });
  
  // Calculate total portfolio value
  const totalValueTHB = assetDetails.reduce((sum, a) => 
    sum + a.currentValue.amountTHB, 0
  );
  
  // Calculate actual allocations and deviations
  assetDetails.forEach(asset => {
    asset.actualAllocation = (asset.currentValue.amountTHB / totalValueTHB) * 100;
    asset.deviation = asset.actualAllocation - asset.targetAllocation;
    asset.deviationPercent = Math.abs(asset.deviation);
    
    // Determine warning level
    if (asset.deviationPercent >= 15) {
      asset.warningLevel = 'red';
      asset.warningMessage = '🔴 URGENT: Significant deviation from target';
    } else if (asset.deviationPercent >= 10) {
      asset.warningLevel = 'yellow';
      asset.warningMessage = '⚠️ WARNING: Rebalancing recommended';
    } else {
      asset.warningLevel = 'green';
      asset.warningMessage = '✓ On target';
    }
    
    // Generate suggestion
    asset.suggestion = generateRebalancingSuggestion(asset, totalValueTHB, currentExchangeRate);
  });
  
  return {
    reportType: 'single',
    portfolioName: portfolio.name,
    reportDate: reportDate,
    exchangeRate: currentExchangeRate,
    totalValueTHB: totalValueTHB,
    assets: assetDetails,
    hasWarnings: assetDetails.some(a => a.warningLevel !== 'green')
  };
}
```

#### 2.9.11 Multi-Portfolio Consolidated Report

**Functional Requirements:**
- **FR-9.42**: Generate consolidated report for multiple portfolios
- **FR-9.43**: Aggregate all assets across selected portfolios
- **FR-9.44**: Show % of total cost basis for each asset
- **FR-9.45**: Show % of total current value for each asset
- **FR-9.46**: Group assets by type for summary
- **FR-9.47**: Show per-portfolio summary
- **FR-9.48**: NO allocation comparison (no plan vs actual)
- **FR-9.49**: NO rebalancing suggestions

```javascript
function generateConsolidatedReport(portfolioIds, reportDate) {
  const currentExchangeRate = getExchangeRate('USD', 'THB', reportDate);
  const allAssets = [];
  const portfolioSummaries = [];
  
  // Aggregate all assets from all portfolios
  portfolioIds.forEach(portfolioId => {
    const portfolio = getPortfolio(portfolioId);
    const assets = getPortfolioAssets(portfolioId);
    
    let portfolioCostBasis = 0;
    let portfolioCurrentValue = 0;
    
    assets.forEach(asset => {
      const valuation = generateAssetValuationReport(asset.id, reportDate);
      
      portfolioCostBasis += valuation.costBasis.amountTHB;
      portfolioCurrentValue += valuation.currentValue.amountTHB;
      
      allAssets.push({
        portfolioName: portfolio.name,
        portfolioId: portfolio.id,
        ...valuation
      });
    });
    
    portfolioSummaries.push({
      portfolioId: portfolioId,
      portfolioName: portfolio.name,
      costBasisTHB: portfolioCostBasis,
      currentValueTHB: portfolioCurrentValue,
      unrealizedGainTHB: portfolioCurrentValue - portfolioCostBasis
    });
  });
  
  // Calculate totals
  const totalCostBasis = allAssets.reduce((sum, a) => 
    sum + a.costBasis.amountTHB, 0
  );
  const totalCurrentValue = allAssets.reduce((sum, a) => 
    sum + a.currentValue.amountTHB, 0
  );
  
  // Calculate percentages
  allAssets.forEach(asset => {
    asset.percentOfTotalCost = (asset.costBasis.amountTHB / totalCostBasis) * 100;
    asset.percentOfTotalValue = (asset.currentValue.amountTHB / totalCurrentValue) * 100;
  });
  
  // Group by asset type
  const assetTypeSummary = groupAssetsByType(allAssets, totalCostBasis, totalCurrentValue);
  
  return {
    reportType: 'consolidated',
    reportDate: reportDate,
    exchangeRate: currentExchangeRate,
    portfolioCount: portfolioIds.length,
    assetCount: allAssets.length,
    totalCostBasisTHB: totalCostBasis,
    totalCurrentValueTHB: totalCurrentValue,
    totalUnrealizedGainTHB: totalCurrentValue - totalCostBasis,
    assets: allAssets,
    assetTypeSummary: assetTypeSummary,
    portfolioSummaries: portfolioSummaries
  };
}

function groupAssetsByType(assets, totalCostBasis, totalCurrentValue) {
  const groups = {};
  
  assets.forEach(asset => {
    const type = asset.assetType;
    if (!groups[type]) {
      groups[type] = {
        costBasisTHB: 0,
        currentValueTHB: 0,
        count: 0
      };
    }
    groups[type].costBasisTHB += asset.costBasis.amountTHB;
    groups[type].currentValueTHB += asset.currentValue.amountTHB;
    groups[type].count++;
  });
  
  // Calculate percentages
  Object.keys(groups).forEach(type => {
    groups[type].percentOfTotalCost = 
      (groups[type].costBasisTHB / totalCostBasis) * 100;
    groups[type].percentOfTotalValue = 
      (groups[type].currentValueTHB / totalCurrentValue) * 100;
  });
  
  return groups;
}
```

#### 2.9.12 Report Selection Interface

**Functional Requirements:**
- **FR-9.50**: Allow user to select one or more portfolios for reporting
- **FR-9.51**: If 1 portfolio selected → Generate single portfolio report
- **FR-9.52**: If 2+ portfolios selected → Generate consolidated report
- **FR-9.53**: Display report type indicator
- **FR-9.54**: Provide export to Excel option

```javascript
function generateReport(selectedPortfolioIds, reportDate) {
  if (selectedPortfolioIds.length === 1) {
    // Single portfolio - full analysis with allocation comparison
    return generateSinglePortfolioReport(selectedPortfolioIds[0], reportDate);
  } else if (selectedPortfolioIds.length > 1) {
    // Multi-portfolio - consolidated view without allocation analysis
    return generateConsolidatedReport(selectedPortfolioIds, reportDate);
  } else {
    throw new Error('No portfolios selected');
  }
}
```

#### 2.9.13 Actual CAGR Performance Tracking

**Functional Requirements:**
- **FR-9.28**: Calculate actual CAGR for each asset based on investment performance
- **FR-9.29**: Compare actual CAGR vs planned CAGR (expected return set at portfolio creation)
- **FR-9.30**: Display CAGR deviation with color-coded warnings:
  - Green: Deviation < 2%
  - Yellow: Deviation 2-5%
  - Red: Deviation > 5%
- **FR-9.31**: Show investment period (years) for each asset
- **FR-9.32**: Calculate portfolio-level actual CAGR
- **FR-9.33**: For USD assets, show both USD CAGR and THB CAGR
- **FR-9.34**: Include CAGR analysis in single portfolio reports

**Business Rationale:**
Track how well investments are actually performing compared to initial expectations. This helps investors understand if their asset selections are meeting targets and whether portfolio adjustments are needed.

**CAGR Calculation Methods:**

```javascript
// Simple CAGR (for single purchase)
function calculateSimpleCAGR(initialValue, currentValue, years) {
  return (Math.pow(currentValue / initialValue, 1 / years) - 1) * 100;
}

// Time-weighted CAGR (for multiple purchases - DCA scenarios)
function calculateTimeWeightedCAGR(transactions, currentValue, reportDate) {
  // Use IRR (Internal Rate of Return) method for accuracy with DCA
  const cashFlows = [];
  
  // Add all purchases as negative cash flows
  transactions.forEach(tx => {
    if (tx.type === 'BUY') {
      const daysSincePurchase = calculateDaysBetween(tx.date, reportDate);
      cashFlows.push({
        amount: -tx.amount,
        date: tx.date,
        years: daysSincePurchase / 365
      });
    }
  });
  
  // Add current value as positive cash flow
  cashFlows.push({
    amount: currentValue,
    date: reportDate,
    years: 0
  });
  
  // Calculate IRR using Newton-Raphson method
  return calculateIRR(cashFlows);
}

// Asset CAGR calculation
function calculateAssetCAGR(assetId, reportDate) {
  const asset = getAsset(assetId);
  const transactions = getAssetTransactions(assetId);
  
  // Get first investment date
  const firstTransaction = transactions
    .filter(t => t.type === 'BUY')
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  
  if (!firstTransaction) {
    return null; // No transactions yet
  }
  
  const investmentYears = calculateYearsBetween(firstTransaction.date, reportDate);
  
  if (investmentYears < 0.1) {
    return null; // Too early to calculate meaningful CAGR
  }
  
  // For THB assets
  if (asset.currency === 'THB') {
    const totalCost = asset.totalCostTHB;
    const currentValue = asset.currentValueTHB;
    
    if (transactions.length === 1) {
      // Single purchase - use simple CAGR
      return calculateSimpleCAGR(totalCost, currentValue, investmentYears);
    } else {
      // Multiple purchases - use time-weighted return (IRR)
      return calculateTimeWeightedCAGR(transactions, currentValue, reportDate);
    }
  }
  
  // For USD assets
  if (asset.currency === 'USD') {
    const totalCostUSD = asset.totalCostUSD;
    const currentValueUSD = asset.currentValueUSD;
    const totalCostTHB = asset.totalCostTHB;
    const currentRate = getExchangeRate('USD', 'THB', reportDate);
    const currentValueTHB = currentValueUSD * currentRate;
    
    return {
      cagrUSD: transactions.length === 1 
        ? calculateSimpleCAGR(totalCostUSD, currentValueUSD, investmentYears)
        : calculateTimeWeightedCAGR(transactions, currentValueUSD, reportDate),
      cagrTHB: transactions.length === 1
        ? calculateSimpleCAGR(totalCostTHB, currentValueTHB, investmentYears)
        : calculateTimeWeightedCAGR(
            transactions.map(t => ({...t, amount: t.amountTHB})), 
            currentValueTHB, 
            reportDate
          ),
      investmentYears: investmentYears
    };
  }
}
```

**CAGR Comparison and Warning System:**

```javascript
function generateCAGRAnalysis(assetId, reportDate) {
  const asset = getAsset(assetId);
  const actualCAGR = calculateAssetCAGR(assetId, reportDate);
  const plannedCAGR = asset.expectedReturn; // From portfolio creation
  
  if (!actualCAGR) {
    return {
      status: 'insufficient_data',
      message: 'Not enough data to calculate CAGR'
    };
  }
  
  let cagrData;
  if (asset.currency === 'THB') {
    cagrData = {
      planned: plannedCAGR,
      actual: actualCAGR,
      deviation: actualCAGR - plannedCAGR,
      deviationAbs: Math.abs(actualCAGR - plannedCAGR)
    };
  } else {
    // USD assets - show both
    cagrData = {
      planned: plannedCAGR,
      actualUSD: actualCAGR.cagrUSD,
      actualTHB: actualCAGR.cagrTHB,
      deviationUSD: actualCAGR.cagrUSD - plannedCAGR,
      deviationTHB: actualCAGR.cagrTHB - plannedCAGR,
      deviationAbsUSD: Math.abs(actualCAGR.cagrUSD - plannedCAGR),
      deviationAbsTHB: Math.abs(actualCAGR.cagrTHB - plannedCAGR),
      investmentYears: actualCAGR.investmentYears
    };
  }
  
  // Determine warning level based on deviation
  const deviation = asset.currency === 'THB' 
    ? cagrData.deviationAbs 
    : cagrData.deviationAbsUSD; // Use USD for USD assets
  
  let warningLevel, warningMessage, statusIcon;
  if (deviation < 2) {
    warningLevel = 'green';
    statusIcon = '🟢';
    warningMessage = 'Performance on track';
  } else if (deviation < 5) {
    warningLevel = 'yellow';
    statusIcon = '🟡';
    warningMessage = 'Moderate deviation from plan';
  } else {
    warningLevel = 'red';
    statusIcon = '🔴';
    warningMessage = 'Significant deviation from plan';
  }
  
  return {
    ...cagrData,
    warningLevel: warningLevel,
    warningMessage: warningMessage,
    statusIcon: statusIcon,
    investmentPeriod: actualCAGR.investmentYears || 
                     calculateYearsBetween(
                       getFirstTransactionDate(assetId), 
                       reportDate
                     )
  };
}
```

**Portfolio-Level CAGR Calculation:**

```javascript
function calculatePortfolioCAGR(portfolioId, reportDate) {
  const portfolio = getPortfolio(portfolioId);
  const assets = portfolio.assets;
  
  let totalCostTHB = 0;
  let totalCurrentValueTHB = 0;
  let weightedPlannedCAGR = 0;
  
  const assetCAGRs = [];
  
  assets.forEach(asset => {
    const assetAnalysis = generateCAGRAnalysis(asset.id, reportDate);
    const assetValue = getAssetValue(asset.id);
    
    totalCostTHB += assetValue.costBasisTHB;
    totalCurrentValueTHB += assetValue.currentValueTHB;
    
    // Weighted planned CAGR
    weightedPlannedCAGR += (asset.allocation / 100) * asset.expectedReturn;
    
    assetCAGRs.push({
      assetName: asset.name,
      assetId: asset.id,
      ...assetAnalysis
    });
  });
  
  // Get first transaction date across all assets
  const firstTransactionDate = getPortfolioFirstTransactionDate(portfolioId);
  const investmentYears = calculateYearsBetween(firstTransactionDate, reportDate);
  
  // Calculate actual portfolio CAGR
  const actualPortfolioCAGR = calculateSimpleCAGR(
    totalCostTHB,
    totalCurrentValueTHB,
    investmentYears
  );
  
  const deviation = Math.abs(actualPortfolioCAGR - weightedPlannedCAGR);
  
  let portfolioStatus, portfolioIcon, portfolioMessage;
  if (deviation < 2) {
    portfolioStatus = 'green';
    portfolioIcon = '🟢';
    portfolioMessage = 'Portfolio performing as expected';
  } else if (deviation < 5) {
    portfolioStatus = 'yellow';
    portfolioIcon = '🟡';
    portfolioMessage = 'Portfolio moderately off target';
  } else {
    portfolioStatus = 'red';
    portfolioIcon = '🔴';
    portfolioMessage = 'Portfolio significantly off target';
  }
  
  return {
    portfolioName: portfolio.name,
    plannedCAGR: weightedPlannedCAGR,
    actualCAGR: actualPortfolioCAGR,
    deviation: actualPortfolioCAGR - weightedPlannedCAGR,
    deviationAbs: deviation,
    warningLevel: portfolioStatus,
    warningMessage: portfolioMessage,
    statusIcon: portfolioIcon,
    investmentPeriod: investmentYears,
    totalCostTHB: totalCostTHB,
    totalCurrentValueTHB: totalCurrentValueTHB,
    assetBreakdown: assetCAGRs
  };
}
```

**Report Display Format:**

```javascript
function generateCAGRReport(portfolioId, reportDate) {
  const cagrAnalysis = calculatePortfolioCAGR(portfolioId, reportDate);
  
  return {
    reportType: 'cagr_performance',
    reportDate: reportDate,
    
    // Portfolio-level summary
    portfolio: {
      name: cagrAnalysis.portfolioName,
      investmentPeriod: cagrAnalysis.investmentPeriod.toFixed(2) + ' years',
      plannedCAGR: cagrAnalysis.plannedCAGR.toFixed(2) + '%',
      actualCAGR: cagrAnalysis.actualCAGR.toFixed(2) + '%',
      deviation: cagrAnalysis.deviation.toFixed(2) + '%',
      status: cagrAnalysis.statusIcon + ' ' + cagrAnalysis.warningMessage
    },
    
    // Per-asset breakdown
    assets: cagrAnalysis.assetBreakdown.map(asset => {
      if (asset.status === 'insufficient_data') {
        return {
          name: asset.assetName,
          status: 'Insufficient data',
          message: 'Investment too recent for CAGR calculation'
        };
      }
      
      // THB asset
      if (!asset.actualUSD) {
        return {
          name: asset.assetName,
          investmentPeriod: asset.investmentPeriod.toFixed(2) + ' years',
          plannedCAGR: asset.planned.toFixed(2) + '%',
          actualCAGR: asset.actual.toFixed(2) + '%',
          deviation: asset.deviation.toFixed(2) + '%',
          status: asset.statusIcon + ' ' + asset.warningMessage
        };
      }
      
      // USD asset (show both USD and THB CAGR)
      return {
        name: asset.assetName,
        investmentPeriod: asset.investmentPeriod.toFixed(2) + ' years',
        plannedCAGR: asset.planned.toFixed(2) + '%',
        actualCAGR_USD: asset.actualUSD.toFixed(2) + '%',
        actualCAGR_THB: asset.actualTHB.toFixed(2) + '%',
        deviationUSD: asset.deviationUSD.toFixed(2) + '%',
        deviationTHB: asset.deviationTHB.toFixed(2) + '%',
        status: asset.statusIcon + ' ' + asset.warningMessage,
        note: 'THB CAGR includes currency impact'
      };
    })
  };
}
```

**Example Report Output:**

```
═══════════════════════════════════════════════════
PORTFOLIO CAGR PERFORMANCE ANALYSIS
Portfolio: Retirement Fund
Report Date: 2026-02-28
═══════════════════════════════════════════════════

PORTFOLIO SUMMARY
Investment Period: 2.50 years
Planned CAGR: 8.23%
Actual CAGR: 9.15%
Deviation: +0.92%
Status: 🟢 Portfolio performing as expected

ASSET BREAKDOWN
┌──────────────┬──────────┬──────────┬────────────┬───────────┐
│ Asset        │ Period   │ Planned  │ Actual     │ Status    │
├──────────────┼──────────┼──────────┼────────────┼───────────┤
│ VOO Stock    │ 2.5 yrs  │ 8.5%     │ 10.2% USD  │ 🟢 +1.7%  │
│              │          │          │ 11.8% THB  │           │
├──────────────┼──────────┼──────────┼────────────┼───────────┤
│ SCBSEMI Fund │ 1.8 yrs  │ 6.0%     │ 2.5%       │ 🔴 -3.5%  │
├──────────────┼──────────┼──────────┼────────────┼───────────┤
│ THB Savings  │ 2.5 yrs  │ 1.2%     │ 1.2%       │ 🟢 0.0%   │
├──────────────┼──────────┼──────────┼────────────┼───────────┤
│ Bitcoin      │ 0.8 yrs  │ 15.0%    │ 42.5%      │ 🔴 +27.5% │
└──────────────┴──────────┴──────────┴────────────┴───────────┘

INSIGHTS:
• VOO outperforming plan - strong US market performance
• SCBSEMI underperforming - consider reviewing allocation
• Bitcoin high variance expected for volatile asset
• Overall portfolio +0.92% above target - excellent!
```

**Integration with Single Portfolio Report:**

```javascript
function generateEnhancedSinglePortfolioReport(portfolioId, reportDate) {
  // Get existing report components
  const baseReport = generateSinglePortfolioReport(portfolioId, reportDate);
  const cagrReport = generateCAGRReport(portfolioId, reportDate);
  
  // Merge CAGR analysis into assets
  baseReport.assets.forEach(asset => {
    const cagrData = cagrReport.assets.find(c => c.name === asset.assetName);
    asset.performanceAnalysis = cagrData;
  });
  
  // Add portfolio-level CAGR summary
  baseReport.portfolioPerformance = cagrReport.portfolio;
  
  return baseReport;
}
```

---

### Feature 10: Excel Export

#### 2.10.1 Overview
Export portfolio data to Excel files for external analysis.

#### 2.10.2 Exportable Data Types
1. **Investment Transactions**
   - All transaction records with date, asset, amount, currency
   - Transaction history for selected periods

2. **Portfolio Allocation**
   - Portfolio structure with asset names
   - Target allocation percentages
   - Current allocation vs target comparison

3. **Investment Account**
   - Account balances (THB and USD)
   - Deposit/withdrawal history
   - Interest rate tiers and calculations

4. **Value Comparison**
   - Asset current values vs investment costs
   - Portfolio performance metrics
   - Allocation drift analysis

#### 2.10.3 Technical Implementation
- **FR-10.1**: Use SheetJS (xlsx.js) library for Excel generation
- **FR-10.2**: Export button on relevant screens/reports
- **FR-10.3**: Support both .xlsx and .csv formats
- **FR-10.4**: Include proper formatting (headers, number formats, dates)
- **FR-10.5**: Filename with timestamp for exported files

---

### Feature 11: Monte Carlo Simulation

#### 2.11.1 Overview
Test investment allocation strategies by simulating possible future outcomes.

#### 2.11.2 Functional Requirements
- **FR-11.1**: Run Monte Carlo simulations (10,000+ iterations)
- **FR-11.2**: Use historical return data and volatility for each asset
- **FR-11.3**: Project outcomes over different time horizons (1, 5, 10, 20 years)
- **FR-11.4**: Display probability distributions
- **FR-11.5**: Show confidence intervals (10th, 50th, 90th percentiles)
- **FR-11.6**: Calculate probability of achieving target returns
- **FR-11.7**: Calculate probability of losses
- **FR-11.8**: Show best case, worst case, and median scenarios
- **FR-11.9**: Calculate Value at Risk (VaR)
- **FR-11.10**: Visualize histogram/distribution charts
- **FR-11.11**: Display probability curves
- **FR-11.12**: Generate scenario comparison charts

#### 2.11.3 Technical Implementation
- JavaScript-based Monte Carlo algorithm
- Random number generation using normal distribution
- Chart visualization using Chart.js
- Configurable simulation parameters:
  - Number of runs
  - Time horizon
  - Expected returns
  - Volatility (standard deviation)
  - Correlation between assets

---

### Feature 12: Local Password Protection

#### 2.12.1 Overview
Protect portfolio data with password authentication stored locally without requiring a backend server or database. This provides security against unauthorized access on shared computers while maintaining the simplicity of a client-side application with cloud storage sync.

#### 2.12.2 Master Password Setup

**Functional Requirements:**
- **FR-12.1**: First-time setup wizard to create master password on initial app launch
- **FR-12.2**: Password strength validation (minimum 8 characters recommended)
- **FR-12.3**: Password confirmation field to prevent typos
- **FR-12.4**: Optional password hint (stored unencrypted in localStorage)
- **FR-12.5**: Encrypt password with SHA-256 hash and store in localStorage
- **FR-12.6**: Cannot bypass or reset password without data loss warning
- **FR-12.7**: Display security warning about localStorage limitations

#### 2.12.3 Login Screen

**Functional Requirements:**
- **FR-12.8**: Password input required on every app launch
- **FR-12.9**: "Show password" toggle button
- **FR-12.10**: "Remember for 7 days" option (encrypted token in localStorage)
- **FR-12.11**: Failed attempt counter (maximum 5 attempts)
- **FR-12.12**: 5-minute lockout after maximum failed attempts
- **FR-12.13**: Display password hint option after 3 failed attempts
- **FR-12.14**: Clear, prominent error messages for incorrect passwords
- **FR-12.15**: Auto-focus on password input for quick entry

**UI Implementation:**
```html
<div class="login-container">
  <div class="login-card">
    <h1>Portfolio Manager</h1>
    <p>Enter your password to continue</p>
    
    <input 
      type="password" 
      id="passwordInput" 
      placeholder="Password"
      autofocus
    />
    
    <div class="checkbox-container">
      <input type="checkbox" id="rememberMe" />
      <label for="rememberMe">Remember for 7 days</label>
    </div>
    
    <button class="login-button" onclick="attemptLogin()">
      Unlock
    </button>
    
    <p id="errorMessage" class="error-message"></p>
    <a href="#" id="showHint" style="display:none;">Show password hint</a>
  </div>
</div>
```

#### 2.12.4 Session Management

**Functional Requirements:**
- **FR-12.16**: Session active while app is open in browser tab
- **FR-12.17**: Auto-lock after 15 minutes of user inactivity
- **FR-12.18**: Activity detection via mouse movement, keyboard input, touch events
- **FR-12.19**: Manual lock button in application header
- **FR-12.20**: Session expires immediately on browser close (unless "remember me" active)
- **FR-12.21**: Warning notification 1 minute before auto-lock
- **FR-12.22**: Preserve unsaved work before locking
- **FR-12.23**: Return to login screen on session expiration

**Session Implementation:**
```javascript
class SessionManager {
  constructor() {
    this.sessionTimeout = 15 * 60 * 1000; // 15 minutes
    this.warningTimeout = 14 * 60 * 1000; // 14 minutes (1 min warning)
    this.activityTimer = null;
    this.warningTimer = null;
    this.isLocked = true;
  }
  
  login(password) {
    const storedHash = localStorage.getItem('masterPasswordHash');
    const inputHash = this.hashPassword(password);
    
    if (storedHash === inputHash) {
      this.isLocked = false;
      sessionStorage.setItem('sessionActive', 'true');
      sessionStorage.setItem('sessionStart', Date.now());
      this.startActivityTimer();
      return true;
    }
    
    // Track failed attempts
    this.incrementFailedAttempts();
    return false;
  }
  
  hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
  }
  
  startActivityTimer() {
    this.resetActivityTimer();
    
    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, () => this.resetActivityTimer(), { passive: true });
    });
  }
  
  resetActivityTimer() {
    // Clear existing timers
    clearTimeout(this.activityTimer);
    clearTimeout(this.warningTimer);
    
    // Set warning timer (1 minute before lock)
    this.warningTimer = setTimeout(() => {
      this.showLockWarning();
    }, this.warningTimeout);
    
    // Set lock timer
    this.activityTimer = setTimeout(() => {
      this.lock();
    }, this.sessionTimeout);
  }
  
  showLockWarning() {
    const notification = document.createElement('div');
    notification.className = 'lock-warning';
    notification.innerHTML = `
      <p>⚠️ Your session will lock in 1 minute due to inactivity.</p>
      <button onclick="sessionManager.dismissWarning()">Stay Active</button>
    `;
    document.body.appendChild(notification);
  }
  
  dismissWarning() {
    const warning = document.querySelector('.lock-warning');
    if (warning) warning.remove();
    this.resetActivityTimer();
  }
  
  lock() {
    this.isLocked = true;
    sessionStorage.removeItem('sessionActive');
    
    // Save any unsaved work
    this.saveUnsavedWork();
    
    // Show login screen
    this.showLoginModal();
  }
  
  manualLock() {
    // User explicitly clicked lock button
    clearTimeout(this.activityTimer);
    clearTimeout(this.warningTimer);
    this.lock();
  }
  
  isSessionActive() {
    // Check remember me token
    const rememberToken = localStorage.getItem('rememberMeToken');
    const rememberExpiry = localStorage.getItem('rememberMeExpiry');
    
    if (rememberToken && rememberExpiry) {
      if (Date.now() < parseInt(rememberExpiry)) {
        return true; // Valid remember me token
      } else {
        // Token expired, clear it
        localStorage.removeItem('rememberMeToken');
        localStorage.removeItem('rememberMeExpiry');
      }
    }
    
    return sessionStorage.getItem('sessionActive') === 'true' && !this.isLocked;
  }
  
  incrementFailedAttempts() {
    const attempts = parseInt(localStorage.getItem('failedLoginAttempts') || '0');
    const newAttempts = attempts + 1;
    localStorage.setItem('failedLoginAttempts', newAttempts);
    localStorage.setItem('lastFailedAttempt', Date.now());
    
    if (newAttempts >= 5) {
      this.lockoutUser();
    }
    
    return newAttempts;
  }
  
  lockoutUser() {
    const lockoutUntil = Date.now() + (5 * 60 * 1000); // 5 minutes
    localStorage.setItem('lockoutUntil', lockoutUntil);
    this.showLockoutMessage();
  }
  
  isLockedOut() {
    const lockoutUntil = localStorage.getItem('lockoutUntil');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      return true;
    }
    // Lockout expired, clear failed attempts
    localStorage.removeItem('lockoutUntil');
    localStorage.removeItem('failedLoginAttempts');
    return false;
  }
  
  resetFailedAttempts() {
    localStorage.removeItem('failedLoginAttempts');
    localStorage.removeItem('lastFailedAttempt');
  }
}

// Global session manager instance
const sessionManager = new SessionManager();
```

#### 2.12.5 Password Change

**Functional Requirements:**
- **FR-12.24**: Change password option in Settings menu
- **FR-12.25**: Require current password to authorize change
- **FR-12.26**: New password validation (strength requirements)
- **FR-12.27**: Confirmation of new password
- **FR-12.28**: Update password hash in localStorage
- **FR-12.29**: Optional: Update password hint
- **FR-12.30**: Success confirmation message
- **FR-12.31**: Automatic re-login after password change

#### 2.12.6 Multi-Profile Support (Optional)

**Functional Requirements:**
- **FR-12.32**: Create multiple user profiles (e.g., "Personal", "Business", "Family")
- **FR-12.33**: Each profile has its own password
- **FR-12.34**: Each profile links to different cloud storage folder
- **FR-12.35**: Profile switcher on login screen
- **FR-12.36**: Each profile's data completely isolated
- **FR-12.37**: Profile selection before password entry
- **FR-12.38**: Visual profile indicator after login
- **FR-12.39**: Quick profile switch option (requires re-authentication)

**Profile Data Structure:**
```javascript
{
  "profiles": [
    {
      "id": "profile_001",
      "name": "Personal",
      "passwordHash": "sha256_hash_here",
      "passwordHint": "My first car",
      "cloudFolderPath": "/Google Drive/Portfolio_Personal",
      "createdDate": "2026-01-15",
      "lastAccess": "2026-02-28"
    },
    {
      "id": "profile_002",
      "name": "Business",
      "passwordHash": "sha256_hash_here",
      "passwordHint": "Company name + year",
      "cloudFolderPath": "/Google Drive/Portfolio_Business",
      "createdDate": "2026-02-01",
      "lastAccess": "2026-02-27"
    }
  ],
  "activeProfile": "profile_001"
}
```

#### 2.12.7 Security Best Practices

**Implementation Guidelines:**
- **Password Storage**: Never store plain text passwords
- **Hashing Algorithm**: Use SHA-256 (via CryptoJS library)
- **Salt**: Consider adding user-specific salt for additional security
- **Session Tokens**: Use cryptographically secure random tokens
- **Remember Me**: Encrypt remember-me tokens with expiry
- **localStorage Limitations**: Warn users that localStorage is not encrypted at OS level
- **Recommendations**:
  - Use strong, unique password
  - Don't share computer while logged in
  - Lock manually when stepping away
  - Regular password changes (optional reminder)
  - Backup data before password changes

**Security Warning Display:**
```javascript
function showSecurityWarning() {
  return `
    <div class="security-notice">
      <h3>⚠️ Security Notice</h3>
      <p>Your password protects access to the application, but data is 
      stored locally in your browser. For maximum security:</p>
      <ul>
        <li>Use a strong, unique password</li>
        <li>Don't use this on shared/public computers</li>
        <li>Enable device-level encryption (FileVault, BitLocker)</li>
        <li>Lock application when stepping away</li>
        <li>Backup your data regularly</li>
      </ul>
    </div>
  `;
}
```

#### 2.12.8 Password Reset / Recovery

**Functional Requirements:**
- **FR-12.40**: No password recovery mechanism (by design)
- **FR-12.41**: Clear warning during setup: "Lost password = lost data"
- **FR-12.42**: Password hint as only recovery aid
- **FR-12.43**: Factory reset option (deletes all data)
- **FR-12.44**: Export data before reset strongly recommended
- **FR-12.45**: Multi-step confirmation for factory reset

**Factory Reset Implementation:**
```javascript
function factoryReset() {
  const confirmation = confirm(
    "⚠️ WARNING: This will delete ALL data including:\n" +
    "- All portfolios\n" +
    "- All transactions\n" +
    "- All account information\n" +
    "- Password and settings\n\n" +
    "This action CANNOT be undone!\n\n" +
    "Have you backed up your data?"
  );
  
  if (!confirmation) return;
  
  const finalConfirm = prompt(
    'Type "DELETE ALL DATA" to confirm factory reset:'
  );
  
  if (finalConfirm === "DELETE ALL DATA") {
    // Clear all localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reload app
    window.location.reload();
  }
}
```

#### 2.12.9 Integration with Cloud Storage

**Functional Requirements:**
- **FR-12.46**: Password protects application access only
- **FR-12.47**: Cloud storage files remain unencrypted JSON
- **FR-12.48**: Cloud sync continues working with password protection
- **FR-12.49**: Multi-device usage requires same password on each device
- **FR-12.50**: Each device can have different password (but less convenient)
- **FR-12.51**: Password stored per-device in localStorage
- **FR-12.52**: Cloud folder selection persists across sessions

**Usage Flow:**
1. Device 1: Set password, select cloud folder
2. Cloud syncs JSON files automatically
3. Device 2: Set same password, select SAME cloud folder
4. Both devices access same data with same password

**Alternative:** Different passwords per device (data isolation)
- Device 1: Password A, Cloud Folder A
- Device 2: Password B, Cloud Folder B
- Separate portfolios, separate data

---

## 3. Data Models & Storage

### 3.1 Local Storage Schema

All data persists in browser Local Storage with the following structure:

**Portfolios:**
```javascript
{
  "portfolios": [{
    "id": "string",
    "name": "string",
    "createdDate": "date",
    "assets": [{
      "id": "string",
      "name": "string",
      "type": "string",
      "ticker": "string",
      "allocation": "number",
      "riskLevel": "string",
      "currency": "string",
      "expectedReturn": "number",
      "returnSource": "string",
      "returnDate": "date",
      "returnTimeframe": "string"
    }],
    "totalAllocation": "number",
    "weightedReturn": "number"
  }]
}
```

**Accounts:**
```javascript
{
  "accounts": [{
    "id": "string",
    "type": "string",
    "balance": "number",
    "interestRates": [{
      "year": "number",
      "tiers": [{
        "minBalance": "number",
        "maxBalance": "number",
        "rate": "number"
      }]
    }]
  }]
}
```

**Investment Plans:**
```javascript
{
  "investmentPlans": [{
    "id": "string",
    "portfolioId": "string",
    "type": "string",
    "monthlyAmount": "number",
    "currency": "string",
    "investmentDate": "number",
    "startDate": "date",
    "years": "number",
    "expectedReturn": "number",
    "targetAmount": "number",
    "projections": [{
      "year": "number",
      "invested": "number",
      "value": "number",
      "return": "number"
    }]
  }]
}
```

**Investments (Transactions):**
```javascript
{
  "investments": [{
    "id": "string",
    "portfolioId": "string",
    "assetId": "string",
    "assetName": "string",
    "transactionType": "string",
    "date": "date",
    "amount": "number",
    "currency": "string",
    "pricePerUnit": "number",
    "units": "number",
    "accountId": "string",
    "withdrawalId": "string",
    "thbEquivalent": "number",
    "conversionRate": "number",
    "fees": "number",
    "notes": "string"
  }]
}
```

**Deposits:**
```javascript
{
  "deposits": [{
    "id": "string",
    "accountType": "string",
    "amount": "number",
    "currency": "string",
    "date": "date",
    "conversionRate": "number",
    "thbEquivalent": "number"
  }]
}
```

**Asset Prices:**
```javascript
{
  "assetPrices": [{
    "id": "string",
    "assetId": "string",
    "assetName": "string",
    "price": "number",
    "currency": "string",
    "date": "date",
    "timestamp": "datetime",
    "source": "string",
    "changeAmount": "number",
    "changePercent": "number",
    "previousPrice": "number"
  }]
}
```

**Positions:**
```javascript
{
  "positions": [{
    "portfolioId": "string",
    "assetId": "string",
    "totalUnits": "number",
    "totalCost": "number",
    "averageCost": "number",
    "transactions": ["string"]
  }]
}
```

---

## 4. User Interface Requirements

### 4.1 Design Theme: Modern Apple-Inspired

#### 4.1.1 Design Philosophy
The application follows Apple's design principles: minimalism, clarity, and attention to detail. The interface prioritizes content over chrome, with generous white space, clear typography, and subtle animations.

#### 4.1.2 Color Palette
```css
/* Primary Colors */
--color-primary-black: #000000;
--color-primary-dark: #1D1D1F;
--color-accent-blue: #0071E3;

/* Status Colors */
--color-success: #34C759;
--color-warning: #FF9F0A;
--color-danger: #FF3B30;

/* Neutral Colors */
--color-background-light: #FFFFFF;
--color-background-gray: #F5F5F7;
--color-text-primary: #1D1D1F;
--color-text-secondary: #6E6E73;
--color-border-light: #D2D2D7;
--color-border: #E5E5E7;
```

#### 4.1.3 Typography
```css
/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif;

/* Type Scale */
--font-size-h1: 48px;      /* font-weight: 700; */
--font-size-h2: 36px;      /* font-weight: 600; */
--font-size-h3: 24px;      /* font-weight: 600; */
--font-size-h4: 20px;      /* font-weight: 600; */
--font-size-body: 16px;    /* font-weight: 400; */
--font-size-small: 14px;   /* font-weight: 400; */
--font-size-tiny: 12px;    /* font-weight: 400; */

/* Line Heights */
--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

#### 4.1.4 Component Styling

**Buttons:**
```css
/* Primary Button */
.btn-primary {
  background: #0071E3;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-primary:hover {
  background: #0077ED;
}

/* Secondary Button */
.btn-secondary {
  background: #F5F5F7;
  color: #1D1D1F;
  border: 1px solid #D2D2D7;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #E8E8ED;
}
```

**Cards:**
```css
.card {
  background: white;
  border: 1px solid #E5E5E7;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
```

**Input Fields:**
```css
.input-field {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px; /* Prevent zoom on iOS */
  border: 1px solid #D2D2D7;
  border-radius: 8px;
  background: white;
  transition: border-color 0.3s ease;
}

.input-field:focus {
  outline: none;
  border-color: #0071E3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
}

.input-field::placeholder {
  color: #86868B;
}
```

**Form Labels:**
```css
.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1D1D1F;
  margin-bottom: 8px;
}
```

#### 4.1.5 Layout & Spacing

**Spacing Scale:**
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
```

**Container:**
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
}
```

#### 4.1.6 Shadows & Depth
```css
/* Subtle shadows for depth */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);
--shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.12);
```

#### 4.1.7 Transitions & Animations
```css
/* Standard easing */
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-accelerate: cubic-bezier(0.4, 0.0, 1, 1);

/* Animation durations */
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;

/* Standard transition */
transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
```

#### 4.1.8 Icons & Visual Elements

**Icon Style:**
- Use SF Symbols-style icons or Heroicons
- 24px default size
- Consistent 2px stroke width
- Subtle hover states

**Borders & Radius:**
```css
--border-radius-sm: 6px;
--border-radius-md: 8px;
--border-radius-lg: 12px;
--border-radius-xl: 16px;
--border-radius-full: 9999px;
```

#### 4.1.9 Status Indicators
```css
/* Success */
.status-success {
  color: #34C759;
  background: rgba(52, 199, 89, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

/* Warning */
.status-warning {
  color: #FF9F0A;
  background: rgba(255, 159, 10, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

/* Error */
.status-error {
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}
```

#### 4.1.10 Data Visualization

**Chart Colors (for Chart.js):**
```javascript
const chartColors = {
  primary: '#0071E3',
  success: '#34C759',
  warning: '#FF9F0A',
  danger: '#FF3B30',
  purple: '#AF52DE',
  pink: '#FF2D55',
  orange: '#FF9500',
  teal: '#5AC8FA',
  indigo: '#5856D6',
  gray: '#8E8E93'
};
```

#### 4.1.11 Responsive Design Principles
- Mobile-first approach
- Touch-friendly targets (minimum 44px)
- Readable font sizes (minimum 16px for inputs on mobile)
- Generous spacing on mobile
- Simplified layouts for small screens
- Progressive enhancement for larger screens

#### 4.1.12 Accessibility
- WCAG 2.1 AA compliance
- Color contrast ratios: 4.5:1 for normal text, 3:1 for large text
- Focus indicators visible (blue outline)
- Keyboard navigation support
- Screen reader friendly labels
- Skip links for main content

### 4.2 Design Principles
- **Minimal Theme**: Clean, simple interface with focus on content
- **Responsive Design**: Mobile-first approach, works on all devices
- **Fast Loading**: Page loads under 2 seconds
- **Intuitive Navigation**: Clear information hierarchy
- **Touch-Friendly**: Optimized for mobile touch interactions

### 4.2 Key Screens

1. **Dashboard**
   - Portfolio summary cards
   - Total portfolio value display
   - Daily/monthly/yearly returns
   - Asset allocation pie chart
   - Quick action buttons

2. **Portfolio Management**
   - Create/edit portfolio interface
   - Asset selection and search
   - Allocation percentage sliders/inputs
   - Risk distribution visualization
   - Save/cancel buttons

3. **Investment Planning**
   - DCA calculator
   - Lump sum calculator
   - Goal planning wizard
   - Year-by-year projection table
   - Target amount calculator
   - Investment distribution breakdown

4. **Account Management**
   - Account balance cards (THB/USD)
   - Deposit form
   - Withdrawal history list
   - Interest rate tier configuration
   - Transaction history table

5. **Investment Transactions**
   - Transaction entry form
   - Portfolio and asset dropdowns
   - Date picker
   - Amount input with currency
   - Transaction history table with filters

6. **Price Tracking**
   - Asset price list with last update times
   - "Update All Prices" button
   - Manual price entry modal
   - Price history chart
   - Price change indicators

7. **Reports & Analytics**
   - Performance line charts
   - Allocation analysis tables
   - Value comparison reports
   - Period selection controls
   - Export to Excel buttons

8. **Monte Carlo Simulation**
   - Parameter configuration form
   - Run simulation button
   - Results visualization
   - Probability distribution charts
   - Scenario analysis tables

### 4.3 Responsive Breakpoints
```css
/* Mobile First (default) */
.container { width: 100%; padding: 1rem; }

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container { max-width: 720px; margin: 0 auto; }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container { max-width: 960px; }
}

/* Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .container { max-width: 1200px; }
}
```

---

## 5. Technical Implementation Guidelines

### 5.1 Local Storage Management
```javascript
const STORAGE_KEYS = {
  PORTFOLIOS: 'portfolios',
  ACCOUNTS: 'accounts',
  INVESTMENTS: 'investments',
  DEPOSITS: 'deposits',
  PRICES: 'assetPrices',
  PLANS: 'investmentPlans',
  POSITIONS: 'positions',
  RATES: 'conversionRates'
};

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}
```

### 5.2 API Integration Best Practices
- Cache API responses to minimize requests
- Handle rate limits gracefully
- Provide fallback for API failures
- Show loading states during API calls
- Display user-friendly error messages
- Implement retry logic for failed requests
- Store API responses locally when appropriate

### 5.3 Chart Implementation
```javascript
function createAllocationChart(portfolio) {
  const ctx = document.getElementById('allocationChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: portfolio.assets.map(a => a.name),
      datasets: [{
        data: portfolio.assets.map(a => a.allocation),
        backgroundColor: generateColors(portfolio.assets.length)
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}
```

### 5.4 Excel Export Implementation
```javascript
function exportToExcel(data, filename) {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const file = `${filename}_${timestamp}.xlsx`;
  
  // Download file
  XLSX.writeFile(wb, file);
}
```

---

## 6. Business Rules

### 6.1 Portfolio Rules
- Total allocation must equal exactly 100%
- Minimum 1 asset per portfolio
- Asset names must be unique within portfolio
- Each asset must have allocation greater than 0%
- Cannot delete portfolio if it has active transactions

### 6.2 Investment Rules
- Cannot invest more than available account balance
- Transaction date cannot be a future date
- Investment amount must be positive
- Currency must match account type for withdrawal
- Must select valid portfolio and asset combination

### 6.3 Account Rules
- Maintain separate accounts for THB and USD
- Cannot withdraw more than available balance
- Interest rates must be non-negative
- Tier ranges must not overlap
- Cannot delete account with remaining balance

### 6.4 Price Rules
- Prices must be positive values
- Cannot set prices for future dates
- Price updates automatically mark previous price
- Historical prices are immutable once saved

---

## 7. Validation & Error Handling

### 7.1 Input Validation
- **Required Fields**: Must not be empty
- **Numbers**: Must be positive values
- **Percentages**: Must be in 0-100 range
- **Dates**: Must be valid format, not future (except planning)
- **Currencies**: Must be THB or USD only

### 7.2 Error Messages
- Use clear, user-friendly language
- Be specific about the error
- Suggest corrective action
- Display prominently but not intrusively
- Provide option to retry failed operations

### 7.3 Data Integrity
- Validate all data before saving to Local Storage
- Check referential integrity (e.g., asset exists in portfolio)
- Prevent duplicate entries with unique IDs
- Implement data backup/export functionality
- Regular validation of stored data on app startup

---

## 8. Performance Optimization

### 8.1 Optimization Strategies
- Lazy load data - only load what's needed
- Paginate large lists (transactions, history)
- Cache frequently accessed data in memory
- Minimize DOM manipulation
- Debounce user inputs (search, filters)
- Use event delegation for dynamic content

### 8.2 Storage Limits
- Monitor localStorage usage (5-10MB typical limit)
- Warn user at 80% capacity
- Provide data export before reaching limit
- Implement data archiving option
- Clear old/unused data periodically

---

## 9. Security Considerations

### 9.1 Data Protection
- All data stored locally in browser
- No server-side storage reduces exposure
- Recommend users backup data regularly
- Export functionality for data portability
- Clear data option for privacy

### 9.2 Input Sanitization
-