# Specification: Refund Transaction Sync & Recent Orders Filter

## Overview
Extend the refund processing logic to create a corresponding record in the `transactions` table for auditing and reporting, and update the "Recent Orders" display logic to exclude transactions that have been refunded.

## Functional Requirements
1. **Refund Transaction Creation**:
   - Upon successful insertion into the `refunds` table, a new record MUST be created in the `transactions` table.
   - **Fields**:
     - `transaction_type`: set to `'refund'`.
     - `reference_transaction_id`: set to the UUID of the original sale (`saleId`).
     - `transaction_number`: generated as `REF-` + original `transaction_number`.
     - `status`: set to `'completed'`.
     - `total_amount` & `subtotal`: set to the negative value of the refund amount.
     - `tenant_id`, `clerk_user_id`, `currency`: inherited from the original transaction.
     - `notes`: include refund reason and notes.

2. **Recent Orders Filtering**:
   - The "Recent Activity Log" in the `ShiftDashboard` must be updated to exclude any transaction that has a corresponding entry in the `refunds` table.
   - The query should only return transactions that are NOT present in the `refunds` table (using `order_id` or `sale_id` for matching).

## Non-Functional Requirements
- **Consistency**: The system should attempt to keep `refunds` and `transactions` in sync.
- **Performance**: Recent orders query should remain performant even with many refunds.

## Acceptance Criteria
- [ ] Processing a refund results in a new record in both `refunds` and `transactions` tables.
- [ ] The `transactions` record correctly references the original sale.
- [ ] The Shift Dashboard's activity log hides transactions that have been refunded.
- [ ] Refund amounts are correctly recorded as negative values in the `transactions` table.

## Out of Scope
- Partial refunds (currently handled as simple exclusion).
- UI changes to the refund dialog beyond the "Success" state notification.
