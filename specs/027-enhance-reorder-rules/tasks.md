# Tasks: Reorder Rules UI/UX Enhancement, Virtualized SKU Selector & Server-Side Pagination

**Input**: Design documents from `specs/027-enhance-reorder-rules/`  
**Prerequisites**: [plan.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/plan.md), [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/spec.md), [research.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/research.md), [data-model.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/data-model.md), [contracts/](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/contracts/)  

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3], [US4])
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Validate dependencies and define core data schemas for pagination and metrics

- [X] T001 Inspect and verify environment dependencies (`@tanstack/react-virtual`, `@tanstack/react-table`, `react-i18next`, Prisma 7) in `package.json`
- [X] T002 [P] Setup Zod schemas for query parameters, paginated responses, and KPI metrics in `src/features/reorder-rules/data/schema.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend service and API routing for server-side query handling and pagination

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Implement server-side filtering, searching, sorting, pagination, and KPI metrics in `src/server/fns/reorder-rules.ts`
- [X] T004 Update API route to accept searchParams and forward typed query to backend in `src/routes/api/inventory/reorder-rules.ts`
- [X] T005 [P] Update client actions to forward query parameters to the API endpoint in `src/features/reorder-rules/data/actions.ts`
- [X] T006 [P] Update TanStack Query hook with pagination, search, and filter options in `src/features/reorder-rules/hooks/use-reorder-rules.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Paginated Reorder Rules Browsing with Server-Side Search & Filtering (Priority: P1) 🎯 MVP

**Goal**: Enable browsing and auditing replenishment reorder rules using responsive server-side pagination, searching, and filtering.

**Independent Test**: Load reorder rules page with thousands of records, execute text searches, navigate pages, change page size (10, 20, 50, 100), sort columns, and verify accurate counts and page slices.

### Tests for User Story 1
- [X] T007 [P] [US1] Unit and integration tests for server-side reorder rules query and pagination in `src/__tests__/reorder-rules-paging.test.ts`

### Implementation for User Story 1
- [X] T008 [P] [US1] Update table column definitions with sortable headers and status badges in `src/features/reorder-rules/components/columns.tsx`
- [X] T009 [US1] Implement server-side TanStack Table with `@tanstack/react-virtual` row virtualization and pagination controls in `src/features/reorder-rules/components/table.tsx`
- [X] T010 [US1] Wire pagination, search debouncing, and filter state in the main view in `src/features/reorder-rules/index.tsx`

**Checkpoint**: User Story 1 fully functional and testable independently (MVP ready)

---

## Phase 4: User Story 2 - On-Demand Paginated & Virtualized Product Variant Selection (Priority: P1)

**Goal**: Product variant selector searches, paginates, and virtualizes catalog items on demand using `@tanstack/react-virtual`.

**Independent Test**: Open New/Edit modal, type search keywords, scroll through virtualized list with smooth 60fps rendering, select variant and preserve selection.

### Tests for User Story 2
- [X] T011 [P] [US2] Component tests for virtualized variant picker in `src/__tests__/reorder-rule-variant-picker.test.tsx`

