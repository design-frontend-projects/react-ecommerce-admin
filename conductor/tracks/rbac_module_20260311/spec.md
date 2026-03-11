# Specification: RBAC and User Management Module

## 1. Overview
Implement a comprehensive Role-Based Access Control (RBAC) system for the Shadcn Admin Dashboard. This includes a dedicated "User Management" module for administrators to manage users, roles, and permissions, integrated with Clerk for authentication and Supabase for data persistence.

## 2. Functional Requirements
### 2.1 Schema Implementation
- Implement SQL migrations/Prisma schema updates for the following tables:
    - `roles`: ID, name, description.
    - `permissions`: ID, name, description.
    - `role_permissions`: Mapping between roles and permissions.
    - `user_roles`: Mapping between Clerk users and roles.
    - `tenant_users`: Profile data for each user within a tenant.

### 2.2 User Management UI
- Create a "User Management" module as a separate section in the sidebar.
- Features:
    - **User Listing:** Display users with search and filter capabilities (by role, status, etc.).
    - **User Actions:** Block/suspend users, assign/revoke roles and permissions.
    - **Permission Matrix:** A visual way to see and manage permissions assigned to each role.
    - **Invitation Integration:** Automatically create a `tenant_users` record after a Clerk invitation is sent.

### 2.3 UI Helpers
- Implement a `usePermissions()` React hook for component-level RBAC checks:
    - `can(permission_name: string): boolean`
    - `hasRole(role_name: string): boolean`
    - `getPermissions(): string[]`

## 3. Non-Functional Requirements
- **Performance:** Permission checks should be highly efficient with minimal re-renders.
- **Security:** Ensure all role/permission assignments are validated against the current user's own permissions (e.g., only `admin` or `super-admin` can manage roles).
- **UX:** Provide clear feedback (toasts, loading states) for all administrative actions.

## 4. Acceptance Criteria
- [ ] Users with the appropriate role can access the "User Management" module.
- [ ] Administrators can assign/revoke roles and permissions to other users.
- [ ] User status changes (blocking/suspending) are reflected in their ability to access the system.
- [ ] `usePermissions()` hook accurately reflects the current user's roles and permissions.
- [ ] New user records are correctly created in `tenant_users` after successful Clerk invitations.

## 5. Out of Scope
- Automatic cleanup of old Clerk invitations.
- Management of Clerk-level security settings (e.g., MFA, session length).
- Complex multi-tenant permission inheritance (focus is on direct role/permission assignment).
