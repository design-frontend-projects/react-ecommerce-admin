# Implementation Plan: Tenant Subscriptions Management

## Phase 1: Database Schema & Backend Core [checkpoint: 0bb2339]
- [x] Task: Define Prisma Models for Subscriptions (f1a2b3c)
    - [x] Write unit tests for subscription model validation.
    - [x] Add `subscriptions` and `tenant_subscriptions` models to `schema.prisma`.
    - [x] Run Prisma migration to update Supabase database.
- [x] Task: Implement Subscription Business Logic (d4e5f6g)
    - [x] Write unit tests for `end_date` calculation based on plan duration.
    - [x] Implement utility functions for creating/updating tenant subscriptions with status validation.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database Schema & Backend Core' (0bb2339)

## Phase 2: Clerk Integration & User Assignment
- [ ] Task: Implement Clerk User Service
    - [ ] Write unit tests for fetching/searching users from Clerk API.
    - [ ] Develop backend service to list users by ID and Email.
- [ ] Task: Build Subscription Assignment UI
    - [ ] Write unit tests for the assignment form components.
    - [ ] Create an admin-only view to search for Clerk users.
    - [ ] Implement form to select a user and assign a 1, 3, 6, or 12-month plan.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Clerk Integration & User Assignment' (Protocol in workflow.md)

## Phase 3: Access Control & Enforcement
- [ ] Task: Implement Global Subscription Guard
    - [ ] Write unit tests for access enforcement logic (mocking active/inactive states).
    - [ ] Create middleware or layout-level guard to verify tenant subscription status.
    - [ ] Implement redirection to "Subscription Required" page for inactive tenants.
- [ ] Task: Create Subscription Required UI
    - [ ] Design and implement the blocked-state landing page with contact info for the super_admin.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Access Control & Enforcement' (Protocol in workflow.md)

## Phase 4: Subscription Dashboard & Finalization
- [ ] Task: Develop Subscription Analytics API
    - [ ] Write unit tests for metric calculation (active count, revenue, upcoming expiry).
    - [ ] Implement API endpoints to aggregate data from `tenant_subscriptions`.
- [ ] Task: Build Subscription Dashboard UI
    - [ ] Create cards/charts for active subs, revenue, and expiry alerts.
    - [ ] Implement a list view of all tenant subscriptions with manual status toggle for `super_admin`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Subscription Dashboard & Finalization' (Protocol in workflow.md)
