# Tasks: Stock Balances Module & Inventory Automation

**Input**: Design documents from `/specs/006-stock-balances-automation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Tests are included for critical automation triggers.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create structural directories in `src/features/inventory/stock-balances/`
- [ ] T002 [P] Define TypeScript interfaces in `src/features/inventory/stock-balances/types/stock.ts`
- [ ] T003 Initialize the state store using Zustand in `src/features/inventory/stock-balances/store/use-stock-store.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and database triggers that enable all user stories

- [ ] T004 Create Supabase migration for the `update_stock_level` stored procedure in `supabase/migrations/20260402000000_stock_automation.sql`
- [ ] T005 [P] Setup Zod validation schemas for adjustments in `src/features/inventory/stock-balances/schemas/adjustment.ts`
- [ ] T006 Implement base service abstraction for Supabase in `src/features/inventory/stock-balances/services/supabase-client.ts`

**Checkpoint**: Database-level stock management logic is ready.

---

## Phase 3: User Story 1 - Real-time Stock Visibility (Priority: P1) 🎯 MVP

**Goal**: Provide a dashboard to view current stock levels across all stores and variants.

**Independent Test**: Navigate to `/inventory/stock-balances` and verify data matches `stock_balances` table records.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Implement `useStockBalances` hook with TanStack Query in `src/features/inventory/stock-balances/hooks/use-stock-balances.ts`
- [ ] T008 [US1] Create `StockBalancesTable` using TanStack Table and shadcn/ui in `src/features/inventory/stock-balances/components/stock-balances-table.tsx`
- [ ] T009 [US1] Implement `StockBalancesPage` component in `src/features/inventory/stock-balances/pages/stock-balances-page.tsx`
- [ ] T010 [US1] Register the new inventory route in the main application router.

**Checkpoint**: User Story 1 is functional - visibility objective achieved.

---

## Phase 4: User Story 3 - Automated PO Receipt (Priority: P1)

**Goal**: Automatically increment stock levels when a purchase invoice is marked as 'posted'.

**Independent Test**: Change a `purchase_invoices` status to `posted` and verify corresponding `stock_balances` increase.

### Implementation for User Story 3

- [ ] T011 [US3] Create database trigger `trg_on_purchase_invoice_receipt` in `supabase/migrations/20260402000000_stock_automation.sql`
- [ ] T012 [US3] Implement logic to iterate through `purchase_invoice_items` and call `update_stock_level` within the trigger.
- [ ] T013 [US3] Add automated test to verify `inventory_movements` record creation for PO receipt.

---

## Phase 5: User Story 2 - Manual Stock Adjustment (Priority: P2)

**Goal**: Allow admins to manually override or define stock levels with an audit reason.

**Independent Test**: Use the "Adjust" action on a stock row and verify the new quantity reflects in the UI and database.

### Implementation for User Story 2

- [ ] T014 [P] [US2] Implement `AdjustmentDialog` component in `src/features/inventory/stock-balances/components/adjustment-dialog.tsx`
- [ ] T015 [US2] Create absolute adjustment mutation in `src/features/inventory/stock-balances/hooks/use-adjust-stock.ts`
- [ ] T016 [US2] Integrate adjustment triggers into the `StockBalancesTable` actions.

---

## Phase 6: User Story 4 - Automated Refund Restocking (Priority: P2)

**Goal**: Automatically increment stock levels when a refund status becomes 'processed'.

**Independent Test**: Process a refund for a sale and verify the items are added back to the correct store's balance.

### Implementation for User Story 4

- [ ] T017 [US4] Create database trigger `trg_on_refund_processed` in `supabase/migrations/20260402000000_stock_automation.sql`
- [ ] T018 [US4] Implement original sale item lookup logic to identify product variants and stores from the refund's `sale_id`.
- [ ] T019 [US4] Verify the `movement_type` 'return' is correctly logged in `inventory_movements`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Enhancement, documentation, and final validation.

- [ ] T020 [P] Implement Framer Motion micro-animations for quantity changes in the dashboard.
- [ ] T021 [P] Update `docs/admin-guide.md` with stock management instructions.
- [ ] T022 Final E2E flow validation using `006-stock-balances-automation/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 & 2**: Parallel setup, but must be complete before any logic implementation.
- **US1 & US3 (P1)**: High priority. visibility (US1) is needed to verify automation (US3).
- **US2 & US4 (P2)**: Secondary features - depend on US1 infrastructure.

### Parallel Opportunities
- Frontend components ([P] tasks) can be built in parallel with database triggers.
- US2 (Manual Adjust) and US4 (Refunds) can be developed independently once US1 is stable.

---

## Implementation Strategy

### MVP First (User Stories 1 & 3)
1. Setup DB Schema + `update_stock_level` procedure.
2. Build `StockBalancesPage` for visibility.
3. Deploy PO receipt trigger for automatic restocking.
4. **STOP and VALIDATE**: Verify end-to-end receipt-to-inventory visibility.

### Incremental Delivery
- Add Manual Adjustments (US2) after MVP.
- Add Refund Automation (US4) last.
