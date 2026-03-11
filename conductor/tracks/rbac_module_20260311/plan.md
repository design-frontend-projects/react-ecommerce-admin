# Implementation Plan: RBAC and User Management Module

## Phase 1: Database & Schema Setup
- [ ] Task: Update Prisma Schema for RBAC
    - [ ] **Red Phase:** Write validation tests for the expected database models.
    - [ ] **Green Phase:** Update `prisma/schema.prisma` with `roles`, `permissions`, `role_permissions`, `user_roles`, and `tenant_users`.
    - [ ] **Refactor:** Ensure indices and foreign key constraints are correctly defined.
- [ ] Task: Create and Run SQL Migrations
    - [ ] **Action:** Generate and execute Prisma migrations to create the new tables in Supabase.
- [ ] Task: Seed Initial Roles and Permissions
    - [ ] **Action:** Update `prisma/seed.ts` with default roles (e.g., admin, super-admin, driver, merchant, customer) and basic permissions.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: RBAC Logic & Helpers
- [ ] Task: Implement `usePermissions()` Hook
    - [ ] **Red Phase:** Write tests for the `usePermissions` hook to verify correct role/permission checks based on mocked user state.
    - [ ] **Green Phase:** Create `src/hooks/use-permissions.tsx` implementing `can`, `hasRole`, and `getPermissions`.
    - [ ] **Refactor:** Use TanStack Query to cache and share permission data across components.
- [ ] Task: Integrate Clerk with `tenant_users`
    - [ ] **Red Phase:** Write tests for the invitation flow ensuring a `tenant_users` record is created after a successful Clerk invite.
    - [ ] **Green Phase:** Update the invitation handler to insert the new user record into Supabase.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: User Management UI (Frontend)
- [ ] Task: Create "User Management" Sidebar Section
    - [ ] **Action:** Add the new "User Management" module to the sidebar with appropriate icons and routing.
- [ ] Task: Implement User Listing and Filters
    - [ ] **Red Phase:** Write tests for the user table, ensuring search and filtering by role/status works as expected.
    - [ ] **Green Phase:** Create the `UserManagement` page using ShadcnUI `DataTable`, with filters for roles and status.
- [ ] Task: Implement Role/Permission Management Modals
    - [ ] **Red Phase:** Write tests for the role assignment and permission matrix updates.
    - [ ] **Green Phase:** Create modals for role assignment and a visual permission matrix for granular control.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Security & Validation
- [ ] Task: Implement Backend Permission Checks
    - [ ] **Red Phase:** Write tests for API endpoints ensuring only authorized users can manage roles and permissions.
    - [ ] **Green Phase:** Add middleware or service-level checks to validate administrative actions against the current user's permissions.
- [ ] Task: Final UX Polish and Error Handling
    - [ ] **Action:** Ensure all administrative actions provide clear success/error toasts and loading states.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
