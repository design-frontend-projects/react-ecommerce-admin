# Tasks: Enhance Product and Variants Definition

**Input**: Design documents from `/specs/005-enhance-product-variants/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD Mandatory as per Principle 1 in plan.md. Write tests first and ensure they fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and feature scaffolding

- [ ] T001 Initialize Zustand store for product wizard in `src/features/products/store/useProductWizardStore.ts`
- [ ] T002 [P] Define TypeScript interfaces for Product and Variants based on Prisma schema in `src/features/products/types/product.ts`
- [ ] T003 [P] Create initial directory structure for product feature in `src/features/products/{components,services,hooks,store,schemas,actions}`
- [ ] T004 [P] Create Wizard layout container with step indicator in `src/features/products/components/WizardContainer.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic and validation that MUST be complete before user story implementation

- [ ] T005 [P] Implement Zod validation schemas for Step 1 (Base) and Step 2 (Variants) in `src/features/products/schemas/productSchemas.ts`
- [ ] T006 [P] Create Prisma service with `create` and `get` methods for products in `src/features/products/services/productService.ts`
- [ ] T007 Implement Server Action for single-transaction product and variant creation in `src/features/products/actions/create-product-with-variants.ts`
- [ ] T008 [P] Configure TanStack Query mutation for product creation in `src/features/products/hooks/useCreateProductMutation.ts`
- [ ] T009 Create main product creation page route in `src/app/admin/products/new/page.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Base Product (Priority: P1) 🎯 MVP

**Goal**: Store manager defines general information (Name, Category, SKU) in Step 1.

**Independent Test**: Complete Step 1, verify state is correctly saved in Zustand store, and "Next" button enables Step 2.

### Tests for User Story 1 (TDD)
- [ ] T010 [P] [US1] Create unit tests for `BaseProductSchema` and `FullProductWizardSchema` in `src/features/products/schemas/__tests__/productSchemas.test.ts`
- [ ] T011 [P] [US1] Create unit tests for `useProductWizardStore` initial state and updates in `src/features/products/store/__tests__/useProductWizardStore.test.ts`

### Implementation for User Story 1
- [ ] T012 [US1] Implement `ProductBaseForm` using `react-hook-form` in `src/features/products/components/ProductBaseForm.tsx`
- [ ] T013 [US1] Integrate `CategorySelect` component with data from Prisma in `src/features/products/components/CategorySelect.tsx`
- [ ] T014 [US1] Add "Next Step" logic to validate and persist Step 1 data to Zustand in `src/features/products/components/ProductBaseForm.tsx`
- [ ] T015 [US1] Integrate `ProductBaseForm` into `WizardContainer` in `src/features/products/components/WizardContainer.tsx`

**Checkpoint**: User Story 1 is functional: manager can enter base info and proceed to Step 2.

---

## Phase 4: User Story 2 - Define Multi-Variant Specifications (Priority: P1)

**Goal**: Manager adds multiple variants (SKU, Price, Stock) in Step 2.

**Independent Test**: Add 2+ variants in Step 2, verify individual validation for each row, and confirm all data is correctly collected for submission.

### Tests for User Story 2 (TDD)
- [ ] T016 [P] [US2] Create unit tests for `VariantSchema` in `src/features/products/schemas/__tests__/productSchemas.test.ts`
- [ ] T017 [P] [US2] Create integration test for `create-product-with-variants` action in `src/features/products/actions/__tests__/create-product.test.ts`

### Implementation for User Story 2
- [ ] T018 [US2] Implement `ProductVariantsForm` using `useFieldArray` in `src/features/products/components/ProductVariantsForm.tsx`
- [ ] T019 [US2] [P] Create `VariantRow` component for dynamic row rendering in `src/features/products/components/VariantRow.tsx`
- [ ] T020 [US2] Implement "Add Variant" and "Remove Variant" logic in `src/features/products/components/ProductVariantsForm.tsx`
- [ ] T021 [US2] Connect "Submit" button to `useCreateProductMutation` in `src/features/products/components/ProductVariantsForm.tsx`
- [ ] T022 [US2] Integrate `ProductVariantsForm` into `WizardContainer` in `src/features/products/components/WizardContainer.tsx`

**Checkpoint**: User Story 2 is functional: manager can add multiple variants and submit the entire product.

---

## Phase 5: User Story 3 - Variant-Level Inventory Tracking (Priority: P2)

**Goal**: Track stock levels for each specific variant separately.

**Independent Test**: Create a product with 2 variants, verify stock levels are independent in the database, and test stock updates.

### Tests for User Story 3 (TDD)
- [ ] T023 [P] [US3] Create unit tests for `inventoryService` in `src/features/products/services/__tests__/inventoryService.test.ts`

### Implementation for User Story 3
- [ ] T024 [US3] Ensure `stock_quantity` and `min_stock` from wizard are persisted to `product_variants` in `src/features/products/actions/create-product-with-variants.ts`
- [ ] T025 [P] [US3] Create `inventoryService.updateVariantStock` method in `src/features/products/services/inventoryService.ts`
- [ ] T026 [US3] Implement variant stock listing component for testing in `src/features/products/components/VariantStockStatus.tsx`

**Checkpoint**: User Story 3 is functional: inventory is correctly linked and manageable at the variant level.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UX improvements, security, and final validation

- [ ] T027 [P] Add loading overlays and success/error toasts for wizard flow in `src/features/products/components/WizardContainer.tsx`
- [ ] T028 [P] Implement Supabase RLS policies for `products` and `product_variants` in `prisma/migrations/xxxx_add_rls_policies.sql`
- [ ] T029 Configure automatic audit logging for variant creations in `src/features/products/services/auditService.ts`
- [ ] T030 [P] Documentation: Update `README.md` with new product creation flow details
- [ ] T031 Run `quickstart.md` validation to ensure end-to-end flow works correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- **T001-T004** (Setup) can run in parallel.
- **T005-T008** (Foundational) can run in parallel once T001-T004 are done.
- **T010-T011** (US1 Tests) can run in parallel as they only depend on schemas/store.
- **T016-T017** (US2 Tests) and **T023** (US3 Tests) can run in parallel.
- **T027-T030** (Polish) can run in parallel.

---

## Parallel Example: Setup & Foundation

```bash
# Define types and store simultaneously
Task: "Initialize Zustand store in src/features/products/store/useProductWizardStore.ts"
Task: "Define TypeScript interfaces in src/features/products/types/product.ts"

# Write schemas and services simultaneously
Task: "Implement Zod validation schemas in src/features/products/schemas/productSchemas.ts"
Task: "Create Prisma service in src/features/products/services/productService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Step 1)
4. Complete Phase 4: User Story 2 (Step 2 + Submission)
5. **STOP and VALIDATE**: Test basic product creation with variants.

### Incremental Delivery

1. Foundation ready (Phase 1 & 2)
2. MVP ready (Phase 3 & 4)
3. Inventory tracking ready (Phase 5)
4. Polish and Security (Phase 6)
