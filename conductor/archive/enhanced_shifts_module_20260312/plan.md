# Implementation Plan: Enhanced Shifts Module

## Phase 1: Database & Model Setup
- [ ] Task: Define the `res_shifts` model in `schema.prisma`
    - [ ] Add `id`, `clerk_user_id`, `start_amount`, `end_amount`, `opened_at`, `closed_at`, `status`, and `restaurant_id` fields.
    - [ ] Run Prisma migrate or update the local schema representation.
- [ ] Task: Write Tests for Shift Model & Database Access
    - [ ] Create a unit test for shift creation and status querying.
- [ ] Task: Implement Shift Data Access logic
    - [ ] Implement a repository or service for shift-related database operations.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Model Setup' (Protocol in workflow.md)

## Phase 2: Shift Logic & State Management
- [ ] Task: Write Tests for Shift State Management
    - [ ] Create a unit test for a Zustand store that tracks the current active shift.
- [ ] Task: Implement Shift Zustand Store
    - [ ] Create a store to handle the global shift status (Open/Closed/Loading).
    - [ ] Add actions to open and close shifts.
- [ ] Task: Implement TanStack Query hooks for Shift fetching
    - [ ] Create hooks for `useActiveShift` and `useLastShiftClosingAmount`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Shift Logic & State Management' (Protocol in workflow.md)

## Phase 3: Shift UI Components
- [ ] Task: Write Tests for Shift UI Components
    - [ ] Create unit tests for the Shift Status Indicator and the Blocking Modal.
- [ ] Task: Implement Header Shift Status Indicator
    - [ ] Create a component in the header that displays the current shift status.
- [ ] Task: Implement "Open Shift" Blocking Modal
    - [ ] Create a modal that prompts the user for the `start_amount`.
    - [ ] Ensure it's auto-populated from the last shift's closing balance.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Shift UI Components' (Protocol in workflow.md)

## Phase 4: POS Module Integration & Access Control
- [ ] Task: Write Tests for POS Access Control
    - [ ] Create integration tests to ensure the `respos` module is inaccessible without an open shift.
- [ ] Task: Implement `respos` Access Control logic
    - [ ] Wrap the `respos` entry point with a shift-check guard.
    - [ ] Trigger the blocking modal if no shift is found.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: POS Module Integration & Access Control' (Protocol in workflow.md)

## Phase 5: Sign-out Guard & Final Integration
- [ ] Task: Write Tests for Sign-out Guard
    - [ ] Create unit/integration tests for the sign-out interruption logic.
- [ ] Task: Implement Sign-out Guard logic
    - [ ] Check if the user is in the "restaurant" primary module.
    - [ ] Check for an open shift during the sign-out process.
    - [ ] Implement the interruption dialog if an open shift exists.
- [ ] Task: Final Verification & Cleanup
    - [ ] Ensure all acceptance criteria from `spec.md` are met.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Sign-out Guard & Final Integration' (Protocol in workflow.md)
