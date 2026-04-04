# Implementation Plan - Inventory Automation: Transactional PO Receiving

## 🎯 Goal
Enhance inventory management by implementing a single Supabase transactional function (`RPC`) to handle the receipt of purchase order items. This ensures data consistency across PO items, PO status, stock balances, inventory movements, and variant aggregation.

## 🛠️ Proposed Changes

### 1. Database Migration
- **[`SUPABASE SQL`]**: 
  - Add `product_variant_id` (UUID) to `purchase_order_items` to support variant-level receiving.
  - Create the `receive_purchase_order_items` function.
  - The function will:
    - Update `purchase_order_items.received_quantity`.
    - Update `purchase_order_items.product_variant_id` (record which variant was actually received).
    - Upsert `stock_balances` for the given `store_id` and `variant_id`.
    - Insert an `inventory_movements` record for the transaction.
    - Re-calculate and update `product_variants.stock_quantity` (aggregate stock across all stores).
    - Automatically update `purchase_orders.status` to 'partial' or 'received' based on item completeness.

### 2. Frontend Integration
- **[`src/features/purchase-orders/hooks/use-purchase-order-items.ts`]**: 
  - Update `useBatchReceiveItems` to call `supabase.rpc('receive_purchase_order_items', { ... })`.
  - Simplify client-side logic as the backend handles the heavy lifting.
- **[`src/features/purchase-orders/components/po-receive-dialog.tsx`]**: 
  - Update the state and form to include `variant_id` and `store_id`.

## 🧪 Verification Plan
1. **Database Test**: Call the RPC directly with mock data and verify:
   - PO item `received_quantity` is updated.
   - `stock_balances` reflect the new quantity.
   - `inventory_movements` has a new entry.
   - `product_variants.stock_quantity` matches the sum of store balances.
   - PO status switches to 'received' when final items are taken.
2. **UI Test**: Use the "Receive Items" dialog to process a partial and full receipt.

## 🛡️ Security & Performance
- The function uses `SECURITY DEFINER` to ensure it can update all necessary tables correctly within the user's transaction context.
- All actions happen within a single PostgreSQL transaction, preventing partial data updates if any step fails.
