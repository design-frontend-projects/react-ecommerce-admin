# Quickstart Guide: Stock Balance Paging & SKU Search Verification

**Feature Branch**: `026-stock-balance-paging`  
**Date**: 2026-09-25  

## 1. Prerequisites & Environment

Ensure all dependencies are installed and the local development server is running:

```bash
# Package manager check
pnpm install

# Start local development server (if not already running)
pnpm run dev
```

---

## 2. Feature Verification Walkthrough

### Test Scenario A: Paginated Stock Balance Ledger
1. Navigate to `/stock-balances` in the browser.
2. Verify initial render:
   - Only the first page (20 records by default) is requested and rendered.
   - The pagination footer displays: `Page 1 of N` and `Showing 1-20 of X balances`.
   - Metric cards at the top show aggregate tenant totals.
3. Test page navigation:
   - Click "Next Page" (`>`) or a specific page number.
   - Confirm only the requested slice is fetched lazily with a subtle skeleton/spinner.
   - Verify page numbers and item ranges update accurately.
4. Test page sizes:
   - Change page size dropdown from `20` to `50` or `100`.
   - Verify table immediately requests the new page size and recalculates total pages.
5. Test facility tabs:
   - Click the "Warehouses" tab.
   - Verify only warehouse balances are shown and pagination resets to page 1.
   - Click the "Stores" tab, then the "Alerts" tab.
6. Test table search:
   - In the table filter input, type a known SKU or product name (e.g. `BEV`).
   - Confirm search is executed on the server, table resets to page 1, and only matching rows are displayed.

---

### Test Scenario B: Lazy Variant SKU Search in Stock Adjustment
1. On the Stock Balances page, click **"New Stock Adjustment"** (top right).
2. Verify instant modal opening:
   - Dialog opens immediately (<100ms) with no blocking network waterfall.
   - The product variant selector is not loaded with all catalog items.
3. Test debounced SKU search:
   - Click the Product Variant / SKU selector.
   - Type 2-3 characters (e.g., `BEV` or `CAN`).
   - Observe the debounced network query (`/api/inventory/product-variants?search=...`).
   - Verify the dropdown lists matching variants with SKU code, parent product name, barcode, and cost.
4. Test selection and facility on-hand feedback:
   - Select a warehouse or store.
   - Select a variant from search results.
   - Verify standard cost auto-fills in the Unit Cost field.
   - Verify the current on-hand quantity for the chosen facility displays dynamically.
5. Test row-action adjustment (existing row fast-path):
   - In the Stock Balances table, click the action menu on any row and choose "Adjust Stock".
   - Verify the dialog opens pre-populated with the exact variant and facility without triggering a broad search.

---

## 3. Automated Testing

Run Vitest suite to verify unit and integration tests:

```bash
# Run unit and integration tests
pnpm test
```
