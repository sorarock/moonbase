# Excel Import Guide for Portfolio Manager

## Overview

This guide explains how to properly structure your Excel files for importing into the Portfolio Manager application. Following this structure ensures smooth imports without errors.

---

## 📋 Required Sheets

Your Excel file should contain the following sheets (in any order):

1. **Portfolios** - Portfolio definitions
2. **Portfolio Assets** - Asset definitions with allocations
3. **Accounts** - Account information
4. **Transactions** - Transaction history
5. **FIFO Lots** - (Optional) FIFO lot tracking
6. **FIFO Sales** - (Optional) Sales history

---

## 📊 Sheet Structures

### 1. Portfolios Sheet

Defines your portfolios.

**Required Columns:**
- `Portfolio Name` (text, unique) - Name of the portfolio
- `Description` (text, optional) - Portfolio description
- `Created Date` (date) - Creation date
- `Asset Count` (number) - Number of assets (for reference only)
- `Total Allocation %` (number) - Should be 100

**Example:**
```
Portfolio Name | Description      | Created Date | Asset Count | Total Allocation %
MoonShot       | My main portfolio| 3/3/2026     | 5           | 100
```

---

### 2. Portfolio Assets Sheet

Defines all assets within portfolios.

**Required Columns:**
- `Portfolio Name` (text) - Must match a portfolio name
- `Asset Name` (text) - Unique asset name within portfolio
- `Ticker` (text) - Asset ticker symbol
- `Type` (text) - Asset type: ETF, mutual_fund, stock, gold, fcd_account, thb_savings
- `Sub Type` (text, optional) - Additional categorization
- `Target Allocation %` (number) - Target allocation percentage (0-100)
- `Risk Level` (text) - low, medium, high
- `Currency` (text) - USD or THB
- `Platform` (text, optional) - Trading platform/broker
- `Notes` (text, optional) - Additional notes

**Example:**
```
Portfolio Name | Asset Name | Ticker | Type        | Sub Type | Target Allocation % | Risk Level | Currency | Platform | Notes
MoonShot       | NASDAQ     | QQQ    | etf         |          | 40                  | medium     | USD      | SCB      |
MoonShot       | WORLD      | WORLD  | mutual_fund |          | 40                  | medium     | THB      |          |
MoonShot       | GOLD       | GOLD   | gold        |          | 10                  | low        | USD      |          |
MoonShot       | FCD        | FCD    | fcd_account |          | 10                  | low        | USD      |          |
MoonShot       | THB        | THB    | thb_savings |          | 0                   | low        | THB      |          |
```

**Important Notes:**
- Savings accounts (fcd_account, thb_savings) can have 0% allocation
- Other asset types should have at least 0.01% allocation
- Total allocations don't need to equal 100% (it's a target)

---

### 3. Accounts Sheet

Defines bank/broker accounts.

**Required Columns:**
- `Portfolio` (text) - Must match a portfolio name
- `Account Name` (text) - Account name
- `Type` (text) - "THB Savings" or "FCD Account (USD)"
- `Currency` (text) - THB or USD
- `Balance` (number) - Current balance
- `Institution` (text, optional) - Bank/broker name
- `Account Number` (text, optional) - Account number
- `Created Date` (date) - Account creation date

**Example:**
```
Portfolio | Account Name        | Type              | Currency | Balance | Institution | Account Number | Created Date
MoonShot  | THB                 | THB Savings       | THB      | 770.00  |             |                | 3/3/2026
MoonShot  | FCD                 | FCD Account (USD) | USD      | 13.11   |             |                | 3/3/2026
```

---

### 4. Transactions Sheet

Transaction history - the core of your data.

**Required Columns:**
- `Date` (date) - Transaction date
- `Portfolio` (text) - Must match a portfolio name
- `Type` (text) - Transaction type (see below)
- `Asset` (text) - Asset name (use "N/A" for non-asset transactions)
- `Quantity` (number, optional) - For BUY/SELL transactions
- `Price/Unit` (number, optional) - For BUY/SELL transactions
- `Total Amount` (number) - Total transaction amount
- `Fee` (number) - Transaction fee (0 if none)
- `Currency` (text) - THB or USD
- `Exchange Rate` (number) - Exchange rate used (e.g., 31.1 for THB/USD)
- `Account` (text) - Account name or "Manual"
- `Notes` (text, optional) - Additional notes

**Transaction Types and Requirements:**

| Type | Asset Required? | Quantity Required? | Price Required? | Total Amount Required? | Account Required? |
|------|----------------|-------------------|-----------------|----------------------|------------------|
| **BUY** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **SELL** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **DIVIDEND** | ✅ Yes | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **DEPOSIT** | ❌ No (use N/A) | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **WITHDRAW** | ❌ No (use N/A) | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **TRANSFER** | ❌ No (use N/A) | ❌ No | ❌ No | ✅ Yes | ✅ Yes |

