# Implementation Plan: Point of Sale (POS) Module

This plan outlines the step-by-step implementation of the POS module, focusing on checkout, management, and analytics.

## Phase 1: Core POS UI & Basket Logic (Checkout)
This phase focuses on the fundamental ability to add items to a basket via barcode/manual entry and manage the checkout flow.

- [ ] Task: Define POS-specific Zod schemas and TypeScript types for `Basket`, `LineItem`, `Transaction`, and `Discount`.
- [ ] Task: Create a reusable `Numpad` component for manual SKU entry and quantity adjustments.
- [ ] Task: Implement the `useBasket` Zustand store to manage real-time basket state (add, remove, update quantities).
- [ ] Task: Develop the `BarcodeScanner` hook/component to listen for keyboard-wedge scanner inputs.
- [ ] Task: Build the `POSLayout` and `BasketView` components with touch-optimized large targets.
- [ ] Task: Implement the "Manual SKU Entry" modal with search and numpad integration.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core POS UI & Basket Logic' (Protocol in workflow.md)

## Phase 2: Discounts, Refunds & Reorders
This phase adds the business logic for complex transactions, including authorization and notes.

- [ ] Task: Implement `DiscountToggle` component for applying fixed-amount or percentage-based discounts to line items and the cart.
- [ ] Task: Create the `RefundModal` with mandatory "Reason for Refund" selection and note fields.
- [ ] Task: Implement "Manager Authorization" logic (PIN/Role-check) for high-value refunds/discounts.
- [ ] Task: Build the "Reorder" functionality to duplicate previous orders into a new basket.
- [ ] Task: Integrate refund and discount logic into the `useBasket` store and Prisma transactions.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Discounts, Refunds & Reorders' (Protocol in workflow.md)

## Phase 3: Shift Dashboard & Real-time Analytics
This phase provides managers with real-time insights into the current shift's performance and inventory.

- [ ] Task: Create Prisma queries/API routes to fetch "Current Shift" metrics (Sales, Transactions, AOV).
- [ ] Task: Implement the `ShiftAnalyticsDashboard` using TanStack Table and Shadcn charts.
- [ ] Task: Build "Low Stock" and "Top Sellers" widgets for the POS dashboard.
- [ ] Task: Implement real-time updates for shift totals using TanStack Query's invalidation or WebSockets (if supported).
- [ ] Task: Create the "Received Orders" log view to track incoming stock during the shift.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Shift Dashboard & Real-time Analytics' (Protocol in workflow.md)

## Phase 4: Final Integration & Polishing
Finalizing the module with receipt generation, accessibility checks, and mobile responsiveness.

- [ ] Task: Implement a basic "Print Receipt" feature using standard browser `window.print()` and CSS media queries.
- [ ] Task: Perform an accessibility audit (Aria-labels, focus management, touch target sizes).
- [ ] Task: Verify responsive behavior across Mobile (iPhone/Safari) and Tablet views.
- [ ] Task: Final end-to-end integration testing of the full checkout -> refund -> dashboard flow.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Integration & Polishing' (Protocol in workflow.md)