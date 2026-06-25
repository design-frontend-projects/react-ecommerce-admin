# Data Model Specification

This document details the database changes and entity relationships required for Supabase OTP Auth, onboarding, and subscription management.

## Database Changes

We will perform a Prisma schema migration to modify the `tenant_subscriptions` model.

### 1. `tenant_subscriptions` Table Updates

We will add a `first_use` flag to track whether the tenant has completed their initial workspace setup.

```diff
model tenant_subscriptions {
  id                String                       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  auth_user_id     String @db.Uuid
  email             String                       @db.VarChar(255)
  subscription_id   Int
  status            subscription_status          @default(new)
+ first_use         Boolean                      @default(true)
  start_date        DateTime?                    @db.Timestamp(6)
  end_date          DateTime?                    @db.Timestamp(6)
  created_at        DateTime?                    @default(now()) @db.Timestamp(6)
  updated_at        DateTime?                    @default(now()) @db.Timestamp(6)
  commission_amount Decimal?                     @default(0) @db.Decimal(10, 2)
  commission_type   subscription_commission_type @default(subscription)
  first_name        String?
  last_name         String?
  is_owner          Boolean?
  subscriptions     subscriptions                @relation(fields: [subscription_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  tenant_users      tenant_users[]

  @@index([auth_user_id], map: "idx_tenant_subscriptions_auth_user_id")
  @@index([status], map: "idx_tenant_subscriptions_status")
}
```

## Entity Schema & Attributes

### Tenant Subscription (`tenant_subscriptions`)
- **Purpose**: Represents a tenant's billing, status, and subscription details.
- **Attributes**:
  - `id` (UUID, Primary Key): Unique identifier for the tenant subscription.
  - `auth_user_id` (UUID): Reference to the owner's authenticated user ID in Supabase.
  - `email` (String): Owner's email address (used as the primary billing contact).
  - `status` (Enum: `new`, `paid`, `canceled`): Current subscription status.
  - `first_use` (Boolean, Default: `true`): Flag indicating if the tenant onboarding is pending.
  - `start_date` (DateTime): Date the subscription started.
  - `end_date` (DateTime): Date the subscription expires.
  - `is_owner` (Boolean): Flag identifying if the user is the primary billing owner of the tenant space.

### Tenant User (`tenant_users`)
- **Purpose**: Represents individual user accounts belonging to a tenant workspace.
- **Attributes**:
  - `id` (UUID, Primary Key): Unique identifier for the user.
  - `auth_user_id` (UUID, Unique): Reference to the Supabase authenticated user ID.
  - `email` (String, Unique): User's email address.
  - `onboarding_complete` (Boolean): User-level onboarding status flag.
  - `parent_tenant_id` (UUID, Foreign Key): Reference to `tenant_subscriptions.id`.

## Validation Rules
1. **Subscription Status**: A tenant's subscription status must be checked:
   - Access is allowed only if `status` is `paid` AND `end_date` is in the future.
   - If `status` is `new` or `canceled`, or if `end_date` has passed, access to core features must be blocked.
2. **Onboarding Eligibility**:
   - Onboarding is only prompted if the user has a valid authenticated session AND `tenant_subscriptions.first_use` is `true`.
   - Once onboarding details are successfully saved, `first_use` MUST be updated to `false` in the same database transaction.
