# Research: User Role Management & Real-Time RBAC

**Feature**: 015-user-role-management
**Status**: Completed

## Findings

### 1. Clerk Invitation & Tenant Association
**Decision**: Use `clerkClient.invitations.createInvitation()` with `publicMetadata` to store `tenant_id`.
**Rationale**: When a user joins, the `tenant_id` is already in their session metadata. We can then sync this to our Supabase `user_roles` table during the first login.
**Flow**:
1. Admin triggers invite -> Clerk sends email with `tenant_id` in metadata.
2. User signs up -> `publicMetadata.tenant_id` is set in Clerk.
3. Application middleware/webhook -> Sync `clerk_user_id` + `tenant_id` to Supabase.

### 2. Real-Time Permissions Propagation
**Decision**: Use Supabase Realtime `postgres_changes` subscriptions.
**Rationale**: The client-side `rbac.ts` logic will subscribe to changes in the `user_roles` table for the current user.
**Implementation**:
```typescript
supabase
  .channel('user-role-updates')
  .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'user_roles', filter: `clerk_user_id=eq.${userId}` },
      (payload) => {
        // Force refresh TanStack Query cache or update Zustand store
        queryClient.invalidateQueries(['permissions', userId]);
      }
  )
  .subscribe()
```

### 3. Dynamic Permission Mapping
**Decision**: Store permissions as an array of strings in the `roles` table.
**Rationale**: Allows for O(1) checking using a Set on the client.
**Structure**:
- `roles`: `id`, `name`, `permissions` (JSONB: string[])
- `user_roles`: `clerk_user_id`, `role_id`, `tenant_id`

### 4. RBAC Utility (`rbac.ts`)
**Pattern**:
```typescript
const permissions = useUserPermissions(); // Hook using Zustand + Realtime
const can = (action: string) => permissions.has(action);
```

## Decision Summary
Leverage Clerk for the invitation workflow and Supabase Realtime for the dynamic permission enforcement layer. This provides a premium "Live" administrative experience.
