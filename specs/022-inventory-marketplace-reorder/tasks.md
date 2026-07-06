# Tasks: Marketplace Inventory & Auto-Reordering

**Input**: Design documents from `/specs/022-inventory-marketplace-reorder/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `prisma/schema.prisma`, `src/features/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification

- [ ] T001 Verify project structure and specs path specs/022-inventory-marketplace-reorder/spec.md
- [ ] T002 [P] Verify Prisma and Next.js dev dependencies in package.json
- [ ] T003 [P] Verify ESLint and Prettier rules configurations in eslint.config.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema modifications that MUST be complete before user stories can begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Add is_marketplace Boolean flag to products and inventory models in prisma/schema.prisma
- [ ] T005 [P] Add is_preferred Boolean flag to suppliers model in prisma/schema.prisma
- [ ] T006 [P] Add auto_reorder Boolean flag to rbac_tenants model in prisma/schema.prisma
- [ ] T007 Run npx prisma validate and npx prisma generate to update generated Prisma Client types

**Checkpoint**: Foundation ready - database models and type definitions are successfully generated.

---

## Phase 3: User Story 1 - Marketplace Products (Priority: P1) 🎯 MVP

**Goal**: Mark products and inventory records as marketplace products to distinguish them from standard store inventory.

**Independent Test**: Verify that query filters only retrieve marketplace products when querying with the `is_marketplace` parameter.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Add is_marketplace validation to productSchema in src/features/products/data/schema.ts
- [ ] T009 [P] [US1] Add is_marketplace validation to baseProductSchema in src/features/products/data/product-wizard-schema.ts
- [ ] T010 [US1] Forward is_marketplace field in handleCreate and onSubmitDirect in src/features/products/components/product-wizard-dialog.tsx

**Checkpoint**: User Story 1 is fully functional. Marketplace flags are validated and stored correctly.

---

## Phase 4: User Story 2 - Preferred Suppliers (Priority: P2)

**Goal**: Toggle and save preferred suppliers list in tenant settings.

**Independent Test**: Save a supplier as preferred in the action dialog, verify the database field `is_preferred` is set to true, and check that preferred status displays correctly in the dashboard list.

### Implementation for User Story 2

- [x] T011 [P] [US2] Add is_preferred to Supplier and SupplierInput TypeScript interfaces in src/features/suppliers/hooks/use-suppliers.ts
- [x] T012 [P] [US2] Add is_preferred validation to formSchema in src/features/suppliers/components/supplier-action-dialog.tsx
- [x] T013 [US2] Update form initialization and reset logic in src/features/suppliers/components/supplier-action-dialog.tsx

**Checkpoint**: User Story 2 is complete. Managers can mark and manage preferred suppliers.

---

## Phase 5: User Story 3 - Automatic Inventory Reordering (Priority: P3)

**Goal**: Automate purchase order generation for low-stock items from preferred suppliers.

**Independent Test**: Enable auto-reorder, lower a product's stock below its reorder level, and check that a pending purchase order is generated for the preferred supplier.

### Implementation for User Story 3

- [x] T014 [P] [US3] Add auto_reorder validation and default values to BusinessSettingsSchema in src/features/settings/data/schema.ts
- [x] T015 [US3] Create reorder trigger function to monitor stock levels against reorder levels in src/features/inventory/data/actions.ts
- [x] T016 [US3] Implement purchase order auto-generation service for preferred suppliers in src/features/purchase-orders/data/actions.ts

**Checkpoint**: User Story 3 is complete. Auto-reordering functions end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and performance verification across the new features

- [x] T017 Run TypeScript compilation check via pnpm tsc -b to ensure no compilation issues remain
- [x] T018 Run code formatter via pnpm run format to format modified files
- [x] T019 Update quickstart.md documentation to list database push instructions

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. Blocks all subsequent User Story phases.
- **User Stories (Phases 3-5)**: Depend on Phase 2. Can be worked on in parallel.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities
- Foundational tasks T004, T005, and T006 can run in parallel.
- User Story 1 validation tasks (T008, T009) can run in parallel.
- User Story 2 tasks (T011, T012) can run in parallel.
- Once Phase 2 is complete, US1 and US2 implementation can proceed in parallel.

---

## Parallel Example: User Story 1 & 2

```bash
# Launch model validations in parallel:
Task: "Add is_marketplace validation to productSchema in src/features/products/data/schema.ts"
Task: "Add is_preferred to Supplier and SupplierInput TypeScript interfaces in src/features/suppliers/hooks/use-suppliers.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Setup and Foundational schema updates.
2. Complete User Story 1 (Marketplace Products flag).
3. Verify that marketplace items are correctly saved and filtered.
4. Deliver/Deploy MVP before proceeding.
