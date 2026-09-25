# Quickstart & Verification Guide: Inventory Movements

**Branch**: `025-enhance-inventory-movements`  
**Feature**: Enhance Inventory Movements UI/UX & Server-Side Pagination  
**Status**: Ready for Implementation  

---

## 1. Quick Verification Overview

This guide explains how to verify the enhanced Inventory Movements module locally, ensuring server-side pagination, debounced filtering, KPI calculation, and audit drawer functionalities meet all specifications.

---

## 2. Local Environment Setup

Ensure your local dev server is active:

```bash
# Verify dependencies
pnpm install

# Run development server (if not already running)
pnpm run dev
```

---

## 3. Step-by-Step Feature Walkthrough

### 3.1. Navigate to Module
1. Open your browser and navigate to `http://localhost:5173/inventory-movements`.
2. Observe the initial view loads within 1.5 seconds.
3. Verify the **Executive KPI Ribbon** displays:
   - Total Transactions count
   - Total Inbound Units (green badge)
   - Total Outbound Units (red badge)
   - Net Velocity Delta

### 3.2. Test Server-Side Pagination
1. Inspect network traffic in browser Developer Tools.
2. Confirm the initial request is `GET /api/inventory/movements?page=1&pageSize=20`.
3. Click "Next Page" (Page 2) in the pagination bar:
   - Observe request `GET /api/inventory/movements?page=2&pageSize=20`.
   - Verify table smoothly transitions with skeleton indicators.
   - Verify URL updates to reflect `page=2`.
4. Change page size dropdown from `20` to `50`:
   - Observe request `GET /api/inventory/movements?page=1&pageSize=50`.
   - Confirm 50 rows render in the table.

### 3.3. Test Faceted Filtering & Search
1. Type a product SKU or barcode into the search input.
2. Verify that typing is debounced by 300ms before sending the network request.
3. Verify that the table automatically resets to Page 1 when search or filter criteria change.
4. Select a specific Movement Type (e.g. `Purchase` or `Adjustment In`):
   - Confirm only matching movement types are returned.
5. Select a Date Range (e.g. `Last 7 Days`):
   - Confirm only movements within that window appear.
6. Click "Reset Filters":
   - Confirm all filters clear and default pagination returns.

### 3.4. Test Movement Detail Inspection Drawer
1. Click on any row in the inventory movements table.
2. Confirm a slide-out Sheet opens from the right (or left in RTL):
   - Header shows Movement #, Movement Type badge, and Exact Timestamp.
   - Catalog section shows SKU, Variant Name, and Barcode.
   - Inventory Flow section shows Qty Before, Movement Delta (+in / -out), and Qty After.
   - Financials section shows Unit Cost and Total Cost.
   - Provenance shows Warehouse, Location/Bin, Batch/Serial number, and Notes.
3. Press `Esc` or click the close button to dismiss the drawer.

### 3.5. Test CSV Data Export
1. Apply a filter (e.g., Warehouse: Central Warehouse).
2. Click the "Export CSV" button in the table toolbar.
3. Verify a `.csv` file downloads containing all matching filtered records.
4. Open the CSV in Excel or a text editor and verify UTF-8 encoding and accurate columns.

### 3.6. Test Bilingual & RTL Layout
1. Switch language to Arabic using the language switcher in the top navigation bar.
2. Verify:
   - Table columns, summary cards, and filters align in RTL direction.
   - Inbound (+green) and Outbound (-red) quantities maintain clear polarity.
   - Inspection drawer slides out smoothly without UI clipping.

---

## 4. Automated Testing

Run the test suite to validate component behavior and data contracts:

```bash
# Run Vitest for inventory movements tests
pnpm test src/features/inventory-movements
```
