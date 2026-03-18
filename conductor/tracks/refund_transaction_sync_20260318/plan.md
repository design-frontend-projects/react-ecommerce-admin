# Implementation Plan: Refund Transaction Sync & Filter

## Phase 1: Enhanced Refund Mutation (TDD)
Implement the dual-insertion logic in the `createRefund` API function to ensure every refund has a corresponding transaction record.

- [ ] Task: **Create Unit Tests for `createRefund`**
    - [ ] Create `src/features/pos/data/refund-api.test.ts`.
    - [ ] Mock `supabase` client.
    - [ ] Write a test to verify that `createRefund` inserts a record into the `refunds` table.
    - [ ] Write a test to verify that it also inserts a record into the `transactions` table with:
        - `transaction_type = 'refund'`
        - `reference_transaction_id` matching the original sale UUID.
        - Negative `total_amount` and `subtotal`.
        - Generated `transaction_number` (e.g., `REF-POS-123`).
- [ ] Task: **Implement Dual-Insertion in `createRefund`**
    - [ ] Modify `src/features/pos/data/refund-api.ts`.
    - [ ] Fetch the original transaction to inherit `tenant_id`, `clerk_user_id`, and `currency`.
    - [ ] Execute the insertion into `refunds`.
    - [ ] Execute the insertion into `transactions`.
    - [ ] **TDD Check**: Ensure all new tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Enhanced Refund Mutation (TDD)' (Protocol in workflow.md)

## Phase 2: Recent Orders Filtering
Update the POS dashboard to hide sales that have been refunded.

- [ ] Task: **Refactor Recent Orders Query**
    - [ ] In `src/features/pos/data/dashboard-api.ts`, add `getRecentTransactions`.
    - [ ] Use a Supabase join or `not.in` filter to exclude transactions present in the `refunds` table.
    - [ ] Ensure it only returns `'completed'` transactions.
- [ ] Task: **Update `ShiftDashboard` Component**
    - [ ] Modify `src/features/pos/components/shift-dashboard.tsx` to use the new `getRecentTransactions` query.
    - [ ] Remove inline Supabase call.
- [ ] Task: **Verify Filtering Logic**
    - [ ] Add a unit test in `src/features/pos/data/dashboard-api.test.ts` to mock transactions with and without corresponding refunds and verify the output.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Recent Orders Filtering' (Protocol in workflow.md)

## Phase 3: Final Integration & Cleanup
- [ ] Task: **Global Verification**
    - [ ] Run all project tests (`npm test`).
    - [ ] Check linting and type safety.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration & Cleanup' (Protocol in workflow.md)
