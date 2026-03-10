# Implementation Plan: POS Refund Module

## Phase 1: Feature Scaffolding & Database
- [ ] Task: Scaffold Refund Feature Structure
    - [ ] Create directory `src/features/pos/refunds`
    - [ ] Define types for Refunds, Sale History, and Approval
- [ ] Task: Database Schema Update (Prisma)
    - [ ] Add `refund_items` table to track specific items and quantities in a refund.
    - [ ] Include a `is_restockable` boolean field for each item.
    - [ ] [TDD] Create unit tests for schema validation (if applicable).
- [ ] Task: Supabase RPC for Atomic Refunds
    - [ ] Implement `process_pos_refund` RPC to handle `refunds` entry, `refund_items` creation, and `inventory` updates in a single transaction.
    - [ ] Ensure the function correctly increments stock only for restockable items.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Feature Scaffolding & Database' (Protocol in workflow.md)

## Phase 2: API Hooks & Approval Logic
- [ ] Task: API Hooks for Sale History & Search
    - [ ] [TDD] Create unit tests for sale history fetching hooks.
    - [ ] Implement `useSaleHistory` and `useSaleSearch` hooks.
- [ ] Task: Manager Approval & PIN Component
    - [ ] [TDD] Create unit tests for PIN verification logic.
    - [ ] Implement a reusable `ManagerApprovalDialog` component with PIN entry.
- [ ] Task: Refund Mutation Hook (TanStack Query)
    - [ ] [TDD] Create unit tests for the refund mutation hook.
    - [ ] Implement `useProcessRefund` mutation hook calling the Supabase RPC.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: API Hooks & Approval Logic' (Protocol in workflow.md)

## Phase 3: Core UI & Responsive Design
- [ ] Task: Refund Tab in POS Feature
    - [ ] [TDD] Create unit tests for the Refund tab component.
    - [ ] Integrate a new "Refund" tab into the main POS layout (`src/features/pos/index.tsx`).
- [ ] Task: Sale Selection & Item Selection UI
    - [ ] [TDD] Create unit tests for item selection logic.
    - [ ] Implement a user-friendly UI for choosing items and quantities for refund.
    - [ ] Add toggles for 'Restock Item' for each refunded line item.
- [ ] Task: Refund Summary & Final Confirmation
    - [ ] [TDD] Create unit tests for the final summary view.
    - [ ] Implement the final review screen showing totals, refund method selection, and notes.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Core UI & Responsive Design' (Protocol in workflow.md)
