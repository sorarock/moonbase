# USD FIFO Cost Basis Testing Guide

## Overview
This document provides testing instructions for the USD FIFO (First-In-First-Out) cost basis tracking enhancement. This feature tracks THB→USD currency conversions as FIFO lots and automatically calculates accurate cost basis when purchasing USD-denominated assets.

---

## 🎯 Feature Summary

### What's New?
1. **USD Lot Creation**: When transferring THB → USD (FCD account), the system creates USD lots that track:
   - Amount of USD acquired
   - Exchange rate at time of acquisition
   - THB cost basis
   
2. **USD Lot Consumption**: When buying USD-denominated assets, the system:
   - Uses FIFO to consume oldest USD lots first
   - Calculates weighted average exchange rate from consumed lots
   - Creates asset lots with accurate THB cost basis

3. **Complete Audit Trail**: Track the entire chain: THB → USD → Asset

---

## 📋 Test Scenario: Your Example

### Scenario Setup
Let's test with your exact scenario:

```
Jan 1, 2026: Transfer THB → USD (10 USD @ 31.2 THB/USD)
Jan 2, 2026: Transfer THB → USD (15 USD @ 31.3 THB/USD)
Jan 3, 2026: BUY GOLD (10 units @ $1.50/unit = $15 USD)
Jan 4, 2026: BUY GOLD (5 units @ $1.00/unit = $5 USD)
Jan 5, 2026: SELL GOLD (12 units @ $2.00/unit)
```

---

## 🧪 Testing Steps

### Step 1: Verify USD Lots After Transfers

After recording the two THB → USD transfers, check USD lots:

```javascript
// View all USD lots
console.log('=== USD LOTS ===');
const usdLots = FIFOManager.getAllLots()
  .filter(lot => lot.assetId === 'USD_CURRENCY');
console.table(usdLots);
```

**Expected Results:**
```
USD Lot #1:
- purchaseDate: "2026-01-01"
- quantity: 10
- remainingQuantity: 10
- pricePerUnit: 31.2  (THB cost per USD)
- costBasisTHB: 312
- status: "OPEN"

USD Lot #2:
- purchaseDate: "2026-01-02"
- quantity: 15
- remainingQuantity: 15
- pricePerUnit: 31.3
- costBasisTHB: 469.5
- status: "OPEN"
```

**Total USD Available:** 25 USD  
**Total THB Cost:** 781.5 THB

---

### Step 2: Check USD Consumption After First Gold Purchase

After buying 10 units of Gold for $15 on Jan 3:

```javascript
// Check USD lot status
console.log('=== USD LOTS AFTER GOLD PURCHASE #1 ===');
console.table(FIFOManager.getAllLots()
  .filter(lot => lot.assetId === 'USD_CURRENCY'));

// Check Gold lot
console.log('=== GOLD LOTS ===');
console.table(FIFOManager.getAllLots()
  .filter(lot => lot.assetId.includes('Gold')));
```

**Expected USD Lot Changes:**
```
USD Lot #1:
- remainingQuantity: 0  (fully consumed)
- status: "CLOSED"

USD Lot #2:
- remainingQuantity: 10  (15 - 5 = 10)
- status: "OPEN"
```

**Expected Gold Lot #1:**
```
Gold Lot #1:
- purchaseDate: "2026-01-03"
- quantity: 10
- pricePerUnit: 1.50 (USD)
- exchangeRate: 31.233  (weighted average)
- costBasisTHB: 468.5
  Calculation: (10 USD × 31.2) + (5 USD × 31.3) = 312 + 156.5 = 468.5
- status: "OPEN"
```

**Key Verification:**
- ✅ USD consumed from oldest lot first (FIFO)
- ✅ Weighted exchange rate calculated: 468.5 ÷ 15 = 31.233
- ✅ Gold lot uses weighted rate for THB cost basis

---

### Step 3: Check After Second Gold Purchase

After buying 5 units of Gold for $5 on Jan 4:

```javascript
// Check USD lot status
console.log('=== USD LOTS AFTER GOLD PURCHASE #2 ===');
console.table(FIFOManager.getAllLots()
  .filter(lot => lot.assetId === 'USD_CURRENCY'));

// Check all Gold lots
console.log('=== ALL GOLD LOTS ===');
console.table(FIFOManager.getAllLots()
  .filter(lot => lot.assetId.includes('Gold')));
```

**Expected USD Lot Status:**
```
USD Lot #2:
- remainingQuantity: 5  (10 - 5 = 5)
- status: "OPEN"
```

