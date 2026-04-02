# Research: Stock Balances & Inventory Automation

## Decisions

### D-001: Trigger for Purchase Receipt
- **Decision**: Trigger inventory increase when `purchase_invoices.status` transitions from `draft` to `posted`.
- **Rationale**: `purchase_invoices` represents the actual delivery and commercial document. `posted` status in ERP systems typically signifies the ledger and sub-ledger (inventory) update.
- **Alternatives**: Using `purchase_orders.status = 'received'`. Rejected because POs often lack `store_id` mapping which is present in `purchase_invoices`.

### D-002: Refund Logic
- **Decision**: Use a Supabase Trigger on the `refunds` table.
- **Rationale**: Ensures that every refund recorded in the system leads to an inventory update, keeping the database the source of truth regardless of which UI (POS vs Admin) created the refund.
- **Store Mapping**: The refund will lookup the original `store_id` from the associated `sale_id` or `order_id`.

### D-003: Inventory Movements Audit
- **Decision**: Every stock change must create a row in `inventory_movements`.
- **Rationale**: Financial and operational compliance. Without a ledger, we cannot reconstruct the history of a stock level.

## Technical Unknowns Resolved

| Unknown | Resolution |
|---------|------------|
| PO Store Mapping | Use `purchase_invoices.store_id` which is populated during delivery. |
| Refund Item Mapping | For v1, increment all items in the original sale. For v2, support partial returns. |
| Product vs Variant | Standardize on `product_variant_id` for all inventory operations. |
