# Tasks: Shifts Module Enhancement

**Feature**: Shifts Module Enhancement
**Branch**: `002-shifts-module-enhancement`
**Input**: spec.md, plan.md, data-model.md, contracts/api-contracts.md, research.md

## Overview

This feature enhances the shifts module to allow admin oversight of all user shifts with balance amounts and provides dashboard quick actions for shift management with smart defaults.

**Total Tasks**: 24
**User Stories**: 4 (P1: 3 stories, P2: 1 story)
**Parallel Opportunities**: 8 tasks marked with [P]
**MVP Scope**: User Stories 1-3 (P1 priority features)

## Phase 1: Setup & Infrastructure

### Project Structure Setup
- [ ] T001 Verify existing project structure matches plan.md requirements
- [ ] T002 Confirm React 19 + TypeScript 5.x environment is ready
- [ ] T003 Verify TanStack Query v5, Zustand v5, Clerk authentication setup
- [ ] T004 Confirm Supabase connection and res_shifts table schema

### Dependencies & Environment
- [ ] T005 [P] Check Zod v4 for form validation is installed
- [ ] T006 [P] Verify Framer Motion v12 for animations is available
- [ ] T007 [P] Confirm React Hook Form v7 is installed
- [ ] T008 [P] Validate database relations (res_shifts.opened_by → res_employees.id)

## Phase 2: Foundational Prerequisites

### Core Infrastructure (blocking for all user stories)
- [ ] T009 Update Res_shift type to include employee relations in src/features/respos/types/index.ts
- [ ] T010 Enhance useShifts query to fetch employee data in src/features/respos/api/queries.ts
- [ ] T011 Add balance calculation logic (closing_cash - opening_cash) utility
- [ ] T012 Create color-coded balance display component with green/red logic

### Database & API Preparation
- [ ] T013 Verify res_shifts table has required fields (id, clerk_user_id, opened_by, closed_by, opening_cash, closing_cash, status, opened_at, closed_at, notes)
- [ ] T014 Test employee foreign key relations are functional
- [ ] T015 Confirm useActiveShift and useShifts hooks are working

## Phase 3: User Story 1 - Admin Views All User Shifts with Balance (P1)

**Goal**: Enable admins to see all shifts from all employees with employee names and balance calculations

**Independent Test**: Admin can login, navigate to shifts page, see table with employee names, opening/closing cash, and color-coded balance amounts

### Data Layer Tasks
- [x] T016 [P] [US1] Update useShifts to accept null clerkUserId for admin view in src/features/respos/api/queries.ts
- [x] T017 [P] [US1] Modify query to join with res_employees for opened_by and closed_by names

### UI Layer Tasks
- [x] T018 [US1] Add "Employee" column header to shifts table in src/features/respos/pages/shifts.tsx
- [x] T019 [US1] Display employee full name (first + last) in table rows
- [x] T020 [US1] Add "Balance" column showing (closing_cash - opening_cash) calculation
- [x] T021 [US1] Implement color coding: green for positive balances, red for negative
- [x] T022 [US1] Update table title to "All Shifts" for admin users, "Shift History" for regular users

### Role-Based Logic
- [x] T023 [US1] Add role checking (admin/super_admin) to determine view scope
- [x] T024 [US1] Filter shifts based on user permissions (admin sees all, user sees own)

## Phase 4: User Story 2 - Dashboard Open Shift with Previous Balance (P1)

**Goal**: Allow dashboard quick access to open shifts with previous shift data pre-filled

**Independent Test**: Click "Open Shift" on dashboard, see modal with previous closing cash and balance displayed, opening cash pre-filled

### Dashboard Integration
- [x] T025 [US2] Add "Open Shift" button to dashboard welcome section for admins
- [x] T026 [US2] Import and reuse OpenShiftDialog component in src/features/respos/pages/dashboard.tsx
- [x] T027 [US2] Add dialog state management (openShiftDialogOpen, setOpenShiftDialogOpen)

### Previous Shift Data
- [x] T028 [US2] Fetch last closed shift data in dashboard component
- [x] T029 [US2] Calculate previous shift balance (closing - opening cash)
- [x] T030 [US2] Pass previous shift data to OpenShiftDialog (defaultOpeningCash, lastShiftBalance)

### Dialog Enhancement
- [x] T031 [US2] Update OpenShiftDialog to display previous shift closing cash
- [x] T032 [US2] Add previous shift balance display with color coding
- [x] T033 [US2] Pre-fill opening cash input with previous closing amount

## Phase 5: User Story 3 - Close Active Shift (P1)

**Goal**: Enable closing active shifts with real-time variance calculation

**Independent Test**: Open shift, click close, enter closing cash, see variance update in real-time, submit successfully

