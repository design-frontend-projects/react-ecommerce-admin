# Research: Supabase OTP Authentication, Onboarding, and Subscription Management

This document records the architectural research and technical decisions made to resolve unknowns in the feature specification.

## Decided Items

### Decision 1: Database Schema Mapping for Onboarding
- **Decision**: Add a `first_use` column to the `tenant_subscriptions` table via a Prisma migration.
- **Rationale**: Since onboarding is a tenant-level business configuration flow, tracking it on the `tenant_subscriptions` record provides a clean, single point of truth for workspace readiness. It avoids mixing tenant-level lifecycle state with user-level profile flags like `tenant_users.onboarding_complete`.
- **Alternatives considered**:
  - *Option B (User-level tracking)*: Rejected because if a workspace owner has multiple users, each user would be prompted for onboarding details separately, which leads to duplicate setup and data overwriting.
  - *Option C (Derived status)*: Rejected because checking for existing branches/stores on every page launch requires extra database joins/queries, adding unnecessary overhead compared to a single boolean flag lookup.

### Decision 2: Onboarding Modal Dismissibility
- **Decision**: Strictly Mandatory (Non-dismissible).
- **Rationale**: Capturing tenant metadata (Company name, Billing contact email, Timezone) is required to initialize the tenant workspace properly. Without this data, key features (like regional settings, tax rates, and invoicing) will fail due to missing fields.
- **Alternatives considered**:
  - *Option B (Role-based skip)*: Rejected because the initial user (owner) must configure the workspace before anyone else can do meaningful work. Non-owner invitees won't see this modal anyway if they are added post-onboarding.
  - *Option C (Optional with defaults)*: Rejected because generic defaults for Company name and Billing contact are not business-viable.

### Decision 3: Authentication Migration & Rollout Strategy
- **Decision**: Config Toggle.
- **Rationale**: Using an environment variable switch (`AUTH_PROVIDER=supabase`) allows developers to test the Supabase Auth integration in lower environments while leaving Clerk intact. It also provides an instant rollback capability in case of unexpected production issues.
- **Alternatives considered**:
  - *Option A (Hard swap)*: Rejected due to the high risk of lock-out or service interruption for active users.
  - *Option C (Dual-auth)*: Rejected because maintaining two active session providers simultaneously creates complex middleware session verification logic and increases security vulnerabilities.

---

## Technical Investigations

### 1. Supabase Auth Email OTP Flow
- **Provider API**: `supabase.auth.signInWithOtp({ email })` triggers OTP delivery.
- **Verification API**: `supabase.auth.verifyOtp({ email, token, type: 'email' })` validates the 6-digit OTP and establishes the session.
- **Security Check**: Rate-limiting is configured natively in the Supabase Dashboard under Auth Settings (e.g., maximum OTP requests per hour/IP). Attempt limits must be checked at the application route level.

### 2. Prisma Model Updates
- The `tenant_subscriptions` model will be modified to include:
  ```prisma
  first_use Boolean @default(true)
  ```
- A Prisma migration will be generated using `npx prisma migrate dev`.
