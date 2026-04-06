# Tasks: POS Checkout and Sales Management

**Input**: Design documents from `/specs/010-pos-checkout-module/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included in this plan (using Vitest) to ensure the standard 100% successful checkout requirement is met.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create feature directory structure for `src/features/pos` and `src/features/sales`
- [x] T002 [P] Configure API routes for POS checkout in `src/app/api/pos/checkout/route.ts`
- [x] T003 [P] Add "Sales Management" menu item to the main sidebar in `src/components/layout/Sidebar.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Generate Prisma client types for sales and transaction models using `npx prisma generate`
- [x] T005 [P] Implement `InvoiceNoGenerator` utility for unique serials in `src/lib/utils/invoice-generator.ts`
- [x] T006 [P] Create Zod validation schema for checkout requests in `src/features/pos/schemas/checkout.ts`
- [x] T007 Define shared TypeScript interfaces for checkout and sales in `src/features/pos/types/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Completing a POS Sale (Priority: P1) 🎯 MVP

**Goal**: Enable cashiers to finish a sale and persist data across multiple tables atomically.

**Independent Test**: Complete a mock checkout and verify records in `sales_invoices`, `sales_invoice_items`, `transactions`, `transaction_details`, and `inventory_movements`.

### Tests for User Story 1
- [x] T008 [P] [US1] Create unit tests for transactional checkout logic in `src/features/pos/services/__tests__/CheckoutService.test.ts`
- [x] T009 [US1] Create API integration test for `/api/pos/checkout` in `tests/api/checkout.test.ts`

### Implementation for User Story 1
- [x] T010 [US1] Implement core `CheckoutService` with Prisma transaction logic in `src/features/pos/services/CheckoutService.ts`
- [x] T011 [US1] Implement POST handler for checkout in `src/app/api/pos/checkout/route.ts`
- [x] T012 [P] [US1] Create `CheckoutModal` component for payment selection in `src/features/pos/components/CheckoutModal.tsx`
- [x] T013 [US1] Integrate `CheckoutModal` with POS main interface and handle API submission
- [x] T014 [US1] Add inventory movement recording to the checkout transaction block

**Checkpoint**: User Story 1 is functional. Sales are now recorded in the new standardized tables.

---

## Phase 4: User Story 2 - Sales Management Dashboard (Priority: P1)

**Goal**: Provide a dashboard for managers to view and audit sales invoices.

**Independent Test**: Navigate to the Sales module and see a list of recent invoices with correct totals.

### Implementation for User Story 2
- [x] T015 [Story] [US2] Create server action/API for fetching paginated sales invoices in `src/features/sales/api/get-invoices.ts`
- [x] T016 [P] [Story] [US2] Implement `useInvoices` hook using TanStack Query in `src/features/sales/hooks/use-invoices.ts`
- [x] T017 [P] [Story] [US2] Create `InvoicesTable` component using TanStack Table v8 in `src/features/sales/components/InvoicesTable.tsx`
- [x] T018 [Story] [US2] Build main `InvoicesPage` layout in `src/features/sales/pages/InvoicesPage.tsx`
- [x] T019 [P] [Story] [US2] Create `InvoiceDetailView` for viewing line items in `src/features/sales/components/InvoiceDetailView.tsx`

**Checkpoint**: User Story 2 is functional. Managers can browse all recorded sales.

---

## Phase 5: User Story 3 - Searching and Filtering Invoices (Priority: P2)

**Goal**: Allow users to quickly find specific invoices by number or date range.

**Independent Test**: Search for a known invoice number and verify only that record is displayed.

### Implementation for User Story 3
- [x] T020 [Story] [US3] Update `getInvoices` API to support search and range filters
- [x] T021 [P] [Story] [US3] Implement `InvoicesFilter` component with date and status filters in `src/features/sales/components/InvoicesFilter.tsx`
- [x] T022 [P] [Story] [US3] Add search input field to the invoices dashboard header
- [x] T023 [Story] [US3] Integrate filter state with `useInvoices` hook and table UI

**Checkpoint**: All user stories are complete. The module is fully searchable and filterable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T024 [P] Add loading skeletons for the Invoices table and modal transitions
- [ ] T025 Implement global error boundary for the Sales module in `src/features/sales/components/SalesErrorBoundary.tsx`
- [ ] T026 [P] Documentation: Update project README with details on the new POS-Sales integration
- [ ] T027 Final validation: Run all tests and verify SC-001 (Audit trail completeness)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all subsequent phases.
- **Phase 3 (US1)**: First priority - provides the data for US2/US3.
- **Phase 4 (US2)**: Can be developed in parallel with US1 if mock data is available, but ideally follows US1.
- **Phase 5 (US3)**: Builds upon the UI/API created in US2.

### User Story Dependencies
- **US1 (P1)**: Core functionality.
- **US2 (P1)**: High priority for audit.
- **US3 (P2)**: Enhancement for usability.

### Parallel Opportunities
- T005 and T006 can be done together.
- T012 can be styled while T010 is being implemented.
- T017 and T019 (Table vs Detail view) can be built in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch models and services for User Story 1 together:
Task: "Implement core CheckoutService with Prisma transaction logic in src/features/pos/services/CheckoutService.ts"
Task: "Create CheckoutModal component for payment selection in src/features/pos/components/CheckoutModal.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Setup + Foundational.
2. Implement `CheckoutService` and API endpoint.
3. Verify sale persistence in all 5 tables.

### Incremental Delivery
1. Delivery 1: POS Checkout (Data recording).
2. Delivery 2: Sales Dashboard (Visibility).
3. Delivery 3: Filter & Search (Efficiency).