**Expected Gold Lot #2:**
```
Gold Lot #2:
- purchaseDate: "2026-01-04"
- quantity: 5
- pricePerUnit: 1.00 (USD)
- exchangeRate: 31.3  (from USD Lot #2)
- costBasisTHB: 156.5
  Calculation: 5 USD × 31.3 = 156.5
- status: "OPEN"
```

---

### Step 4: Check After Gold Sale

After selling 12 units of Gold on Jan 5:

```javascript
// Check Gold lot status
console.log('=== GOLD LOTS AFTER SALE ===');
console.table(FIFOManager.getActiveLots(portfolioId, goldAssetId));

// Check sale record
console.log('=== GOLD SALE RECORD ===');
const sales = FIFOManager.getSaleHistory(portfolioId, goldAssetId);
console.table(sales);

// Check detailed lot breakdown in sale
if (sales.length > 0) {
  console.log('=== LOTS SOLD BREAKDOWN ===');
  console.table(sales[0].lotsSold);
}
```

**Expected Gold Lot Status:**
```
Gold Lot #1:
- remainingQuantity: 0
- status: "CLOSED"

Gold Lot #2:
- remainingQuantity: 3  (5 - 2 = 3)
- status: "OPEN"
```

**Expected Sale Record:**
```
Sale Record:
- saleDate: "2026-01-05"
- quantitySold: 12
- salePrice: 2.00 (USD)
- exchangeRate: 31.4 (rate on sale date)
- totalCostBasisTHB: 530.6
  Breakdown:
    - From Gold Lot #1: 10 units × 1.50 × 31.233 = 468.5
    - From Gold Lot #2: 2 units × 1.00 × 31.3 = 62.6
- totalProceedsTHB: 753.6
  Calculation: 12 × 2.00 × 31.4 = 753.6
- realizedGainTHB: 223.0
  Calculation: 753.6 - 530.6 = 223.0
```

**Lots Sold Breakdown:**
```
Lot #1 Portion:
- quantitySold: 10
- purchasePrice: 1.50 USD
- purchaseExchangeRate: 31.233
- salePrice: 2.00 USD
- saleExchangeRate: 31.4
- costBasisTHB: 468.5
- proceedsTHB: 628.0
- realizedGainTHB: 159.5
- holdingPeriodDays: 2

Lot #2 Portion:
- quantitySold: 2
- purchasePrice: 1.00 USD
- purchaseExchangeRate: 31.3
- salePrice: 2.00 USD
- saleExchangeRate: 31.4
- costBasisTHB: 62.6
- proceedsTHB: 125.6
- realizedGainTHB: 63.0
- holdingPeriodDays: 1
```

---

## ✅ Verification Checklist

### USD Lot Tracking
- [ ] USD lots created on THB → USD transfers
- [ ] Each lot stores correct exchange rate
- [ ] Total USD quantity matches transfer amounts
- [ ] Cost basis in THB calculated correctly

### USD Consumption
- [ ] Oldest USD lots consumed first (FIFO)
- [ ] Weighted exchange rate calculated correctly
- [ ] USD lots marked as CLOSED when fully consumed
- [ ] Remaining quantity updated for partial consumption

### Asset Lot Creation
- [ ] Asset lots created with weighted exchange rate
- [ ] Cost basis in THB uses weighted rate
- [ ] Asset lots track which USD lots were used

### Sale Processing
- [ ] Oldest asset lots sold first (FIFO)
- [ ] Cost basis uses original purchase exchange rates
- [ ] Realized gains calculated correctly in THB
- [ ] Sale record includes lot breakdown

---

## 🔍 Console Commands Reference

### View All USD Lots
```javascript
console.table(FIFOManager.getAllLots()
  .filter(lot => lot.assetId === 'USD_CURRENCY'));
```

### View Available USD in Account
```javascript
const availableUSD = FIFOManager.getAvailableUSD(portfolioId, fcdAccountId);
console.log('Available USD:', availableUSD);
```

### View All Asset Lots
```javascript
console.table(FIFOManager.getAssetLots(portfolioId, assetId));
```

### View Active Asset Lots Only
```javascript
console.table(FIFOManager.getActiveLots(portfolioId, assetId));
```

### View Sale History
```javascript
console.table(FIFOManager.getSaleHistory(portfolioId, assetId));
```

### View Complete FIFO Status
```javascript
console.log('=== COMPLETE FIFO STATUS ===');
const allLots = FIFOManager.getAllLots();
const usdLots = allLots.filter(l => l.assetId === 'USD_CURRENCY');
const assetLots = allLots.filter(l => l.assetId !== 'USD_CURRENCY');

console.log('USD Lots:', usdLots.length);
console.table(usdLots);

console.log('\nAsset Lots:', assetLots.length);
console.table(assetLots);

console.log('\nSales:', FIFOManager.getAllSales().length);
console.table(FIFOManager.getAllSales());
```

