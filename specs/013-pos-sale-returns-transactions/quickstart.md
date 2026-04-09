# Quickstart: POS Sales and Returns

**Feature**: POS Sales, returns and transaction references
**Status**: Draft
**Spec**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/013-pos-sale-returns-transactions/spec.md)

## Core Commands

- **Run Dev Server**: `pnpm run dev`
- **Apply Schema Changes**: `pnpx prisma db push`
- **Regenerate Prisma Client**: `pnpx prisma generate`
- **Run Unit Tests**: `pnpm run test` (Vitest)

## Quick Implementation Guide

1.  **Modify Schema**: Update `prisma/schema.prisma` with `sales_invoice_id` and `sales_return_id` in `transactions`.
2.  **Server Action (Sale)**: Create `src/features/pos/actions/sale.ts` and use `prisma.$transaction`.
3.  **Server Action (Return)**: Create `src/features/pos/actions/return.ts` with quantity validation.
4.  **UI Components**:
    - `SaleCheckout`: Handles payment and calls sale action.
    - `ReturnSearch`: Locates original invoice.
    - `ReturnForm`: Allows partial/full return selection.

## Testing Your Implementation

### Verification: POS Sale
1.  Add items to cart.
2.  Complete checkout.
3.  Check `sales_invoices`, `sales_invoice_items`, `transactions`, and `transaction_details` tables.
4.  Verify all records are linked and financial totals match.

### Verification: POS Return
1.  Select "Returns" from menu.
2.  Search for the previously created invoice.
3.  Select 1 item to return (partial).
4.  Verify:
    - `sales_returns` created.
    - `sales_return_items` created for that specific item.
    - `transactions` created with negative/refund amount.
    - `sales_invoices.status` updated to `partially_returned`.
5.  Try to return the SAME item again (with quantity > remaining). Verify it errors out.
