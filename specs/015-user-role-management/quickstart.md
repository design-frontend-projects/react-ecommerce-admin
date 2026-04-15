# Quickstart: User Role Management

## Setup

1. **Environment Variables**:
   Ensure `CLERK_SECRET_KEY` and `NEXT_PUBLIC_SUPABASE_URL`/`KEY` are present in `.env.local`.

2. **Database Migration**:
   ```bash
   npx prisma migrate dev --name add_rbac_tables
   ```

3. **Seed Initial Roles**:
   Run the seed script to populate the `roles` table with Admin, Manager, and Staff roles.

## Core Workflows

### 1. Inviting a User
```typescript
import { inviteUser } from "@/features/users/data/actions";

await inviteUser({
  email: "newuser@example.com",
  role_id: "uuid-of-staff-role",
  tenant_id: "current-tenant-id"
});
```

### 2. Checking Permissions
```tsx
import { useRBAC } from "@/features/users/data/rbac";

function ProductPage() {
  const { can } = useRBAC();
  
  return (
    <div>
      {can('manage_products') && <button>Edit Product</button>}
    </div>
  );
}
```

## Real-Time Updates
When a user's role is updated in the database, the `useRBAC` hook will automatically update the `can()` results without a page refresh, as it subscribes to the `user_roles` table in Supabase.