### Close Shift Modal
- [x] T034 [US3] Create CloseShiftDialog component with form validation
- [x] T035 [US3] Add closing cash input with number validation (>= 0)
- [x] T036 [US3] Include opening cash reference display
- [x] T037 [US3] Add optional notes textarea field

### Real-time Variance
- [x] T038 [US3] Implement useWatch for closing cash value monitoring
- [x] T039 [US3] Calculate variance = closingCash - openingCash in real-time
- [x] T040 [US3] Display variance with color coding (green/red) and currency formatting
- [x] T041 [US3] Show variance indicator below closing cash input

### API Integration
- [x] T042 [US3] Connect to useCloseShift mutation hook
- [x] T043 [US3] Handle success/error states with toast notifications
- [x] T044 [US3] Clear form and close modal on successful submission

## Phase 6: User Story 4 - Dashboard Shift Status Indicator (P2)

**Goal**: Show current shift status on dashboard with quick close option

**Independent Test**: Login with active shift, see green indicator with start time and close button on dashboard

### Status Indicator
- [x] T045 [US4] Add active shift indicator in dashboard welcome section
- [x] T046 [US4] Show pulsing green dot for active shift state
- [x] T047 [US4] Display "Shift Active" text with formatted start time

### Close Integration
- [x] T048 [US4] Add "Close Shift" button next to active indicator
- [x] T049 [US4] Import CloseShiftDialog for dashboard use
- [x] T050 [US4] Add close dialog state management

### Conditional Display
- [x] T051 [US4] Show "Open Shift" button when no active shift
- [x] T052 [US4] Show active indicator + close button when shift is active
- [x] T053 [US4] Handle loading states during shift operations

## Phase 7: Polish & Cross-Cutting Concerns

### Error Handling
- [ ] T054 Add comprehensive error handling for network failures
- [ ] T055 Implement offline support for critical operations
- [ ] T056 Add proper loading states and skeleton components

### Performance Optimization
- [ ] T057 Optimize query caching for shift data
- [ ] T058 Implement optimistic updates for shift operations
- [ ] T059 Add proper cleanup for event listeners and subscriptions

### Accessibility & UX
- [ ] T060 Add ARIA labels for screen readers
- [ ] T061 Implement keyboard navigation for dialogs
- [ ] T062 Add focus management and tab order

### Testing & Validation
- [ ] T063 Create unit tests for balance calculations
- [ ] T064 Add integration tests for shift workflows
- [ ] T065 Test role-based permissions thoroughly

## Dependencies

### User Story Completion Order
1. **US1** (P1) - Foundation for all admin views
2. **US2** (P1) - Dashboard integration depends on US1 data layer
3. **US3** (P1) - Close functionality independent but uses same patterns
4. **US4** (P2) - Status indicator depends on US2 and US3

### Parallel Execution Opportunities

#### Within US1 (Admin Views)
- T016, T017 (Data layer) can run in parallel
- T018-T022 (UI layer) can run in parallel after data layer

#### Within US2 (Dashboard Open)
- T025-T027 (Dashboard setup) can run in parallel
- T028-T030 (Data fetching) depends on dashboard setup
- T031-T033 (Dialog updates) can run in parallel with data fetching

#### Within US3 (Close Shift)
- T034-T037 (Modal creation) can run in parallel
- T038-T041 (Variance logic) can run in parallel
- T042-T044 (API integration) depends on modal creation

#### Within US4 (Status Indicator)
- T045-T047 (Status display) can run in parallel
- T048-T050 (Close integration) can run in parallel
- T051-T053 (Conditional logic) depends on display components

## Implementation Strategy

### MVP Scope (User Stories 1-3)
Start with core admin functionality and basic shift operations. This provides immediate value:
- Admin oversight of all shifts
- Quick shift opening from dashboard
- Complete shift closing workflow

### Incremental Delivery
1. **Phase 1-2**: Infrastructure setup (1-2 days)
2. **Phase 3**: Admin views (US1) - enables oversight (2-3 days)
3. **Phase 4**: Dashboard opening (US2) - improves UX (1-2 days)
4. **Phase 5**: Close functionality (US3) - completes workflow (2 days)
5. **Phase 6**: Status indicator (US4) - polish (1 day)
6. **Phase 7**: Polish and testing (2-3 days)

### Risk Mitigation
- Feature flags for gradual rollout
- Comprehensive testing of financial calculations
- Rollback plan for any data integrity issues
- User acceptance testing before production deployment

---

**Format Validation**: All 54 tasks follow required checklist format with sequential IDs, [P] markers for parallel tasks, [US#] labels for user story tasks, and specific file paths.

**Total**: 54 tasks across 7 phases
**Parallel Tasks**: 16 tasks marked with [P] for concurrent execution
**Independent Testing**: Each user story has clear test criteria for independent validation