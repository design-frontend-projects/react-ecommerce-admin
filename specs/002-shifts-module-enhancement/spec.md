# Feature Specification: Shifts Module Enhancement

**Feature Branch**: `002-shifts-module-enhancement`  
**Created**: 2026-03-29  
**Status**: Draft  
**Input**: User description: "update shifts module @src\features\respos\pages\shifts.tsx and enhance it because it's not implemented as expected before, this module allow amin to see the old and opended users shifts with balance amount of previous shift, allow user to have a button in dashboard to open shift after press it and show modal to enter the amount that hre is recived from previous shift also allow him if has open shift to close the shift use @prisma\schema.prisma shifts table to implement it and use the exact feilds and if you want to add additional fields do it"

## User Scenarios & Testing

### User Story 1 - Admin Views All User Shifts with Balance (Priority: P1)

As an admin, I need to view all shifts (both open and closed) from all employees, including the employee name, opening/closing cash amounts, and the balance (difference between closing and opening cash) to monitor cash flow and employee performance.

**Why this priority**: This is the core functionality - admins must be able to oversee all shift activity to ensure proper cash handling and accountability.

**Independent Test**: Login as admin, navigate to shifts page, verify all shifts from all employees are displayed with employee names, dates, cash amounts, and balance calculations.

**Acceptance Scenarios**:

1. **Given** I am logged in as an admin, **When** I navigate to the shifts page, **Then** I see a table showing ALL shifts (both open and closed) from all employees
2. **Given** I am viewing the shifts table, **When** I look at each row, **Then** I see the employee name who opened the shift, opened date/time, closed date/time (if closed), opening cash, closing cash, and balance
3. **Given** I am viewing a closed shift row, **When** I look at the balance column, **Then** I see the difference between closing cash and opening cash with color coding (green for positive, red for negative)

---

### User Story 2 - Dashboard Open Shift with Previous Balance (Priority: P1)

As an admin/cashier, I need to open a shift directly from the dashboard by clicking a button, which shows a modal with the previous shift's closing cash amount pre-filled, so I can quickly start my shift with accurate cash accounting.

**Why this priority**: Streamlines daily operations - staff can start shifts immediately without navigating to a separate page, and the previous shift's balance provides context for cash handling.

**Independent Test**: Login, see "Open Shift" button on dashboard, click it, see modal with previous shift's closing cash shown and pre-filled.

**Acceptance Scenarios**:

1. **Given** there is no active shift and I have admin permissions, **When** I view the dashboard, **Then** I see an "Open Shift" button
2. **Given** I click "Open Shift" on the dashboard, **When** the modal opens, **Then** I see the previous shift's closing cash amount displayed, along with the previous shift's balance (closing - opening)
3. **Given** the open shift modal is shown, **When** there was a previous shift, **Then** the opening cash field is pre-filled with the previous shift's closing amount
4. **Given** I enter an opening cash amount and submit, **When** the shift opens successfully, **Then** I see a success notification and the modal closes

---

### User Story 3 - Close Active Shift (Priority: P1)

As an admin/cashier with an active shift, I need to close my shift by entering the closing cash amount and optional notes about any discrepancies, so the system can calculate the variance and maintain accurate records.

**Why this priority**: Essential for completing the shift lifecycle - must be able to close shifts to finalize cash counts and create proper audit trails.

**Independent Test**: Open a shift, then click "Close Shift", enter closing cash amount, submit, verify shift is closed with correct variance calculated.

**Acceptance Scenarios**:

1. **Given** I have an active shift, **When** I view the shifts page or dashboard, **Then** I see a "Close Shift" button
2. **Given** I click "Close Shift", **When** the modal opens, **Then** I see the opening cash amount displayed and a field to enter closing cash
3. **Given** I enter a closing cash amount, **When** I look at the form, **Then** I see the variance calculated in real-time (color-coded green/red)
4. **Given** I enter a closing cash amount and optional notes, **When** I submit, **Then** the shift is closed and I see a success notification

---

### User Story 4 - Dashboard Shift Status Indicator (Priority: P2)

As a staff member, I need to see the current shift status on the dashboard so I know immediately whether there's an active shift and how long it's been running.

**Why this priority**: Provides quick visibility into shift state without requiring navigation, improving workflow efficiency.

**Independent Test**: Login with active shift, verify dashboard shows shift status indicator with start time.

**Acceptance Scenarios**:

1. **Given** there is an active shift, **When** I view the dashboard, **Then** I see a green indicator showing "Shift Active" with the time the shift started
2. **Given** there is no active shift, **When** I view the dashboard, **Then** I see the "Open Shift" button instead of the active indicator

---

### Edge Cases

- What happens when an admin tries to open a shift while another user already has an active shift?
- How does the system handle closing a shift with zero opening cash?
- What happens when the previous shift has null closing cash (improperly closed)?
- How does the system display shifts from multiple restaurants/locations?

## Requirements

### Functional Requirements

- **FR-001**: System MUST display all shifts (open and closed) in a table for admin users, showing only the user's own shifts for non-admin users
- **FR-002**: System MUST show the employee name (first + last) for each shift in the history table
- **FR-003**: System MUST calculate and display the balance (closing_cash - opening_cash) for each closed shift
- **FR-004**: System MUST show the previous shift's closing cash amount when opening a new shift
- **FR-005**: System MUST pre-fill the opening cash field with the previous shift's closing amount
- **FR-006**: System MUST show the previous shift's balance (closing - opening) in the open shift dialog
- **FR-007**: System MUST allow users with active shifts to close them from the dashboard
- **FR-008**: System MUST calculate and display the variance (closing - opening) in real-time when entering closing cash
- **FR-009**: System MUST allow optional notes when closing a shift
- **FR-010**: System MUST show shift active status indicator on dashboard with start time
- **FR-011**: System MUST color-code positive balances/variances in green and negative in red
- **FR-012**: System MUST use the exact fields from res_shifts table: id, clerk_user_id, closed_by, opening_cash, closing_cash, status, opened_at, closed_at, notes, opened_by, restaurant_id

### Key Entities

- **Shift (res_shifts)**: Represents a cash register shift period. Key attributes: id, clerk_user_id, opened_by (employee), closed_by (employee), opening_cash, closing_cash, status (open/closed), opened_at, closed_at, notes, restaurant_id
- **Employee (res_employees)**: Staff member who opens/closes shifts. Key attributes: id, first_name, last_name, user_id

## Success Criteria

### Measurable Outcomes

- **SC-001**: Admins can view all employee shifts with balance amounts within 2 seconds of page load
- **SC-002**: Users can open a new shift from the dashboard in under 3 clicks (click button, confirm amount, submit)
- **SC-003**: Previous shift data (closing cash, balance) is displayed accurately 100% of the time when opening a new shift
- **SC-004**: Shift variance calculation displays correctly in real-time as user types closing amount
- **SC-005**: 100% of closed shifts display correct balance calculations (closing - opening cash)

## Assumptions

- Only users with admin or super_admin permissions can open new shifts
- Regular users can view their own shift history but cannot open/close shifts
- The system uses Clerk for authentication and user identification
- Shift history displays all shifts when admin views, but only closed shifts for regular users
- Employee data is available via foreign key relationships in the database
- The previous shift is determined by the most recent closed shift for the user (or globally for admins)
- Dashboard is the primary entry point for shift management operations
- The res_shifts table schema from Prisma is the source of truth for data fields
