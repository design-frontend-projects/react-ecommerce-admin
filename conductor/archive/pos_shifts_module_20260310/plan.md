# Implementation Plan: POS & Inventory Shifts Module

## Phase 1: Database & Backend Setup
- [ ] Task: Create/Verify `res_shifts` table in Supabase and run migrations.
- [ ] Task: Update Prisma schema and generate client to include `res_shifts`.
- [ ] Task: Implement API/Server Action to fetch the last closed shift (for opening cash suggestion).
- [ ] Task: Implement API/Server Action to "Open" a shift (create record).
- [ ] Task: Implement API/Server Action to "Close" a shift (update record).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Backend Setup' (Protocol in workflow.md)

## Phase 2: State Management & Hooks
- [ ] Task: Implement TanStack Query hooks for shift operations (useOpenShift, useCloseShift, useActiveShift).
- [ ] Task: Create a utility for calculating cash variance and payment summaries.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: State Management & Hooks' (Protocol in workflow.md)

## Phase 3: UI Implementation (Dedicated Shifts Page)
- [ ] Task: Scaffold the "Shifts" page at `/shifts` with a data table for history.
- [ ] Task: Implement "Open Shift" Dialog with editable suggested amount.
- [ ] Task: Implement "Close Shift" Dialog with cash entry and notes.
- [ ] Task: Implement Manager Override capability for closing shifts.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Implementation' (Protocol in workflow.md)

## Phase 4: Analytics & Reporting
- [ ] Task: Build the Shift Details view/dialog.
- [ ] Task: Implement the "Analytics" tab showing Cash Variance.
- [ ] Task: Implement the "Transactions" tab listing all sales during the shift.
- [ ] Task: Implement the "Payment Summary" breakdown by method.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Analytics & Reporting' (Protocol in workflow.md)

## Phase 5: POS Integration & Responsive Polish
- [ ] Task: Add a shift status indicator/quick-action to the POS header.
- [ ] Task: Perform responsive audit and fix any mobile layout issues.
- [ ] Task: Final end-to-end testing of the shift lifecycle.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: POS Integration & Responsive Polish' (Protocol in workflow.md)
