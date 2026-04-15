# Data Model: User Roles & Permissions

## Prisma Schema (Supabase/Postgres)

```prisma
model roles {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String         @unique
  permissions     Json           // Array of strings: ["view_orders", "edit_products"]
  created_at      DateTime       @default(now()) @db.Timestamp(6)
  updated_at      DateTime       @default(now()) @db.Timestamp(6)
  user_roles      user_roles[]
}

model user_roles {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clerk_user_id   String         @unique
  role_id         String         @db.Uuid
  tenant_id       String         // Associates user with a specific store/tenant
  created_at      DateTime       @default(now()) @db.Timestamp(6)
  updated_at      DateTime       @default(now()) @db.Timestamp(6)
  
  role            roles          @relation(fields: [role_id], references: [id])
}
```

## Initial Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Super Admin** | `["*"]` (Global access) |
| **Admin** | `["view_dashboard", "manage_users", "manage_settings", "manage_products", "manage_orders"]` |
| **Manager** | `["view_dashboard", "manage_products", "manage_orders", "view_reports"]` |
| **Staff** | `["view_products", "create_orders", "view_orders"]` |

## Zod Schemas (`src/features/users/data/schema.ts`)

```typescript
export const RoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  permissions: z.array(z.string()),
});

export const UserInvitationSchema = z.object({
  email: z.string().email(),
  role_id: z.string().uuid(),
  tenant_id: z.string(),
});
```

## State Transitions
1. **Invite**: `POST /api/users/invite` -> Clerk Invitation Created -> `user_roles` pending state.
2. **Accept**: User Signs Up -> Clerk Webhook -> Update `user_roles` to `clerk_user_id`.
3. **Role Change**: Admin Update -> Supabase Write -> Realtime Notify Client -> UI Refresh.
