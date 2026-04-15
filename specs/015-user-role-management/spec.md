# Feature Specification: User Management & Real-Time RBAC

**Feature Branch**: `015-user-role-management`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "Enhance the users module to fully support user management and role-based access control. The module should integrate with Clerk to list users, their roles, and associated permissions. Implement: 1. User Invitation & Tenant Association (relate invited user to current tenant via clerk_user_id). 2. Role & Permission Management (persist in Supabase roles/role_permissions models). 3. Real-Time Role Updates (propagate role updates in real time to affect permissions immediately). 4. API & Models for user listing, role assignment, and invitation workflows. 5. System Behavior (enforce RBAC dynamically)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin User Invitation (Priority: P1)

As an administrator, I want to invite a new team member to my store by their email so that I can expand my team and grant them access to management tools.

**Why this priority**: Invitation and tenant linkage are the prerequisite for all other user management tasks.

**Independent Test**: Can be tested by sending an invitation from the admin dashboard and verifying that a new entry appears in the user list linked to the correct tenant ID.

**Acceptance Scenarios**:

1. **Given** an admin is on the user management page, **When** they enter a colleague's email and select the "Manager" role, **Then** an invitation link is generated and the user is added to the tenant's user list in a "Pending" state.
2. **Given** a new user accepts an invitation, **When** they sign in via Clerk, **Then** their profile is automatically associated with the tenant and they inherit the "Manager" permissions.

---

### User Story 2 - Granular Access Control (Priority: P2)

As an administrator, I want to assign specific roles to my team members so that I can control who can view sensitive financial data vs. who can only manage products.

**Why this priority**: Security and separation of concerns are critical for business operations.

**Independent Test**: Can be tested by logging in as a user with a "Staff" role and verifying that "Admin Settings" pages are inaccessible.

**Acceptance Scenarios**:

1. **Given** a user with a "Staff" role, **When** they attempt to access the "System Settings" page, **Then** they should be redirected with an "Access Denied" message.
2. **Given** a "Manager" role includes "Edit Products" but not "Delete Products", **When** a user with this role views a product, **Then** they should see the Save button but not the Delete button.

---

### User Story 3 - Instant Permission Sync (Priority: P3)

As a Super Admin, I want role changes I make to be reflected instantly for the active user so that I can revoke access immediately in case of a security risk without waiting for them to log out.

**Why this priority**: Essential for high-security environments and smooth administrator workflows.

**Independent Test**: Can be tested by having two browsers open (Admin and Staff), changing the Staff's role to "Denied" in the Admin browser, and verifying the Staff browser immediately blocks access or hides restricted UI elements.

**Acceptance Scenarios**:

1. **Given** a user is currently browsing the dashboard as a "Manager", **When** their role is downgraded to "Staff" by an admin, **Then** their UI should instantly update to hide Manager-only components.

---

### Edge Cases

- **Invitation Expiry**: If a user tries to accept an invitation after 7 days, the system should inform them the link has expired and prompt them to request a new one.
- **Duplicate Invitation**: If an admin invites an email that is already a member of the tenant, the system should simply update their role or inform the admin.
- **Clerk/DB Out of Sync**: If a user is deleted from Clerk but still exists in the Supabase `roles` table, the system must handle the missing identity gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST integrate with Clerk's Backend API to list and synchronize user identities.
- **FR-002**: Administrators MUST be able to invite users via email, specifying a destination role.
- **FR-003**: System MUST link invited users to a unique `tenant_id` (or store owner's `clerk_user_id`) upon invitation.
- **FR-004**: Roles and Permissions MUST be persisted in Supabase using the `roles` and `role_permissions` schema.
- **FR-005**: All access attempts (UI routes and API calls) MUST be validated against the user's current permissions in real-time.
- **FR-006**: Permission checks MUST be dynamic and calculated based on the assigned role's permission set.
- **FR-007**: Role updates MUST use a "push" or "subscription" model to ensure clients reflect changes in under 1 second.

### Key Entities *(include if feature involves data)*

- **UserRole**: Intersection between an identity (Clerk User ID), a Tenant, and a Role.
- **Role**: A named collection of permissions (e.g., Admin, Staff, Manager).
- **Permission**: A granular capability (e.g., `orders:read`, `settings:write`).
- **Invitation**: A record of a pending user association with a tenant and role.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can complete a user invitation in under 30 seconds.
- **SC-002**: Role updates permeate to the end-user's UI in less than 1.5 seconds.
- **SC-003**: 100% of restricted API endpoints return 403 Forbidden when accessed by unauthorized roles.
- **SC-004**: System successfully handles 50+ granular permissions per role without performance degradation.

## Assumptions

- We will leverage Clerk for identity management and Supabase for the authorization layer (Permissions DB).
- A "Super Admin" role has hardcoded access to all tenant and administrative features.
- We will use Supabase Realtime or a similar subscription model for role propagation.
- The UI will follow an atomic design pattern where components hide/show based on the current permission state.
