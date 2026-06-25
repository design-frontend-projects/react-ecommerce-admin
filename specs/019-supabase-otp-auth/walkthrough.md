# Supabase OTP Auth Implementation Walkthrough

We've successfully migrated the authentication system from Clerk to Supabase Email OTP, providing a secure, passwordless sign-in experience while enforcing workspace onboarding and subscription gating.

## Key Changes Made

### 1. Database Schema Updates
- Added the `first_use` (Boolean, default `true`) field to the `tenant_subscriptions` model in `prisma/schema.prisma` to track onboarding state.
- Generated the updated Prisma client.

### 2. State Management & Auth Flow
- Implemented `useAuthStore` in `src/store/authStore.ts` utilizing Zustand and Zustand persistence for local caching of authentication state. It syncs dynamically with `supabase.auth.onAuthStateChange`.
- Built `auth-guard.ts` to ensure users are authenticated before accessing protected routes.
- Created robust Zod validation schemas (`emailSchema`, `otpSchema`) for auth payloads, and `onboardingSchema` for profile setup.

### 3. User Interfaces
- **Login Flow**:
  - `LoginEmailForm.tsx`: A clean form that prompts the user for their email address.
  - `LoginOtpForm.tsx`: Contains the 6-digit `InputOTP` field alongside a 30-second resend countdown.
  - `login.tsx`: The primary route module connecting the forms to Supabase logic via TanStack query mutations (`useAuthMutations.ts`).
- **Gating Components**:
  - `OnboardingModal.tsx`: Appears globally if `subscription.first_use === true`. It collects company details and marks the workspace as active.
  - `SubscriptionRenewalModal.tsx`: Gating interface triggering when the active workspace subscription expires or payments fail, directing the user to billing management.
  - Both modals are integrated tightly into `src/routes/__root.tsx`.

### 4. API Endpoints & Validations
- `GET /api/tenant/subscription/status`: Evaluates the current user's role and fetches active subscription state.
- `POST /api/tenant/onboard`: Verifies payload, updates the database by flipping `first_use: false`, and logs success via telemetry.

### 5. Code Quality & Cleanup
- Ensured zero references to `clerk` exist across the repository.
- Expanded the unit and integration test suite targeting validation logic and workflow interactions (`auth-validation.test.ts`, `auth-flow.test.ts`, `onboarding-validation.test.ts`, `subscription-validation.test.ts`).

## How to Test
1. Set `VITE_AUTH_PROVIDER=supabase` in `.env`.
2. Run `npm run dev`.
3. Navigate to `/login` and submit a valid email to trigger an OTP via Supabase.
4. Input the code and confirm routing to the dashboard where the Onboarding Modal should appear (for a fresh user).
5. Completing the onboarding form hides the modal, persisting your setup in Prisma!
