# Tasks: Stock Adjustments

**Input**: Design documents from `/specs/023-stock-adjustments/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, basic folder structures, navigation and translation setup.

- [ ] T001 Create feature directory structure under `src/features/stock-adjustments/`
- [ ] T002 [P] Register translation key `"stockAdjustments"` in `src/assets/i18n/en.json` and `src/assets/i18n/ar.json`
- [ ] T003 [P] Add navigation link for "Stock Adjustments" to `src/components/layout/data/sidebar-data.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema definition, database push, Zod validation schemas, and React UI contexts.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Define the database schema for `stock_adjustments` and `stock_adjustment_items` in `prisma/schema.prisma`
- [ ] T005 Run database setup commands to push changes: `npx prisma validate && npx prisma generate && npx prisma db push`
- [ ] T006 [P] Add schema validations in Zod under `src/features/stock-adjustments/data/schema.ts`
- [ ] T007 Create React context provider for UI state in `src/features/stock-adjustments/components/stock-adjustments-provider.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Manual Stock Entry (Priority: P1) 🎯 MVP

**Goal**: Allow users with authorized roles to adjust stock quantities manually and record the movements.

**Independent Test**: Create a manual adjustment from the UI, verify database updates on `stock_balances` and `inventory_movements`, and see the logged adjustment batch in the listing dashboard.

### Implementation for User Story 1

- [ ] T008 [US1] Create service layer functions for reading stock and saving manual adjustments in `src/features/stock-adjustments/data/index.ts`
- [ ] T009 [US1] Create custom hook `useStockAdjustments` in `src/features/stock-adjustments/hooks/use-stock-adjustments.ts` for TanStack Query actions
- [ ] T010 [US1] Create page entry component `src/features/stock-adjustments/index.tsx`
- [ ] T011 [US1] Create listing table component in `src/features/stock-adjustments/components/stock-adjustments-table.tsx` to list past adjustments
- [ ] T012 [US1] Create manual stock adjustment form/dialog in `src/features/stock-adjustments/components/manual-adjustment-dialog.tsx`
- [ ] T013 [US1] Create router path in `src/routes/_authenticated/stock-adjustments/index.tsx` linking to the feature entry component

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently (MVP).

---

## Phase 4: User Story 3 - Inventory Counts / Stocktaking (Priority: P1)

**Goal**: Allow periodic inventory counts and reconcile discrepancies (Physical vs. System snapshot).

**Independent Test**: Start a count session, enter physical counts, review calculated discrepancies, and reconcile to apply changes to stock balances.

### Implementation for User Story 3

- [ ] T014 [US3] Create database functions for starting, saving, and reconciling count sessions in `src/features/stock-adjustments/data/index.ts`
- [ ] T015 [US3] Add stocktake session queries and mutations to `src/features/stock-adjustments/hooks/use-stock-adjustments.ts`
- [ ] T016 [US3] Create stocktake wizard dialog/form `src/features/stock-adjustments/components/stocktake-wizard.tsx` to let users input counts
- [ ] T017 [US3] Create reconciliation screen `src/features/stock-adjustments/components/stocktake-reconciliation.tsx` to display discrepancies and finalize adjustments

**Checkpoint**: At this point, User Stories 1 AND 3 should work independently.

---

## Phase 5: User Story 2 - Damaged Goods Adjustment (Priority: P2)

**Goal**: Record stock reductions specifically due to damaged or expired goods.

**Independent Test**: Write off items as damaged, verify stock is reduced, and confirm the movement logs capture shrinkage costs based on average cost.

### Implementation for User Story 2

- [ ] T018 [US2] Create database function for recording damaged/expired goods in `src/features/stock-adjustments/data/index.ts`
- [ ] T019 [US2] Add damage write-off mutation to `src/features/stock-adjustments/hooks/use-stock-adjustments.ts`
- [ ] T020 [US2] Create dialog component `src/features/stock-adjustments/components/damage-adjustment-dialog.tsx` with fields for product selection, damage quantity, and reason

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, responsive adjustments, and quickstart verification.

- [ ] T021 [P] Implement responsive UI fixes for tables and dialogs in `src/features/stock-adjustments/components/`
- [ ] T022 Code cleanup and transaction optimizations in `src/features/stock-adjustments/data/index.ts`
- [ ] T023 Run quickstart.md validation to ensure database and Zod schemas match

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phases 3-5)**: All depend on Foundational phase completion.
  - User Story 1 (P1) and User Story 3 (P1) can proceed in parallel once Foundation is complete.
  - User Story 2 (P2) can proceed in parallel or after P1 stories.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities

- Setup tasks `T002` and `T003` can run in parallel.
- Foundational Zod schema creation `T006` and Context creation `T007` can run in parallel.
- Once Foundation is complete, User Story 1 (`T008`–`T013`) and User Story 3 (`T014`–`T017`) can be implemented in parallel.
- Zod schema validations, context setups, and simple UI components can be developed concurrently.

---

## Parallel Example: User Story 1

```bash
# Launch models and schema creation:
Task: "Add schema validations in Zod under src/features/stock-adjustments/data/schema.ts"
Task: "Create React context provider for UI state in src/features/stock-adjustments/components/stock-adjustments-provider.tsx"

# Build service files and custom hooks in parallel:
Task: "Create service layer functions for reading stock and saving manual adjustments in src/features/stock-adjustments/data/index.ts"
Task: "Create custom hook useStockAdjustments in src/features/stock-adjustments/hooks/use-stock-adjustments.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Verify manual stock entry works on its own.
5. Deploy/demo if ready (MVP).

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!).
3. Add User Story 3 → Test independently → Deploy/Demo (Stocktaking).
4. Add User Story 2 → Test independently → Deploy/Demo (Damaged goods).
5. Polish UX and optimize transactions.
