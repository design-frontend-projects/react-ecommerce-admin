# Server Function Contracts: Users & RBAC

The following functions are exposed via `createServerFn`.

## User & Invitation Functions

### `inviteUser`
- **Method**: POST
- **Payload**:
  ```ts
  {
    email: string;
    roleId: string;
    roleName: string;
  }
  ```
- **Description**: Creates a Clerk invitation and attaches `role` and `onboardingComplete: false` to metadata.
- **Access**: `users.manage` permission required.

### `completeOnboarding`
- **Method**: POST
- **Payload**:
  ```ts
  {
    clerkId: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }
  ```
- **Description**: Updates `res_employees` and sets `onboardingComplete: true` in Clerk User metadata.
- **Access**: User must be authenticated and matching `clerkId`.

## RBAC Functions

### `updateUserRoles`
- **Method**: POST
- **Payload**:
  ```ts
  {
    userId: string;
    roleIds: string[];
  }
  ```
- **Description**: Updates the `res_employee_roles` mapping.
- **Access**: `users.manage` permission required.

### `getRolesPermissions`
- **Method**: GET
- **Returns**:
  ```ts
  {
    roles: RoleWithPermissions[];
    allPermissions: Permission[];
  }
  ```
- **Description**: Retrieves all roles, their associated permissions, and the system-wide permission set.
- **Access**: `users.view` permission required.