**Example:**
```
Date      | Portfolio | Type     | Asset  | Quantity | Price/Unit | Total Amount | Fee  | Currency | Exchange Rate | Account | Notes
4/8/2026  | MoonShot  | SELL     | GOLD   | 0.002    | 5400       | 10.80        | 0    | USD      | 31.1          | FCD     |
3/26/2026 | MoonShot  | BUY      | NASDAQ | 0.52     | 80         | 41.60        | 0    | USD      | 31.1          | FCD     |
3/24/2026 | MoonShot  | DIVIDEND | WORLD  |          |            | 20.00        | 0    | THB      | 1             | THB     |
3/12/2026 | MoonShot  | BUY      | WORLD  | 150      | 15         | 2250.00      | 0    | THB      | 1             | THB     |
3/3/2026  | MoonShot  | DEPOSIT  | N/A    |          |            | 5000.00      | 0    | THB      | 1             | THB     |
2/27/2026 | MoonShot  | BUY      | GOLD   | 0.004    | 5100       | 20.40        | 0    | USD      | 31.1          | FCD     |
2/23/2026 | MoonShot  | TRANSFER | N/A    |          |            | 1000.00      | 0    | THB      | 31.1          | THB     | THB→USD
2/20/2026 | MoonShot  | TRANSFER | N/A    |          |            | 1000.00      | 0    | THB      | 31.1          | THB     | THB→USD
```

**Important Notes About Exchange Rate:**
- For THB transactions, use `1` as the exchange rate
- For USD transactions, use the THB/USD rate (e.g., `31.1` means 1 USD = 31.1 THB)
- For TRANSFER transactions between currencies, use the conversion rate
- This rate is crucial for accurate cross-currency calculations

---

### 5. FIFO Lots Sheet (Optional)

FIFO lot tracking - usually rebuilt from transactions automatically.

**Required Columns:**
- `Portfolio` (text)
- `Asset ID` (text) - Internal asset ID or "USD_CURRENCY"
- `Purchase Date` (date)
- `Quantity` (number)
- `Remaining Qty` (number)
- `Price/Unit` (number)
- `Currency` (text)
- `Exchange Rate` (number)
- `Cost Basis (THB)` (number)
- `Status` (text) - OPEN or CLOSED
- `Created At` (date)

**Note:** This sheet is typically auto-generated. You can omit it unless you need to preserve specific FIFO tracking.

---

### 6. FIFO Sales Sheet (Optional)

Sales history - usually rebuilt from transactions automatically.

**Required Columns:**
- `Portfolio` (text)
- `Asset ID` (text)
- `Sale Date` (date)
- `Quantity Sold` (number)
- `Avg Purchase Price` (number)
- `Sale Price` (number)
- `Cost Basis (THB)` (number)
- `Proceeds (THB)` (number)
- `Realized Gain (THB)` (number)
- `Return %` (text)

**Note:** This sheet is typically auto-generated from SELL transactions.

---

## ⚠️ Common Import Issues

### Issue 1: "Transaction requires an asset name"
**Problem:** BUY, SELL, or DIVIDEND transaction has "N/A" or empty Asset field  
**Solution:** Provide the actual asset name that exists in Portfolio Assets sheet

### Issue 2: "Account not found in portfolio"
**Problem:** Transaction references an account that doesn't exist  
**Solution:** Ensure the account exists in the Accounts sheet with matching Portfolio and Account Name

### Issue 3: "Asset not found in portfolio"
**Problem:** Transaction references an asset not defined in Portfolio Assets  
**Solution:** Either add the asset to Portfolio Assets sheet, or the system will create it automatically (you'll see a warning)

### Issue 4: "Portfolio not found"
**Problem:** Account or Transaction references a non-existent portfolio  
**Solution:** Ensure the portfolio exists in the Portfolios sheet

### Issue 5: "Missing or invalid quantity/price"
**Problem:** BUY/SELL transactions need quantity and price  
**Solution:** Fill in both Quantity and Price/Unit columns for BUY/SELL transactions

---

## 📝 Best Practices

1. **Start with Portfolios First**
   - Define your portfolios before anything else
   - Use clear, unique names

2. **Define Assets Completely**
   - Include all assets in Portfolio Assets sheet
   - Set reasonable allocations (totaling ~100%)
   - Savings accounts can have 0% allocation

3. **Create Accounts**
   - Define accounts before transactions
   - Match account names exactly in transactions

4. **Order Transactions Chronologically**
   - List transactions from oldest to newest
   - This ensures proper FIFO calculations

5. **Use Consistent Asset Names**
   - Asset names in Transactions must match Portfolio Assets exactly
   - Names are case-sensitive

6. **Account for Currency**
   - USD transactions should use USD accounts
   - THB transactions should use THB accounts

7. **Omit Optional Sheets**
   - You can skip FIFO Lots and FIFO Sales sheets
   - The system will rebuild them from transactions

---

## 🔧 Import Process

1. **Prepare Your Excel File**
   - Use the structure outlined above
   - Double-check all required fields

2. **Start Import**
   - Click "Import from Excel" button in the app
   - Select your Excel file

3. **Review Preview**
   - The system will show you what will be imported
   - Check for any warnings or errors
   - Review which transactions will be skipped (if any)

4. **Confirm Import**
   - A backup of current data is created automatically
   - Click "Import Data" to proceed
   - Wait for success confirmation

5. **Reload Page**
   - Refresh to see imported data
   - Verify everything looks correct

---

## 📧 Support

If you encounter issues not covered in this guide, use the `/reportbug` command in the application to report the problem with details about your import file structure.

---

## 📄 Template

You can export your current data to get a template with the correct structure:
1. Go to Settings or Portfolio page
2. Click "Export to Excel"
3. Use the exported file as a template for future imports

---

**Last Updated:** March 3, 2026