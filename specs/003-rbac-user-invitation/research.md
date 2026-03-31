# Research: RBAC and User Invitation

## Clerk Backend API for Invitations

### Findings
- **API Endpoint**: `clerkClient.invitations.createInvitation({ emailAddress, publicMetadata, redirectUrl })`.
- **Metadata**: We can store the intended `role` in `publicMetadata` so it's available when the user signs up.
- **Webhook**: Use `user.created` or `invitation.accepted` (if available) to sync the user to the `tenant_users` table.
- **Redirect**: The `redirectUrl` can point to `/complete-account` to force profile data entry.

### Decisions
- Use `clerkClient.invitations.createInvitation` to send invites.
- Store the initial role in `publicMetadata`.
- Redirect users to `/complete-account` after successful sign-up.

## TanStack Start + Clerk Integration

### Findings
- **Server Functions**: `createServerFn` can access the request headers. We need to initialize the Clerk backend SDK with `CLERK_SECRET_KEY`.
- **Middleware**: Use Clerk's middleware to protect routes.
- **Context**: Pass the `userId` and `role` to server functions via context or directSDK calls within the function.

### Decisions
- Initialize a shared `clerkClient` in `src/server/clerk.ts`.
- Create a `requireAuth` helper for `createServerFn` that validates the Clerk session.

## DB Schema Alignment

### Findings
- **Table**: `tenant_users` needs to link to `clerk_user_id`.
- **Roles**: Tables `roles`, `permissions`, `role_permissions`, and `user_roles` provide a standard RBAC foundation.
- **Sync**: When a user completes their account, we update `tenant_users`.

### Decisions
- Maintain a many-to-many relationship between users and roles in the DB.
- Use `publicMetadata` in Clerk as a "cache" for the user's primary role to avoid DB lookups on every request.

## Unresolved Clarifications
- None.