---

## 🎓 Understanding the Math

### Weighted Exchange Rate Calculation

When buying assets with USD from multiple lots:

```
Gold Purchase: 15 USD needed

USD Lot #1: 10 USD @ 31.2 THB/USD = 312 THB
USD Lot #2: 5 USD @ 31.3 THB/USD = 156.5 THB
Total: 15 USD costs 468.5 THB

Weighted Rate = 468.5 THB ÷ 15 USD = 31.233 THB/USD
```

This weighted rate is then used as the exchange rate for the Gold lot, ensuring accurate THB cost basis.

### Realized Gain Calculation

When selling:

```
Sold 10 units from Gold Lot #1:
- Purchase: 10 units × $1.50 × 31.233 = 468.5 THB (cost)
- Sale: 10 units × $2.00 × 31.4 = 628.0 THB (proceeds)
- Gain: 628.0 - 468.5 = 159.5 THB

Sold 2 units from Gold Lot #2:
- Purchase: 2 units × $1.00 × 31.3 = 62.6 THB (cost)
- Sale: 2 units × $2.00 × 31.4 = 125.6 THB (proceeds)
- Gain: 125.6 - 62.6 = 63.0 THB

Total Realized Gain: 159.5 + 63.0 = 222.5 THB
```

---

## 🐛 Troubleshooting

### Issue: No USD Lots Created

**Check:**
- Transfer is from THB account to USD account
- Both accounts exist and have correct currencies
- FIFOManager is loaded (check console)

**Verify:**
```javascript
// Check if FIFOManager exists
console.log('FIFOManager loaded:', typeof FIFOManager !== 'undefined');

// Check transaction was recorded
const transfers = TransactionManager.getTransactions({ type: 'TRANSFER' });
console.table(transfers);
```

### Issue: "Insufficient USD" Error

**Check:**
- USD lot query is using correct account ID
- Exchange rate is properly set on transfer

**Verify:**
```javascript
// Check available USD
const available = FIFOManager.getAvailableUSD(portfolioId, accountId);
console.log('Available USD:', available);

// Check all USD lots
console.table(FIFOManager.getAllLots()
  .filter(lot => lot.assetId === 'USD_CURRENCY' && lot.accountId === accountId));
```

### Issue: Wrong Exchange Rate on Asset

**Check:**
- USD lots were consumed properly
- Console shows weighted rate calculation

**Verify:**
```javascript
// Enable console logging during purchase
// Look for these messages:
// "✓ Consumed X USD from Y lot(s)"
// "✓ Weighted exchange rate: XX.XXXX THB/USD"
```

---

## 📊 Expected Console Output

When recording transactions with USD FIFO, you should see:

```
=== TRANSFER THB → USD ===
✓ USD lot created: 10 USD @ 31.2 THB/USD (Cost: 312 THB)

=== TRANSFER THB → USD ===
✓ USD lot created: 15 USD @ 31.3 THB/USD (Cost: 469.5 THB)

=== BUY GOLD ===
✓ Consumed 15 USD from 2 lot(s)
✓ Weighted exchange rate: 31.2333 THB/USD
FIFO lot created: [lot_id]

=== BUY GOLD ===
✓ Consumed 5 USD from 1 lot(s)
✓ Weighted exchange rate: 31.3000 THB/USD
FIFO lot created: [lot_id]

=== SELL GOLD ===
FIFO sale processed: [sale_id] Realized gain: 223.0
```

---

## ✨ Success Criteria

The USD FIFO system is working correctly when:

1. ✅ USD lots are automatically created on THB → USD transfers
2. ✅ USD lots store correct exchange rates and cost basis
3. ✅ USD lots are consumed using FIFO when buying USD assets
4. ✅ Weighted exchange rates are calculated correctly
5. ✅ Asset lots reflect accurate THB cost basis
6. ✅ Sales use original exchange rates for gain/loss calculation
7. ✅ Complete audit trail is maintained (THB → USD → Asset → Sale)

---

## 📝 Notes

- Exchange rates are stored at each step, preserving the original cost basis
- FIFO applies to both USD lots (currency) and asset lots (securities)
- The system supports multiple USD accounts, each with separate lot tracking
- USD lots are account-specific (FCD account lots are separate from other USD accounts)
- All calculations maintain precision for accurate tax reporting