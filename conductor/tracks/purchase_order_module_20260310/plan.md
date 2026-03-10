# Implementation Plan: Purchase Order Module

## Phase 1: Feature Scaffolding & API
- [ ] Task: Scaffold PO Feature Structure
    - [ ] Create directory `src/features/purchase-orders`
    - [ ] Define types for PO, PO Items, and Inventory Reorder
- [ ] Task: API Hooks for PO Management (TanStack Query)
    - [ ] [TDD] Create unit tests for PO data fetching hooks
    - [ ] Implement `usePurchaseOrders`, `usePurchaseOrderItem` hooks
    - [ ] [TDD] Create unit tests for PO mutation hooks (create, update, delete)
    - [ ] Implement `useCreatePurchaseOrder`, `useUpdatePurchaseOrder` mutations
- [ ] Task: API Hooks for Inventory & Reorder
    - [ ] [TDD] Create unit tests for reorder data fetching hook
    - [ ] Implement `useReorderInventory` hook to fetch products below threshold
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Feature Scaffolding & API' (Protocol in workflow.md)

## Phase 2: Core UI Components
- [ ] Task: Create PO List & Detail Views
    - [ ] [TDD] Create unit tests for PO listing component
    - [ ] Implement `POList` component with status filtering
    - [ ] [TDD] Create unit tests for PO detail view
    - [ ] Implement `PODetails` view with item breakdown
- [ ] Task: Reorder Tab & Suggested Quantities
    - [ ] [TDD] Create unit tests for Reorder view logic
    - [ ] Implement `ReorderTab` with filtered products and suggested quantities
- [ ] Task: PO Creation Form
    - [ ] [TDD] Create unit tests for PO creation form
    - [ ] Implement `POForm` with multi-product selection and supplier linkage
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core UI Components' (Protocol in workflow.md)

## Phase 3: Workflow & Integration
- [ ] Task: PO Status Transitions
    - [ ] [TDD] Create unit tests for status transition logic
    - [ ] Implement UI for changing PO status (e.g., Draft -> Pending -> Received)
- [ ] Task: Inventory Integration on PO Receipt
    - [ ] [TDD] Create unit tests for inventory update on PO receipt
    - [ ] Implement logic to update `inventory.quantity` when PO status becomes `Received`
- [ ] Task: Reporting Tab & Analytics
    - [ ] [TDD] Create unit tests for reporting data aggregation
    - [ ] Implement `POReporting` tab with basic purchase trends
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Workflow & Integration' (Protocol in workflow.md)
