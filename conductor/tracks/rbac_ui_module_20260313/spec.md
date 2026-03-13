# Specification: RBAC UI Module Implementation

## Overview
Implement a comprehensive Role-Based Access Control (RBAC) management module within the Admin Dashboard. This module will allow Tenants (Owners) and Admins to manage users, define custom roles with granular permissions, and handle user invitations via Clerk. The UI will dynamically adapt based on the assigned roles and permissions.

## Functional Requirements

### 1. Admin UI Module (Standalone)
- A new top-level or dedicated section in the sidebar for "Administration" or "User Management".
- Sub-pages for:
    - **Users**: List, invite, edit, and assign roles to users.
    - **Roles & Permissions**: Create, edit, and delete custom roles; assign specific permissions to roles.

### 2. User Management & Invitations
- **Invitation Flow**:
    - Integration with Clerk Backend API to send invitations.
    - Invitation form includes: Email, First Name, Last Name, Primary Module (`inventory`, `restaurant`), Additional Modules, and Default Role.
    - Upon sending an invitation, a corresponding record is created in the `tenant_users` table.
- **User List**:
    - Display all users (active/inactive).
    - Quick actions: Edit roles, toggle `is_active`, change `primary_module`.

### 3. Role & Permission Management
- **Role Creation**:
    - Define role name and description.
    - Checklist of available permissions (e.g., `view_inventory`, `edit_products`, `manage_users`).
- **Permission Assignment**:
    - Many-to-many relationship between roles and permissions (`role_permissions`).
    - Many-to-many relationship between users and roles (`user_roles`).

### 4. Dynamic UI Enforcement
- **Sidebar Filtering**: Hide menu items if the user lacks the required permission for that route.
- **Route Guarding**: Show an "Access Denied" screen if a user navigates directly to a restricted URL.
- **Component-Level Access**: Disable or hide specific UI elements (buttons, forms) based on permissions.
- **Module Separation**: Support `primary_module` logic to tailor the initial dashboard experience (Inventory vs. Restaurant).

### 5. Tenant/Subscription Integration
- Ensure only valid subscribers (checked via `tenant_subscriptions`) can access the Admin UI.
- `is_restuarant_user` flag handling for users assigned to the restaurant module.

## Non-Functional Requirements
- **Security**: Strict enforcement of RBAC on both frontend and backend (via Prisma/Supabase RLS or API middleware).
- **UX**: Use ShadcnUI components for consistency. Responsive design for mobile management.
- **Reliability**: Use TanStack Query for data fetching and optimistic updates.

## Acceptance Criteria
- [ ] Users with `admin` or `super_admin` roles can access the Admin UI.
- [ ] New users can be invited via Clerk, and their data is synced to `tenant_users`.
- [ ] Custom roles can be created and linked to specific permissions.
- [ ] UI elements (menu items, buttons) are hidden/disabled based on permissions.
- [ ] Users are redirected to "Access Denied" if unauthorized.

## Out of Scope
- Modification of existing database schemas (beyond adding seed data).
- Payment gateway integration (already handled by subscriptions module).