# Implementation Plan: Profile & System Owner Management

## Phase 1: Database Schema & Seeding
- [ ] Task: Update `schema.prisma` with `activity_types`, `profiles`, and `audit_logs` models.
- [ ] Task: Create and run a database migration to apply changes.
- [ ] Task: Implement a seed script to populate `activity_types` with default values.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database Schema & Seeding' (Protocol in workflow.md)

## Phase 2: Profile Initialization & Auth Logic
- [ ] Task: Implement `profileService` to handle `getOrCreateProfile` logic.
- [ ] Task: Write unit tests for `profileService` (TDD).
- [ ] Task: Integrate profile check into the application entry point (e.g., `__root.tsx` or a dedicated wrapper).
- [ ] Task: Implement a `system_owner` guard/hook for protected routes.
- [ ] Task: Write unit tests for the `system_owner` check logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Profile Initialization & Auth Logic' (Protocol in workflow.md)

## Phase 3: System Management - Dashboard & Profiles
- [ ] Task: Create the "System Management" sidebar item and layout.
- [ ] Task: Implement the Admin Dashboard with stats (Revenue, Expiry, Activity).
- [ ] Task: Write tests for dashboard calculation logic.
- [ ] Task: Implement the Profile List view using TanStack Table.
- [ ] Task: Implement the Profile Detail view for editing `is_owner` and `system_owner`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: System Management - Dashboard & Profiles' (Protocol in workflow.md)

## Phase 4: Subscription Management
- [ ] Task: Implement the Subscription Management view for System Owners.
- [ ] Task: Implement CRUD operations for `tenant_subscriptions` via the UI.
- [ ] Task: Add manual date override functionality to the subscription editor.
- [ ] Task: Write integration tests for subscription management.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Subscription Management' (Protocol in workflow.md)

## Phase 5: Audit Logs & Notifications
- [ ] Task: Implement the `auditService` to record administrative actions.
- [ ] Task: Integrate `auditService` into profile and subscription update flows.
- [ ] Task: Create a basic UI to view Audit Logs.
- [ ] Task: Implement a notification service for subscription changes.
- [ ] Task: Write tests for audit logging and notification triggers.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Audit Logs & Notifications' (Protocol in workflow.md)
