# Feature Specification: RBAC and User Invitation Module

**Feature Branch**: `003-rbac-user-invitation`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "implement rbac module and user invetation using clerk backend api and tanstack start createServerFn to define and implement users and then allow users to complete thier account details from new scren called complete account, and after invetation sent create new record in table tenant_users and use the same structure of the table defined in @[src/generated/prisma/schema.prisma]also create tabs to define roles and permissions and combine roles with permissions and fix relationship if needed also alter the full flow and allo logged in user with admin or super_admin roles from clerk to define the role of the user from roles list@[e:\web-projects\web-mobile-work-apps\react-ecommerce-restuarant\src\features\users] alter this component also to meet the new functionality, and use CLERK_SECRET_KEY to initialize clerk/backend and write server functionality"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Invites a New User (Priority: P1)

As an Admin or Super Admin, I want to invite a new user by their email address so that they can join the organization with a specific role.

**Why this priority**: Core functionality needed to onboard new team members.

**Independent Test**: Can be tested by an admin entering an email and selecting a role, resulting in an invitation being sent via Clerk and a record created in `tenant_users`.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they enter a valid email and click "Invite", **Then** a Clerk invitation is sent and a `tenant_users` record is created with `is_active=false`.
2. **Given** an admin is logged in, **When** they try to invite an already existing email, **Then** an error message is displayed.

---

### User Story 2 - Invited User Completes Account (Priority: P1)

As an invited user, I want to follow the invitation link and complete my profile details so that I can start using the application.

**Why this priority**: Critical path for new users to gain access.

**Independent Test**: Can be tested by clicking an invitation link, signing up/upgrading with Clerk, and then being redirected to the "Complete Account" screen to provide details.

**Acceptance Scenarios**:

1. **Given** a user opens an invitation link, **When** they complete the Clerk sign-up, **Then** they are redirected to `/complete-account`.
2. **Given** a user is on the "Complete Account" screen, **When** they provide their first name and last name, **Then** their `tenant_users` record is updated and they are granted access.

---

### User Story 3 - Role and Permission Management (Priority: P2)

As a Super Admin, I want to define roles and assign specific permissions to them so that I can control what users can see and do.

**Why this priority**: Essential for fine-grained access control beyond simple "Admin" or "User" labels.

**Independent Test**: Can be tested by creating a "Manager" role and assigning "view:inventory" and "edit:inventory" permissions to it.

**Acceptance Scenarios**:

1. **Given** a Super Admin is in the Settings, **When** they create a new Role, **Then** it appears in the roles list.
2. **Given** a Super Admin selects a Role, **When** they toggle permissions in the permissions tab, **Then** the `role_permissions` table is updated accordingly.

---

### User Story 4 - Assigning Roles to Users (Priority: P2)

As an Admin, I want to manage the roles of existing users so that I can adjust their access as their responsibilities change.

**Why this priority**: Necessary for ongoing organization management.

**Independent Test**: Can be tested by changing a user's role and verifying that their permissions update immediately.

**Acceptance Scenarios**:

1. **Given** an Admin is viewing the User list, **When** they select a user and change their role, **Then** the `user_roles` record is updated.

---

### Edge Cases

- **Expired Invitations**: How does the system handle a user clicking an invitation link that has expired in Clerk?
- **Incomplete Setup**: What happens if a user signs up but closes the browser before completing the "Complete Account" screen?
- **Conflicting Roles**: How are permissions resolved if a user is assigned multiple roles with conflicting permissions? (Assumption: Union of permissions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow privileged users to invite new members via email.
- **FR-002**: System MUST persist a record of the invitation and associate it with the organization's user database.
- **FR-003**: System MUST provide a profile completion workflow for new users to fill in required account details.
- **FR-004**: System MUST support the creation and management of customizable user roles.
- **FR-005**: System MUST allow mapping granular permissions to specific roles.
- **FR-006**: System MUST enforce server-side authorization for all protected actions based on the user's effective permissions.
- **FR-007**: System MUST allow administrators to assign one or more roles to users.
- **FR-008**: System MUST integrate the existing user management interface with the new role-based capabilities.

### Key Entities *(include if feature involves data)*

- **Tenant User**: Represents a user within a tenant, linked to a Clerk ID.
- **Role**: A named collection of permissions (e.g., "Administrator", "Inventory Manager").
- **Permission**: A specific action that can be performed (e.g., "create:product").
- **User Role**: Mapping between a Tenant User and a Role.
- **Role Permission**: Mapping between a Role and a Permission.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Privileged users can initiate an invitation in under 30 seconds.
- **SC-002**: 100% of new users are successfully guided through the profile completion screen before accessing primary features.
- **SC-003**: 100% of protected actions undergo authorization checks prior to data mutation.
- **SC-004**: Users with specialized administrative roles can view and manage the hierarchical permission structure via the UI.

## Assumptions

- **Clerk Metadata**: We will store the user's current role in Clerk's `publicMetadata` or `privateMetadata` for fast access on the frontend/middleware.
- **Permissions List**: A default set of permissions (e.g., CRUD for existing modules) will be pre-seeded.
- **Single Tenant**: The implementation assumes a single-tenant or simplified-tenant structure as defined in the provided schema.
- **Email Delivery**: Clerk will handle the actual sending of invitation emails.
