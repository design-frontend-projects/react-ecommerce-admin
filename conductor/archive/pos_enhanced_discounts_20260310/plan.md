# Implementation Plan: POS Enhanced Discounts & Payments

This plan outlines the steps to implement manual discounts, promo codes, and an updated checkout workflow in the POS module.

## Phase 1: Database & Promotions Core [checkpoint: e96e97f]
- [x] Task: Update Prisma Schema for Promotions and Transactions b29713b
    - [ ] Add `promotions` and `promotion_usage` models to `schema.prisma`.
    - [ ] Update `transactions` model with `mobile_number`, `promotion_id`, `received_amount`, and `change_amount`.
    - [ ] Run `npx prisma generate`.
- [x] Task: Implement Promotion Validation Service 0bebde4
    - [ ] Write tests for promotion validation (active, dates, limits, min purchase).
    - [ ] Implement `validatePromotion` utility function.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database & Promotions Core' (Protocol in workflow.md) e96e97f

## Phase 2: POS Store & Calculation Logic [checkpoint: 4315c2f]
- [x] Task: Update `useBasket` Store for Enhanced Discounts 7044c54
    - [ ] Write tests for `useBasket` with manual discount (max 10%) and promo codes.
    - [ ] Update `BasketState` and `useBasket` to include `manualDiscount`, `promoCode`, and `customerMobile`.
    - [ ] Implement `applyManualDiscount` with 10% validation.
    - [ ] Implement `applyPromoCode` using the validation service.
- [x] Task: Update Total Calculation Logic 7044c54
    - [ ] Update `getTotalAmount` to handle additive manual and promo discounts.
    - [ ] Ensure subtotal is calculated correctly before any discounts.
- [x] Task: Conductor - User Manual Verification 'Phase 2: POS Store & Calculation Logic' (Protocol in workflow.md) 4315c2f

## Phase 3: UI Implementation (In-Basket View) [checkpoint: e65c5c1]
- [x] Task: Implement Discount UI in Basket View 65b516a
    - [ ] Write tests for the new discount UI components.
    - [ ] Add Manual Discount input (Amount/Percentage toggle) to `basket-view.tsx`.
    - [ ] Add Promo Code input field with apply/remove actions.
- [x] Task: Implement Customer & Payment UI 65b516a
    - [ ] Write tests for payment selection and change calculation.
    - [ ] Add Mobile Number input field.
    - [ ] Add Payment Method selection (Single choice: Visa, NFC, QR Code, Cash).
    - [ ] Add "Received Amount" input for Cash and display "Change".
- [x] Task: Conductor - User Manual Verification 'Phase 3: UI Implementation (In-Basket View)' (Protocol in workflow.md) e65c5c1

## Phase 4: Persistence & Integration [checkpoint: e65c5c1]
- [x] Task: Implement Enhanced Sale Completion 65b516a
    - [ ] Write integration tests for completing a sale with discounts and promo codes.
    - [ ] Update the sale submission logic to save to `transactions` and `transaction_details`.
    - [ ] Implement `promotion_usage` recording upon successful sale.
- [x] Task: Final Integration Review & Cleanup e65c5c1
    - [ ] Verify end-to-end flow: Add items -> Apply manual discount -> Apply promo code -> Select Cash -> Complete Sale.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Persistence & Integration' (Protocol in workflow.md) e65c5c1
