# Tasks: 009-Receive PO Stock Sync

## Feature Overview
Implement transactional synchronization between Purchase Order reception and Inventory levels using a Supabase database function.

## Phases

### Phase 1: Setup & Prerequisite Check
- [x] T001 Verify database schema for `purchase_order_items`, `stock_balances`, and `product_variants`

### Phase 2: Foundational (Database Layer)
- [x] T002 Add `product_variant_id` to `purchase_order_items` table in Supabase
- [x] T003 Create `receive_purchase_order_items` PL/pgSQL function for atomic updates
- [x] T004 Add unit test SQL script to verify `receive_purchase_order_items` transactionality

### Phase 3: User Story 1 - Automatic Stock Sync (P1)
- [x] T005 [US1] Update `useBatchReceiveItems` hook to call the `receive_purchase_order_items` RPC
- [x] T006 [US1] Update `usePurchaseOrder` query to fetch `product_variants` for item selection
- [x] T007 [US1] Implement Store selection in `POReceiveDialog`
- [x] T008 [US1] Implement Variant selection/display in `POReceiveDialog`
- [x] T009 [US1] [P] Verify stock balance updates in UI after receiving a PO

### Phase 4: User Story 2 - Atomic Database Update (P2)
- [x] T010 [US2] Create a failure simulation test (e.g., passing invalid store_id) to verify rollback
- [x] T011 [US2] Ensure `product_variants.stock_quantity` aggregation is correct after multi-store receipts

### Phase 5: Polish & Edge Cases
- [x] T012 [P] Implement validation to prevent negative quantities in `POReceiveDialog`
- [x] T013 [P] Add "Loading" states and disabled buttons during the RPC call in `POReceiveDialog`
- [x] T014 [P] Update `PurchaseOrderItemInput` in `use-purchase-orders.ts` to include `product_variant_id` for PO creation flow

## Dependency Graph
- T002 -> T003
- T003 -> T005
- T005 -> T009
- T006 -> T008

## Parallel Execution Examples
- T012, T013, T014 can be worked on concurrently as they affect different parts of the UI/Types.
