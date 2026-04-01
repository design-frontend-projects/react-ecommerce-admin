# Tasks: Captain POS & Promotions

**Input**: Design documents from `/specs/004-pos-promo-refund/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure for components/pos and hooks in src/features/respos/
- [ ] T002 [P] Configure initial state for applied promotions in src/stores/respos-store.ts
- [ ] T003 [P] Add necessary lucide-react icons and shadcn/ui components (Input, Dialog, Badge)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T004 Implement `useOrderCalc` hook for centralized total/tax/discount logic in src/features/respos/hooks/use-order-calc.ts
- [ ] T005 [P] Setup Supabase types for res_promotions and res_orders in src/features/respos/types/index.ts
- [ ] T006 [P] Refactor `promotion-validator.ts` to strictly use the validated field names in src/features/respos/lib/promotion-validator.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Captain Table-Side Ordering (Priority: P1) 🎯 MVP

**Goal**: Captain can take orders and send to kitchen with a premium UI experience.

**Independent Test**: Add items to a table's cart in POS and verify "Send to Kitchen" updates the table status in the database.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Build category-based menu navigation in src/features/respos/pages/pos.tsx
- [ ] T008 [P] [US1] Implement premium cart item cards with quantity controls in src/features/respos/components/pos/cart-item.tsx
- [ ] T009 [US1] Integrate `useOrderCalc` into the OrderPanel in src/features/respos/pages/pos.tsx
- [ ] T010 [US1] Implement "Send to Kitchen" animation and mutation and verify in src/features/respos/pages/pos.tsx

**Checkpoint**: User Story 1 (Ordering) is functional.

---

## Phase 4: User Story 2 - Intelligent Promotions (Priority: P1)

**Goal**: Apply and validate promo codes with real-time feedback and discount calculation.

**Independent Test**: Enter a valid promo code (e.g., 'SAVE10') and verify the subtotal decreases correctly in the UI.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Create premium `PromoInput` component with validation states in src/features/respos/components/pos/promo-input.tsx
- [ ] T012 [US2] Implement `usePromotion` hook for code application logic in src/features/respos/hooks/use-promotion.ts
- [ ] T013 [US2] Integrate `PromoInput` into the POS sidebar in src/features/respos/pages/pos.tsx
- [ ] T014 [US2] Update order placement mutation to include `applied_promotion_id` and `discount_amount` in src/features/respos/api/mutations.ts

**Checkpoint**: User Story 2 (Promotions) is functional.

---

## Phase 5: User Story 3 - Order History & Admin Refund (Priority: P2)

**Goal**: View recent orders and allow admins to trigger manual refunds.

**Independent Test**: As an admin, click "Refund" on an order and verify its status changes to `refunded` in Supabase.

### Implementation for User Story 3

- [ ] T015 [P] [US3] Create `OrderHistoryPanel` for the POS sidebar in src/features/respos/components/pos/order-history-panel.tsx
- [ ] T016 [P] [US3] Build `AdminRefundDialog` with role protection in src/features/respos/components/pos/refund-dialog.tsx
- [ ] T017 [US3] Implement `refundOrder` mutation in src/features/respos/api/mutations.ts
- [ ] T018 [US3] Add the Refund button to the Order history list with access control in src/features/respos/components/pos/order-history-panel.tsx

**Checkpoint**: User Story 3 (Refunds) is functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final aesthetics, micro-interactions, and documentation.

- [ ] T019 [P] Add Framer Motion transitions for cart additions and drawer opens
- [ ] T020 [P] Implement toast notifications for all POS actions (Order sent, Promo applied, Refunded) in src/features/respos/pages/pos.tsx
- [ ] T021 Final audit of RLS policies for res_orders and res_promotions
- [ ] T022 Update quickstart.md with actual UI screenshots if possible

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T001-T003 - BLOCKS user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
  - US1 (Ordering) and US2 (Promotions) can proceed in parallel.
  - US3 depends on orders being placeable (US1).

### Parallel Opportunities

- T002, T003 (Infrastructure)
- T005, T006 (Backend config)
- T007, T008 (UI components)
- T011, T015 (Sidebar features)

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Setup and Foundation.
2. Build User Story 1 (Ordering).
3. Build User Story 2 (Promotions).
4. **VALIDATE**: Ensure orders can be sent with correct totals.

### Incremental Delivery

1. Foundation -> Stable base.
2. US1 + US2 -> Primary value (The "POS Experience").
3. US3 -> Secondary value (Admin oversight).

---

## Notes

- All data from mutations must be cast to types from src/features/respos/types/index.ts.
- Use `lucide-react` for all icons.
- Ensure 100% responsive design for iPad/Tablet use (common for Captains).
