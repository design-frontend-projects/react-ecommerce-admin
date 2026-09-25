# Tasks: Enhance Inventory Movements UI/UX & Server-Side Pagination

**Input**: Design documents from `/specs/025-enhance-inventory-movements/`
**Prerequisites**: [plan.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/025-enhance-inventory-movements/plan.md), [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/025-enhance-inventory-movements/spec.md), [data-model.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/025-enhance-inventory-movements/data-model.md), [contracts/movements-api.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/025-enhance-inventory-movements/contracts/movements-api.md)

**Tests**: Unit tests included per component and service slice using Vitest and React Testing Library.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish data schemas, types, and localization keys across the project

- [X] T001 Define `MovementQueryParams`, `MovementSummaryStats`, and `PaginatedMovementsResult` schemas in `src/features/inventory-movements/data/schema.ts`
- [X] T002 [P] Add internationalization strings for pagination, filters, KPI cards, and audit drawer in `src/assets/i18n/en.json` and `src/assets/i18n/ar.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend query and frontend data layer that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Implement server-side pagination, text search, filtering, and aggregate summary metrics in `src/server/fns/inventory-movements.ts`
- [X] T004 [P] Update API route handler to parse pagination and filter query params in `src/routes/api/inventory/movements.ts`
- [X] T005 Update client-side data actions to fetch paginated movements with Supabase fallback in `src/features/inventory-movements/data/actions.ts`
- [X] T006 [P] Update TanStack Query hook with query key synchronization in `src/features/inventory-movements/hooks/use-inventory-movements.ts`

**Checkpoint**: Foundation ready - backend pagination and data fetching contract are operational.

---

## Phase 3: User Story 1 - Paginated Inventory Ledger Browsing (Priority: P1) 🎯 MVP

**Goal**: Deliver scalable, server-side paginated browsing of inventory movements with page size controls (10, 20, 50, 100), loading skeletons, and URL persistence.

**Independent Test**: Load the inventory movements page with over 5,000 movements in the database. Verify that only 20 records load initially, page navigation loads subsequent chunks in under 600ms, page size changing recalculates total pages, and URL reflects `page` and `pageSize`.

### Tests for User Story 1

- [X] T007 [P] [US1] Create unit test for paginated table rendering, skeleton loading, and page navigation in `src/__tests__/inventory-movements-pagination.test.tsx`

### Implementation for User Story 1

- [X] T008 [P] [US1] Create TanStack Table column definitions with formatted dates and quantities in `src/features/inventory-movements/components/inventory-movements-columns.tsx`
- [X] T009 [US1] Implement server-paginated TanStack Table with manual pagination controls and skeleton rows in `src/features/inventory-movements/components/inventory-movements-table.tsx`
- [X] T010 [US1] Connect URL search parameter synchronization for pagination state in `src/features/inventory-movements/index.tsx`

**Checkpoint**: At this point, User Story 1 is fully functional and delivers a viable MVP!

---

## Phase 4: User Story 2 - Comprehensive Faceted Filtering & Search (Priority: P1)

**Goal**: Enable warehouse managers and auditors to search by SKU, variant name, barcode, or reference code, and filter by movement type, location, and date range.

**Independent Test**: Apply search term "TSHIRT", movement type "purchase", location "CDW", and a 7-day date range. Verify all returned rows match all criteria, debounced input waits 300ms, and active page automatically resets to page 1.

### Tests for User Story 2

- [X] T011 [P] [US2] Create unit test for search debounce, filter selection, and filter reset in `src/__tests__/inventory-movements-filters.test.tsx`

### Implementation for User Story 2

- [X] T012 [P] [US2] Create toolbar component with debounced search, movement type filter, location selector, date range picker, and reset button in `src/features/inventory-movements/components/inventory-movements-toolbar.tsx`
- [X] T013 [US2] Integrate filter toolbar state with URL query parameters and auto-reset page to 1 on filter modification in `src/features/inventory-movements/index.tsx`

**Checkpoint**: User Stories 1 and 2 work seamlessly together, allowing fast paginated search across large ledgers.

---

## Phase 5: User Story 3 - Visual Ledger UX, Color-Coded Deltas & Audit Inspection (Priority: P2)

**Goal**: Provide clear visual hierarchy with semantic color badges (+green inbound, -red outbound), and a detailed slide-out audit Sheet for deep transaction inspection.

**Independent Test**: Click any movement row in the table. Verify the slide-out drawer opens displaying full movement attributes (batch/serial, before/after balances, unit cost, total valuation, user notes, and source document deep link).

### Tests for User Story 3

- [X] T014 [P] [US3] Create unit test for inspection drawer opening, field rendering, and close interaction in `src/__tests__/inventory-movements-drawer.test.tsx`

### Implementation for User Story 3

- [X] T015 [P] [US3] Add semantic delta badges and document reference links in `src/features/inventory-movements/components/inventory-movements-columns.tsx`
- [X] T016 [US3] Implement slide-out audit inspection Sheet in `src/features/inventory-movements/components/inventory-movements-drawer.tsx`
- [X] T017 [US3] Connect row click event in table to trigger the audit drawer in `src/features/inventory-movements/index.tsx`

**Checkpoint**: User Stories 1, 2, and 3 are complete, giving operators both high-speed browsing and deep audit inspection.

---

## Phase 6: User Story 4 - Summary Metric Ribbon & Ledger Data Export (Priority: P3)

**Goal**: Display an executive KPI summary ribbon (Total Movements, Inbound Qty, Outbound Qty, Net Delta) and allow filtered dataset export to CSV.

**Independent Test**: Verify that the 4 KPI cards display accurate server-computed velocity metrics for the active filter set. Click "Export CSV" and verify that a sanitized UTF-8 CSV downloads with all matching filtered records.

### Tests for User Story 4

- [X] T018 [P] [US4] Create unit test for KPI summary card calculations and CSV export data formatting in `src/__tests__/inventory-movements-kpi-export.test.tsx`

### Implementation for User Story 4

- [X] T019 [P] [US4] Create executive KPI summary ribbon component in `src/features/inventory-movements/components/inventory-movements-kpi-ribbon.tsx`
- [X] T020 [P] [US4] Implement UTF-8 CSV exporter utility in `src/features/inventory-movements/components/inventory-movements-export.ts`
- [X] T021 [US4] Embed KPI ribbon and Export CSV action into table toolbar and layout in `src/features/inventory-movements/index.tsx`

**Checkpoint**: All user stories functional and integrated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Ensure internationalization, responsive layouts, accessibility, and test suite verification

- [X] T022 [P] Verify and polish Arabic RTL layout, alignment, and translation strings across all components in `src/features/inventory-movements/`
- [X] T023 Verify mobile responsiveness (375px to 768px viewports) with horizontal scroll and responsive pagination in `src/features/inventory-movements/components/inventory-movements-table.tsx`
- [X] T024 Run full test suite with `pnpm test` and verify zero TypeScript diagnostics with `pnpm run lint`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational (Phase 2) completion.
  - User Story 1 (P1): Foundational for core UI table.
  - User Story 2 (P1): Can proceed after US1 table structure or in parallel.
  - User Story 3 (P2): Depends on US1 table columns and row click handlers.
  - User Story 4 (P3): Integrates with toolbar and server summary statistics.
- **Polish (Phase 7)**: Depends on completion of desired user stories.

### Parallel Opportunities

- T001 and T002 can run in parallel during Setup.
- T004 and T006 can run in parallel with T003/T005 in Foundational phase.
- In US1: T007 (test) and T008 (columns) can run in parallel.
- In US2: T011 (test) and T012 (toolbar component) can run in parallel.
- In US3: T014 (test) and T015 (delta badges) can run in parallel.
- In US4: T018 (test), T019 (KPI ribbon), and T020 (CSV exporter) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`schema.ts`, i18n keys)
2. Complete Phase 2: Foundational (`inventory-movements.ts` server function, API route, client actions, hook)
3. Complete Phase 3: User Story 1 (`inventory-movements-columns.tsx`, `inventory-movements-table.tsx`, `index.tsx`)
4. **Validate MVP**: Browse paginated ledger with page size controls.

### Incremental Delivery

1. Phase 1 + 2 → Foundational data pipeline ready.
2. Phase 3 (US1) → MVP paginated table ready.
3. Phase 4 (US2) → Faceted filtering and debounced search enabled.
4. Phase 5 (US3) → Visual badges & slide-out audit drawer enabled.
5. Phase 6 (US4) → Executive KPI ribbon & CSV export enabled.
6. Phase 7 → RTL polish and end-to-end test verification.
