# Data Model: Stock Balances & Inventory Automation

## Entities

### `stock_balances` (Existing)
- **Primary Key**: `(store_id, product_variant_id)`
- **Unique**: `(tenant_id, store_id, product_variant_id)`
- **Fields**:
  - `qty_on_hand`: Current physical stock level.
  - `qty_reserved`: Items committed to orders but not yet shipped.
  - `qty_available`: Generated `qty_on_hand - qty_reserved`.
  - `avg_cost`: Moving average cost for current stock.
  - `last_movement_at`: Timestamp of last change.

### `inventory_movements` (Audit Ledger)
- **Fields**:
  - `movement_type`: `purchase`, `sale`, `adjustment`, `return`.
  - `qty_in`: Positive change.
  - `qty_out`: Negative change.
  - `reference_id`: Link to PO, Sale, or Refund.

## State Transitions

### T-001: Purchase Receipt
1. User sets `purchase_invoices.status` to `posted`.
2. System fetches `purchase_invoice_items`.
3. For each item:
   - Call `update_stock_level(store_id, variant_id, qty, clerk_id, 'purchase')`.

### T-003: Sale Refund
1. User creates or processes a `refunds` record.
2. System identifies the original `sale_id`.
3. System fetches `sale_items`.
4. For each item:
   - Call `update_stock_level(store_id, variant_id, qty, clerk_id, 'return')`.

## Validation Rules
- **V-001**: Stock levels MUST NOT fall below zero if `p_allow_negative` is false.
- **V-002**: Every movement MUST have a valid `clerk_user_id`.
