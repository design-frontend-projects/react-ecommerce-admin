# Tasks Breakdown: POS Sales and Returns with Transaction Reference

**Feature**: POS Sales, returns and transaction references
**Plan**: [plan.md](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/013-pos-sale-returns-transactions/plan.md)
**Status**: Draft
**Generated**: 2026-04-07

## Implementation Strategy

We follow an **MVP-first** strategy, focusing on the core sale flow (US1) before adding complex return logic. All financial operations are performed within atomic transactions to ensure data consistency.

- **Phase 1**: Infrastructure & Schema (blocking)
- **Phase 2**: Standard Sale (US1) - Core feature
- **Phase 3**: Returns Foundation & Full Return (US2)
- **Phase 4**: Partial Return & Validation (US3)
- **Phase 5**: UX Polish & Final Audit

## Phase 1: Infrastructure & Data Model

- [ ] T001 Update `prisma/schema.prisma` to add `sales_invoice_id` and `sales_return_id` to `transactions` model
- [ ] T002 Update `prisma/schema.prisma` to add `sales_invoice_item_id` and `sales_return_item_id` to `transaction_details`
- [ ] T003 Update relations in `sales_invoices` and `sales_returns` in `prisma/schema.prisma`
- [ ] T004 [P] Run `pnpx prisma db push` to synchronize database schema
- [ ] T005 [P] Run `pnpx prisma generate` to update the local Prisma client

## Phase 2: Foundational Components

- [ ] T006 Define `SaleRequest` Zod schema for POS sale validation in `src/features/pos/validators/saleSchema.ts`
- [ ] T007 [P] Define `ReturnRequest` Zod schema for return validation in `src/features/pos/validators/returnSchema.ts`
- [ ] T008 [P] Create shared types for sale/return payloads in `src/features/pos/types/index.ts`

## Phase 3: User Story 1 - Standard POS Checkout

- [ ] T009 [US1] Create `saveSale` service logic with `prisma.$transaction` in `src/features/pos/services/saleService.ts`
- [ ] T010 [US1] Implement `sales_invoices` and `sales_invoice_items` creation in `saleService.ts`
- [ ] T011 [US1] Implement core `transactions` and `transaction_details` creation in `saleService.ts`
- [ ] T012 [US1] Create `createSaleAction` server action in `src/features/pos/actions/createSale.ts`
- [ ] T013 [US1] Connect `createSaleAction` to the Checkout button in `src/features/pos/components/CheckoutButton.tsx`
- [ ] T014 [US1] Implement success/error toast notifications in POS checkout flow

## Phase 4: User Story 2 - Full Sales Return

- [ ] T015 [US2] Implement `getInvoiceForReturn` service to fetch invoice with items in `src/features/pos/services/returnService.ts`
- [ ] T016 [US2] Create `saveReturn` service logic with `prisma.$transaction` in `src/features/pos/services/returnService.ts`
- [ ] T017 [US2] Implement `sales_returns` and `sales_return_items` creation for full returns in `returnService.ts`
- [ ] T018 [US2] Implement refund `transactions` record creation in `returnService.ts`
- [ ] T019 [US2] Create `createReturnAction` server action in `src/features/pos/actions/createReturn.ts`
- [ ] T020 [US2] Create `ReturnSearch` component to find invoices by ID/Number in `src/features/pos/components/ReturnSearch.tsx`

## Phase 5: User Story 3 - Partial Sales Return

- [ ] T021 [US3] Enhance `saveReturn` service to calculate "available to return" quantity per item
- [ ] T022 [US3] Add validation logic to `saveReturn` to prevent returning more than original quantity
- [ ] T023 [US3] Implement status updates in `sales_invoices` (partially_returned vs returned) in `returnService.ts`
- [ ] T024 [US3] Create `ReturnForm` component for item-by-item selection in `src/features/pos/components/ReturnForm.tsx`
- [ ] T025 [US3] Integrate `ReturnForm` with `createReturnAction` for partial return processing

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T026 Add loading states and skeletons to the Return search flow
- [ ] T027 Optimize `transaction_details` mapping for performance in high-volume sales
- [ ] T028 Perform a final end-to-end walkthrough from Initial Sale to Multiple Partial Returns
- [ ] T029 [P] Update feature documentation and diagrams if schema evolved significantly

## Dependencies & Parallel Execution

### Dependency Order
`Infrastructure (P1)` -> `Foundational (P2)` -> `US1 (P3)` -> `US2 (P4)` -> `US3 (P5)` -> `Polish (P6)`

### Parallel Opportunities
- **T004**, **T005**: Infrastructure setup can run while Zod schemas are being defined.
- **T007**, **T008**: Return schema and shared types can be built while Sale logic is in progress.
- **T020**: The `ReturnSearch` component can be designed while the backend return service is being developed.
- **T029**: Final documentation can be updated in parallel with polish tasks.
