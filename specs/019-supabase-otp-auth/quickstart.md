# Quickstart Guide: Supabase OTP Authentication, Onboarding, and Subscription Management

This guide helps developers set up the local environment and database to run and test the new Supabase Email OTP authentication flow, tenant onboarding modal, and subscription verification.

## Prerequisites

1. A running Supabase project (local or hosted).
2. The Supabase CLI installed and configured.
3. Access to the environment variables file (`.env`).

## Setup Steps

### 1. Configure Supabase Auth

1. Go to your Supabase Project -> **Authentication** -> **Providers** -> **Email**.
2. Enable **Confirm Email** (optional but recommended for production; disable for easier local testing of OTP without email confirmation links).
3. Under **OTP** configuration:
   - Set **OTP Length** to `6`.
   - Set **OTP Expiry** to `300` seconds (5 minutes).

### 2. Update Environment Variables

Add the following environment variables to your `.env` file at the root of the project:

```env
# Toggle Auth Provider: 'clerk' or 'supabase'
AUTH_PROVIDER=supabase

# Supabase Auth Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Run Database Migrations

Apply the database schema changes to add `first_use` to the `tenant_subscriptions` table:

```bash
# Generate the Prisma migration file
pnpm prisma migrate dev --name add_tenant_onboarding_flag

# Verify the changes in your database
pnpm prisma studio
```

### 4. Running the Dev Server

Start the application locally using:

```bash
pnpm dev
```

Navigate to `http://localhost:5173/login` (or the configured dev server port) to view the login interface.

## Local Testing Scenarios

### Test 1: First-Use Onboarding Flow
1. Insert a new subscription in the database (or via Prisma Studio) with `first_use: true` and `status: "paid"`.
2. Enter the corresponding email on the Login page and click **Send OTP**.
3. Retrieve the 6-digit OTP from your Supabase local logs or inbox.
4. Input the code on the verification screen.
5. Verify you are automatically redirected to the **Welcome Onboarding Modal**.
6. Submit the form and verify that `first_use` becomes `false` in the database, and you are redirected to the main dashboard.

### Test 2: Expired Subscription Gate
1. Set a tenant's subscription `end_date` to a past date (e.g., yesterday) and `status: "canceled"`.
2. Log in with an email associated with that tenant.
3. Verify that you are blocked by the **Subscription Required** modal and cannot access dashboard pages.