### Implementation for User Story 2
- [X] T012 [P] [US2] Build `ReorderRuleVariantPicker` with `@tanstack/react-virtual` and debounced server lookup in `src/features/reorder-rules/components/variant-picker.tsx`
- [X] T013 [US2] Integrate `ReorderRuleVariantPicker` into reorder rule creation and editing modal in `src/features/reorder-rules/components/rule-form-dialog.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently and integrate seamlessly

---

## Phase 5: User Story 3 - Full Internationalization (i18n) & Arabic RTL Localization (Priority: P2)

**Goal**: Translate 100% of static text in the Reorder Rules module into `react-i18next` dictionaries with English and Arabic coverage and RTL alignment.

**Independent Test**: Switch language to Arabic, verify all labels, column headers, dialog text, validation alerts, empty states, search placeholders, and pagination text render in Arabic with RTL layout.

### Tests for User Story 3
- [X] T014 [P] [US3] Unit tests for reorder rules i18n translation completeness and RTL keys in `src/__tests__/reorder-rules-localization.test.tsx`

### Implementation for User Story 3
- [X] T015 [P] [US3] Add comprehensive `reorderRules` translation dictionary to English bundle in `src/assets/i18n/en.json`
- [X] T016 [P] [US3] Add comprehensive `reorderRules` translation dictionary to Arabic bundle in `src/assets/i18n/ar.json`
- [X] T017 [US3] Replace remaining static text and apply RTL layout utilities in dialogs, primary buttons, and row actions in `src/features/reorder-rules/components/dialogs.tsx`, `src/features/reorder-rules/components/primary-buttons.tsx`, and `src/features/reorder-rules/components/row-actions.tsx`

**Checkpoint**: Reorder Rules module is 100% bilingual and adheres to bidirectional RTL/LTR standards

---

## Phase 6: User Story 4 - Polished Replenishment Dashboard UI/UX & Metrics Overview (Priority: P2)

**Goal**: Modern, visually coherent dashboard interface featuring replenishment KPI summaries (Total Rules, Active Rules, Inactive Rules, Configured Stores), clear loading skeletons, refined filter controls, and contextual empty states.

**Independent Test**: Inspect overview screen, verify KPI metric cards reflect current statistics, skeleton loaders prevent layout shifts, and empty states guide user with filter resets.

### Implementation for User Story 4
- [X] T018 [P] [US4] Create replenishment KPI metrics overview banner component in `src/features/reorder-rules/components/reorder-rules-metrics.tsx`
- [X] T019 [US4] Implement faceted filter toolbar (store filter, status filter, reset filters) in `src/features/reorder-rules/components/table.tsx`
- [X] T020 [US4] Integrate KPI metrics banner, skeleton loaders, and responsive empty states into `src/features/reorder-rules/index.tsx`

**Checkpoint**: All user stories complete, tested, and visually polished

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality audit, type validation, lint checks, and quickstart verification

- [X] T021 [P] Run linter and type-checker across backend and frontend reorder rules code in `src/features/reorder-rules/` and `src/server/fns/reorder-rules.ts`
- [X] T022 Run test suite via Vitest to verify all reorder rules tests pass in `src/__tests__/`
- [X] T023 Execute manual verification steps outlined in `specs/027-enhance-reorder-rules/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion. (MVP)
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion.
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion.
- **User Story 4 (Phase 6)**: Depends on User Story 1 and Foundational phase completion.
- **Polish (Phase 7)**: Depends on completion of all desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of other stories. Provides paginated rule browsing foundation.
- **User Story 2 (P1)**: Independent of table pagination; focuses on modal form variant selection.
- **User Story 3 (P2)**: Translation dictionaries can be authored in parallel with or prior to UI completion.
- **User Story 4 (P2)**: Enhances the main table view with metrics banner and toolbar facets.

### Parallel Opportunities

- All Setup tasks marked `[P]` (`T002`) can run in parallel.
- Foundational client updates (`T005`, `T006`) can run in parallel after `T003`.
- Test creation tasks (`T007`, `T011`, `T014`) can be written in parallel.
- Translation tasks (`T015`, `T016`) can be performed in parallel with component development.
- `ReorderRuleVariantPicker` (`T012`) and `ReorderRulesMetrics` (`T018`) can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`T001`-`T002`)
2. Complete Phase 2: Foundational (`T003`-`T006`)
3. Complete Phase 3: User Story 1 (`T007`-`T010`)
4. **STOP and VALIDATE**: Verify server-side pagination, search, and sorting on `http://localhost:5173/reorder-rules`.

### Incremental Delivery
1. Foundation + US1 → Server-side paginated reorder rules ledger (MVP)
2. Add US2 → Virtualized `@tanstack/react-virtual` product variant picker in create/edit modal
3. Add US3 → Full English and Arabic translations with RTL compliance
4. Add US4 → Executive replenishment KPI metrics banner and faceted filter toolbar
5. Polish → Verification against quickstart, Vitest test suite execution, and clean build
