# Specification: Enhanced Shifts Module

## Overview
This track focuses on enhancing the shifts module to ensure that all users in the "restaurant" primary module have an active shift before they can use the Point of Sale (`respos`) module. The system will integrate with the `res_shifts` table in Supabase, leveraging `clerk_user_id` as a foreign key for the current logged-in user.

## Functional Requirements
- **Shift Status Monitoring:**
  - Implement a shift status indicator in the header to show the current state (Open/Closed).
  - Track shift status based on the `res_shifts` table in Supabase.
- **POS Access Control (respos):**
  - When a user enters the `respos` module, the system must check if a shift is currently open.
  - If no shift is open, a blocking modal will appear, requiring the user to "Open Shift" before proceeding.
- **Open Shift Workflow:**
  - The "Open Shift" form must include a `start_amount` field.
  - This field will be auto-populated with the closing balance from the most recent shift for that user/restaurant.
  - Users can edit this value if necessary.
- **Sign-out Guard:**
  - Before a user signs out, the system must check if they have a "restaurant" value in the `primary_module` field of the `tenant_users` table in Supabase.
  - If they are in the restaurant module and have an active shift, an interruption dialog will appear, prompting them to close the shift before signing out.
- **Data Validation:**
  - All shift data (start amount, timestamps, user ID) must be validated against the `res_shifts` schema.

## Non-Functional Requirements
- **Performance:** Shift status checks should be optimized to avoid UI lag.
- **Reliability:** Ensure that shift states are correctly synchronized with Supabase to prevent data discrepancies.

## Acceptance Criteria
- [ ] A shift status indicator is visible in the header.
- [ ] Access to the `respos` module is blocked by a modal if no shift is open.
- [ ] Opening a shift auto-populates the start amount with the previous shift's closing balance.
- [ ] Sign-out is interrupted by a dialog if a restaurant user has an open shift.
- [ ] All shift operations are persisted in the `res_shifts` table.

## Out of Scope
- Detailed shift reporting and analytics (to be handled in a separate track).
- Multi-user shared shifts (shifts are per `clerk_user_id`).
