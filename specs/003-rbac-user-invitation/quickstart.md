# Quickstart: RBAC and User Invitation

## Prerequisites
- Clerk with **Dashboard > Invitations** enabled.
- `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` in `.env`.
- Database access (Prisma).

## Setup
1.  **DB Seed**: Ensure roles and base permissions exist in the `res_roles` and `permissions` tables.
2.  **Environment Variables**: Add `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` and ensure the sign-up flow is configured to allow user enrollment.

## Using the Invitation Flow
1.  Navigate to **Users > Invite System**.
2.  Enter the email of the person you want to invite.
3.  Select a role from the dropdown (Admin, Manager, Waiter).
4.  The invitation will be sent via Clerk; the role is stored in `publicMetadata`.

## Onboarding
When a new user accepts the invitation and signs up, they'll be automatically redirected to `/complete-account` if `publicMetadata.onboardingComplete` is missing or false.
1.  Fill in the form (First Name, Last Name).
2.  The system calls the `completeOnboarding` server function.
3.  The database `res_employees` table is updated with the user's details.
4.  User is redirected to the main dashboard.

## RBAC Verification
1.  Check if a user has a specific permission:
    - `await hasPermission(userId, 'orders.create')`
2.  In the UI:
    - `<Can perform="orders.create"> ... </Can>`
