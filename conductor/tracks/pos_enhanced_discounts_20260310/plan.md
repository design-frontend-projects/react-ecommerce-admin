# Implementation Plan: POS Enhanced Discounts & Payments

This plan outlines the steps to implement manual discounts, promo codes, and an updated checkout workflow in the POS module.

## Phase 1: Database & Promotions Core
- [ ] Task: Update Prisma Schema for Promotions and Transactions
    - [ ] Add `promotions` and `promotion_usage` models to `schema.prisma`.
    - [ ] Update `transactions` model with `mobile_number`, `promotion_id`, `received_amount`, and `change_amount`.
    - [ ] Run `npx prisma generate`.
- [ ] Task: Implement Promotion Validation Service
    - [ ] Write tests for promotion validation (active, dates, limits, min purchase).
    - [ ] Implement `validatePromotion` utility function.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Promotions Core' (Protocol in workflow.md)

## Phase 2: POS Store & Calculation Logic
- [ ] Task: Update `useBasket` Store for Enhanced Discounts
    - [ ] Write tests for `useBasket` with manual discount (max 10%) and promo codes.
    - [ ] Update `BasketState` and `useBasket` to include `manualDiscount`, `promoCode`, and `customerMobile`.
    - [ ] Implement `applyManualDiscount` with 10% validation.
    - [ ] Implement `applyPromoCode` using the validation service.
- [ ] Task: Update Total Calculation Logic
    - [ ] Update `getTotalAmount` to handle additive manual and promo discounts.
    - [ ] Ensure subtotal is calculated correctly before any discounts.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: POS Store & Calculation Logic' (Protocol in workflow.md)

## Phase 3: UI Implementation (In-Basket View)
- [ ] Task: Implement Discount UI in Basket View
    - [ ] Write tests for the new discount UI components.
    - [ ] Add Manual Discount input (Amount/Percentage toggle) to `basket-view.tsx`.
    - [ ] Add Promo Code input field with apply/remove actions.
- [ ] Task: Implement Customer & Payment UI
    - [ ] Write tests for payment selection and change calculation.
    - [ ] Add Mobile Number input field.
    - [ ] Add Payment Method selection (Single choice: Visa, NFC, QR Code, Cash).
    - [ ] Add "Received Amount" input for Cash and display "Change".
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Implementation (In-Basket View)' (Protocol in workflow.md)

## Phase 4: Persistence & Integration
- [ ] Task: Implement Enhanced Sale Completion
    - [ ] Write integration tests for completing a sale with discounts and promo codes.
    - [ ] Update the sale submission logic to save to `transactions` and `transaction_details`.
    - [ ] Implement `promotion_usage` recording upon successful sale.
- [ ] Task: Final Integration Review & Cleanup
    - [ ] Verify end-to-end flow: Add items -> Apply manual discount -> Apply promo code -> Select Cash -> Complete Sale.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Persistence & Integration' (Protocol in workflow.md)
