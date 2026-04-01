# Specification: Captain POS & Promotions

## Overview
A comprehensive POS and ordering system tailored for the "Captain's View" of the restaurant, including promotion validation and admin-led refund capabilities.

## User Stories

### US1: Captain Table-Side Ordering (P1)
- **Goal**: Captain can take orders directly at the table using a mobile/tablet-optimized interface.
- **Requirements**:
  - Browse menu items by category.
  - Add/remove items from the table's cart.
  - Update quantities.
  - Send the order to the kitchen.
  - Support multiple open tables on the floor plan.

### US2: Intelligent Promotions (P1)
- **Goal**: Apply discounts to orders based on marketing campaigns.
- **Requirements**:
  - Input promo code in the POS sidebar.
  - Real-time validation against the `res_promotions` table.
  - Validate minimum purchase, active dates, and usage limits.
  - Support percentage and fixed amount discounts.
  - Persistent discount application to the order record.

### US3: Order History & Admin Refund (P2)
- **Goal**: Manage order lifecycle and handle customer disputes.
- **Requirements**:
  - View past orders for the session/table.
  - Admin (role check) can trigger a manual refund for a completed order.
  - Mark refunded orders clearly in the database (`status: refunded`).
  - Restrict refund button to `admin` or `super_admin` users.

## Technical Requirements
- **Integration**: Must use the existing `respos` feature structure.
- **State**: Use `useResposStore` for cart and promo persistence.
- **Validation**: Re-use/refactor `promotion-validator.ts` for consistent logic.
- **UI**: Modern, glassmorphic design using shadcn/ui and Framer Motion.
