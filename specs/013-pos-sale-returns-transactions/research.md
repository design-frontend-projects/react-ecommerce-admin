# Research: POS Sales and Returns processing

**Feature**: POS Sales, returns and transaction references
**Status**: Completed
**Date**: 2026-04-07

## Decision: Atomic Transaction with Prisma 7

### Description
Use `prisma.$transaction` to bundle `sales_invoices`, `sales_invoice_items`, `transactions`, and `transaction_details` into one unit of work.

### Rationale
- High data integrity: Prevents incomplete sales/financial records.
- Simplifies error handling: If any step fails, the whole set is rolled back.
- Aligns with global constitution preferring Prisma 7 for server logic.

### Alternatives considered
- **Supabase RPC**: While efficient, it hides logic in DB functions and is harder to version control/debug in TS compared to Prisma actions.
- **Sequential API Calls**: High risk of data inconsistency if network fails between calls.

---

## Decision: Direct Foreign-Key References in Transactions

### Description
Extend `transactions` model in `schema.prisma` with `sales_invoice_id` and `sales_return_id`.

### Rationale
- Matches the user's specific requirement for using invoice ID as reference.
- Simplifies cross-searching: "Show me all transactions for Invoice #X".

---

## Decision: Return Validation Strategy

### Description
Implement a server-side validation function to calculate "refundable quantity".
Formula: `refundable_qty = original_invoice_qty - sum(qty across all associated sales_return_items)`.

### Rationale
- Prevents over-refunding (partial returns).
- Handles edge cases where a customer returns 1 item today and 1 item tomorrow from a 3-item invoice.
