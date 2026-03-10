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

## Phase 2: Clerk Integration & User Assignment [checkpoint: 5ce016f]
- [x] Task: Implement Clerk User Service (db419d9)
    - [x] Write unit tests for fetching/searching users from Clerk API.
    - [x] Develop backend service to list users by ID and Email.
- [x] Task: Build Subscription Assignment UI (db419d9)
    - [x] Write unit tests for the assignment form components.
    - [x] Create an admin-only view to search for Clerk users.
    - [x] Implement form to select a user and assign a 1, 3, 6, or 12-month plan.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Clerk Integration & User Assignment' (5ce016f)

## Phase 3: Access Control & Enforcement [checkpoint: 7a8b9c0]
- [x] Task: Implement Global Subscription Guard (7a8b9c0)
    - [x] Write unit tests for access enforcement logic (mocking active/inactive states).
    - [x] Create middleware or layout-level guard to verify tenant subscription status.
    - [x] Implement redirection to "Subscription Required" page for inactive tenants.
- [x] Task: Create Subscription Required UI (7a8b9c0)
    - [x] Design and implement the blocked-state landing page with contact info for the super_admin.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Access Control & Enforcement' (Protocol in workflow.md)

## Phase 4: Subscription Dashboard & Finalization
- [ ] Task: Develop Subscription Analytics API
    - [ ] Write unit tests for metric calculation (active count, revenue, upcoming expiry).
    - [ ] Implement API endpoints to aggregate data from `tenant_subscriptions`.
- [ ] Task: Build Subscription Dashboard UI
    - [ ] Create cards/charts for active subs, revenue, and expiry alerts.
    - [ ] Implement a list view of all tenant subscriptions with manual status toggle for `super_admin`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Subscription Dashboard & Finalization' (Protocol in workflow.md)
