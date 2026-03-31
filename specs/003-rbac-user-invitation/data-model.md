# Data Model: RBAC and User Enrollment

This project leverages existing PostgreSQL tables for RBAC, synced with Clerk for identity management.

## Entities

### `res_employees` (Existing)
Represents a user/employee in the system.
- `id`: UUID (Primary Key)
- `user_id`: String (Clerk User ID)
- `email`: String (Unique)
- `first_name`: String
- `last_name`: String
- `phone`: String?
- `avatar_url`: String?
- `is_active`: Boolean (Default: true)
- `pin_code`: String? (For POS access)

### `res_roles` (Existing)
Defines a set of permissions.
- `id`: UUID (Primary Key)
- `name`: String (Unique, e.g., 'Admin', 'Waiter', 'Manager')
- `description`: String?
- `is_active`: Boolean

### `permissions` (Existing)
Granular actions allowed in the system.
- `id`: UUID (Primary Key)
- `name`: String (Unique, e.g., 'orders.create', 'users.manage')
- `description`: String?

### `res_employee_roles` (Existing)
Many-to-many join table between employees and roles.
- `employee_id`: UUID (FK to `res_employees`)
- `role_id`: UUID (FK to `res_roles`)

### `role_permissions` (Existing)
Many-to-many join table between roles and permissions.
- `role_id`: UUID (FK to `res_roles`)
- `permission_id`: UUID (FK to `permissions`)

## Clerk Metadata Sync
To minimize database lookups on every request, we store the primary role and essential flags in the Clerk User metadata.

- **Public Metadata**:
  - `role`: The name of the primary role (e.g., "Admin").
  - `onboardingComplete`: Boolean flag set after the "Complete Account" screen is submitted.

## State Transitions

1. **Invitation Sent**: Invitation created in Clerk; `publicMetadata.role` set.
2. **User Sign-Up**: User record created in Clerk.
3. **Onboarding**: User lands on `/complete-account`; fills in `first_name` and `last_name`.
4. **Sync**: On submit, `res_employees` is updated/created, and `onboardingComplete: true` is set in Clerk.
