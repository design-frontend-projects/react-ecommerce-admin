# Implementation Plan: RBAC UI Module

## Phase 1: Foundation & Data Layer
- [ ] Task: Seed permissions and default roles in the database.
    - [ ] Write a script or update `prisma/seed.ts` to include core permissions (e.g., `manage_users`, `manage_roles`, `view_inventory`, `manage_pos`).
    - [ ] Define default roles like `Admin`, `Super Admin`, `Manager`, and `Employee` with their associated permissions.
- [ ] Task: Implement RBAC utility functions and hooks.
    - [ ] Create `src/lib/rbac.ts` for permission checking logic (e.g., `hasPermission(user, permission)`).
    - [ ] Implement a `usePermissions` hook to provide reactive access to the current user's roles and permissions.
    - [ ] Write unit tests for RBAC logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Data Layer' (Protocol in workflow.md)

## Phase 2: Administrative UI Module
- [ ] Task: Create the standalone Admin Layout and Routing.
    - [ ] Define routes for `/admin/users` and `/admin/roles` using TanStack Router.
    - [ ] Add the "Administration" section to the sidebar, visible only to users with `manage_users` or `manage_roles` permissions.
- [ ] Task: Implement the Roles & Permissions Management UI.
    - [ ] Create a list view for custom roles.
    - [ ] Implement the role creation/edit form with a checkbox list for permissions.
    - [ ] Write integration tests for role management.
- [ ] Task: Implement the User Management & Invitation UI.
    - [ ] Create a data table for listing users from `tenant_users`.
    - [ ] Implement the "Invite User" dialog/form with fields for Clerk invitation (email, modules, roles).
    - [ ] Integrate with Clerk Backend API for sending invitations.
    - [ ] Write integration tests for user management and invitations.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Administrative UI Module' (Protocol in workflow.md)

## Phase 3: Dynamic UI Enforcement & Guarding
- [ ] Task: Implement Route Guarding.
    - [ ] Update `TanStack Router` configuration to use the RBAC hook for protecting routes.
    - [ ] Create an `AccessDenied` component for unauthorized access attempts.
- [ ] Task: Implement Component-Level Access Control.
    - [ ] Create a `Can` wrapper component or similar utility to conditionally render children based on permissions.
    - [ ] Apply `Can` component to sensitive UI elements across the app (e.g., Delete buttons, Edit forms).
- [ ] Task: Module-Specific Dashboard Redirection.
    - [ ] Implement logic to redirect users to their `primary_module` dashboard (Inventory or Restaurant) upon login.
    - [ ] Ensure `is_restuarant_user` flag is correctly synchronized with the user's modules.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Dynamic UI Enforcement & Guarding' (Protocol in workflow.md)