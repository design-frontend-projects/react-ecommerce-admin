# Feature Specification: Supabase OTP Authentication, Onboarding, and Subscription Management

**Feature Branch**: `019-supabase-otp-auth`  
**Created**: 2026-06-25  
**Status**: Draft  
**Input**: User description: "Replace Clerk with Supabase email OTP authentication, onboard new tenants, and enforce active subscriptions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Passwordless Sign-In with Email & OTP (Priority: P1)

As a workspace administrator or member,  
I want to sign in to the application securely using my email and a one-time passcode (OTP) sent to my inbox,  
So that I don't have to remember passwords, and my account remains highly secure.

**Why this priority**: Passwordless sign-in via OTP is the core authentication mechanism replacing Clerk. All other flows depend on the user's authenticated identity.

**Independent Test**: Can be tested independently by entering an email, receiving a 6-digit code via a mock/actual email service, entering the code on the verification screen, and being successfully authenticated and assigned a session.

**Acceptance Scenarios**:

1. **Given** the login page is open,  
   **When** the user enters a valid email address and clicks "Send OTP",  
   **Then** the system requests Supabase Auth to dispatch an OTP, shows a confirmation message containing the masked email (e.g., "j***@example.com"), and redirects the user to the OTP verification screen with a 5-minute countdown.
2. **Given** the OTP verification screen is open with the countdown active,  
   **When** the user enters the correct 6-digit OTP and clicks "Verify",  
   **Then** the system establishes a valid session and directs the user to the application's entry checks (onboarding and subscription).
3. **Given** the OTP verification screen is open,  
   **When** the user enters an incorrect or expired code,  
   **Then** the system displays a clear error message, increments the failure counter, and allows the user to retry.
4. **Given** the OTP cooldown timer (30 seconds) has elapsed,  
   **When** the user clicks "Resend OTP",  
   **Then** the system sends a new OTP, resets the cooldown timer, and updates the expiration countdown to 5 minutes.

---

### User Story 2 - First-Use Workspace Onboarding Modal (Priority: P2)

As a newly registered tenant owner,  
I want to complete a workspace profile setup during my first sign-in,  
So that the system has the necessary organization metadata (e.g., Company name, Timezone, Billing contact) to customize my workspace.

**Why this priority**: High priority because it ensures workspace metadata is properly captured, preventing data anomalies and setting up the system for multi-tenant isolation and customized invoicing.

**Independent Test**: Can be tested by signing in with a brand-new user account (`first_use` flag set to true) and verifying that the onboarding modal immediately appears, blocking access to the dashboard until the required fields are filled out and saved, which changes the `first_use` status to false.

**Acceptance Scenarios**:

1. **Given** a user has successfully verified their OTP and the database indicates `first_use` is true for their tenant subscription,  
   **When** the user enters the application,  
   **Then** they are presented with a non-dismissible onboarding modal titled "Welcome — Let’s set up your workspace".
2. **Given** the onboarding modal is visible,  
   **When** the user fills out all required fields (Company name, Billing contact email, Timezone) and clicks "Save and Continue",  
   **Then** the system validates the inputs, updates the tenant subscription record, sets `first_use` to false, and opens the optional step to invite team members.
3. **Given** the onboarding modal is visible,  
   **When** the user tries to submit the form with missing or invalid fields,  
   **Then** inline validation errors are displayed, and the form cannot be submitted.

---

### User Story 3 - Subscription Status Enforcement & Renewal Portal (Priority: P2)

As a returning tenant owner or member,  
I want the application to automatically check my subscription validity,  
So that I am either granted access to the dashboard or guided to renew my subscription if it has expired or is past due.

**Why this priority**: Vital for business revenue enforcement. Access control must be strictly tied to subscription validity, while providing an easy path for recovery.

**Independent Test**: Can be tested by forcing a tenant's subscription status to expired in the database, launching the application, and verifying that the dashboard is blocked by a renewal modal containing clear upgrade/renewal paths.

**Acceptance Scenarios**:

1. **Given** a user signs in,  
   **When** their tenant subscription status is active and the expiration date is in the future,  
   **Then** the system allows immediate access to the main dashboard.
2. **Given** a user signs in,  
   **When** their tenant subscription status is expired or past due,  
   **Then** the system restricts dashboard actions and displays the subscription renewal modal showing available packages, pricing, and a "Renew" purchase flow.
3. **Given** the renewal modal is open,  
   **When** the user selects a package and successfully completes the checkout process,  
   **Then** the system updates the database with the new expiration date, flips the status to active/paid, closes the modal, and unlocks full application access.

---

### User Story 4 - Inviting Teammates During Onboarding (Priority: P3)

As a tenant owner who has just completed onboarding,  
I want to invite my team members to the workspace immediately,  
So that we can start collaborating without needing to go to settings later.

**Why this priority**: Low priority (P3) because users can invite teammates later from settings; however, it enhances the initial user experience and increases user retention.

**Independent Test**: Can be tested by completing the onboarding form and validating that the optional "Invite Teammates" step allows entering email addresses and sending invites, which registers pending user accounts.

**Acceptance Scenarios**:

1. **Given** the onboarding form has been successfully saved,  
   **When** the invitation step is displayed,  
   **Then** the user can input one or more email addresses, select roles, and click "Send Invites".
2. **Given** the invitation step is displayed,  
   **When** the user clicks "Skip for now",  
   **Then** the system bypasses this step and redirects the user directly to the main dashboard.

---

### Edge Cases

- **Rate-Limiting OTP Requests**: If a client requests more than 3 OTPs within 2 minutes from the same IP or email, the system must temporarily block requests for that target for 15 minutes, displaying a clear rate-limit warning.
- **Maximum OTP Attempt Failures**: If a user enters an incorrect OTP 5 times consecutively, the session token is invalidated, and the user must request a new OTP to prevent brute-force attacks.
- **Mid-Session Expiration**: If a tenant's subscription expires while a user has an active session, the next API call or page transition must trigger a background validation that intercepts the navigation and displays the renewal modal.
- **Orphaned User Accounts**: If the Supabase Auth user is created but the database write to `tenant_subscriptions` fails, the system must detect this desynchronization upon the next login, display a friendly admin support screen, and prevent access.
- **Multiple Simultaneous Logins**: If multiple users from the same tenant log in concurrently, the onboarding state must be checked per tenant subscription. Once one owner completes onboarding, other users logging in concurrently must have their view updated or bypassed to the dashboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST completely replace all Clerk authentication packages, configuration files, middleware, and environment variables with Supabase client-side and server-side configurations.
- **FR-002**: The system MUST provide a single-input page for email entry and client-side validation of standard email formats before triggering an OTP request.
- **FR-003**: The login flow MUST generate a 6-digit OTP via Supabase Auth and trigger an email dispatch to the validated email address.
- **FR-004**: The system MUST implement a 5-minute expiration window for all generated OTPs and show a remaining time countdown (minutes:seconds) on the verification interface.
- **FR-005**: The system MUST enforce a 30-second cooldown period before allowing the "Resend OTP" button to be clicked.
- **FR-006**: The system MUST check the tenant's registration status after successful authentication using the `tenant_subscriptions` table. If `first_use` [NEEDS CLARIFICATION: schema mapping for onboarding and subscriptions] is true, it MUST display the onboarding modal.
- **FR-007**: The system MUST capture and persist organization details (Company name, Billing contact email, Timezone, Industry) during onboarding and update the tenant record's onboarding flag to false upon saving.
- **FR-008**: The system MUST check subscription status (`status` and `end_date`) in `tenant_subscriptions` on application entry and block dashboard access with a renewal modal if the status is not valid.
- **FR-009**: The renewal modal MUST display the currently active/expired plan details, package pricing tiers, and direct the user to a secure payment checkout integration.
- **FR-010**: The application MUST emit structured telemetry events for system auditing, including: `otp_requested`, `otp_verified`, `onboarding_completed`, `subscription_renewed`, and `invite_sent`.
- **FR-011**: Onboarding modal [NEEDS CLARIFICATION: modal dismissal rules] dismissibility.
- **FR-012**: Feature Flag Rollout [NEEDS CLARIFICATION: auth integration toggle scope].

### Key Entities *(include if feature involves data)*

- **Tenant Subscription (`tenant_subscriptions`)**: Represents a tenant's billing, status, and subscription details.
  - *Attributes*: `id` (UUID), `auth_user_id` (UUID), `email` (String), `subscription_id` (Integer), `status` (Enum: `new`, `paid`, `canceled`), `start_date` (DateTime), `end_date` (DateTime), `first_name` (String), `last_name` (String), `is_owner` (Boolean).
- **Tenant User (`tenant_users`)**: Represents a user account linked to a specific tenant workspace.
  - *Attributes*: `id` (UUID), `auth_user_id` (UUID), `email` (String), `first_name` (String), `last_name` (String), `onboarding_complete` (Boolean), `parent_tenant_id` (UUID - references `tenant_subscriptions.id`).
- **Subscription Package (`subscriptions`)**: Defines available pricing and duration tiers.
  - *Attributes*: `id` (Integer), `name` (String), `price` (Decimal), `duration_months` (Integer).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Clerk-related dependencies, scripts, and components are completely removed from the codebase.
- **SC-002**: Users with a valid email address can receive and verify their OTP to access the application within 90 seconds.
- **SC-003**: 100% of new sign-ins with `first_use` true are intercepted by the onboarding modal and cannot bypass it to access the dashboard.
- **SC-004**: 100% of expired subscriptions block dashboard interactivity and successfully display the subscription renewal modal.
- **SC-005**: All payment confirmation webhooks update `tenant_subscriptions.status` and `end_date` within 3 seconds, immediately restoring application access.
- **SC-006**: Telemetry coverage is 100% for all specified user journeys (auth, onboarding, renewal).

## Assumptions

- The Supabase project is already configured with email OTP providers and standard email templates.
- Stripe or another payment gateway is utilized for handling the checkout session, which updates the database via secure webhooks.
- Mobile client support is out of scope; the authentication, onboarding, and subscription modals are designed for desktop and responsive web layouts.
- Users have standard, stable email delivery speeds; fallback guidance is provided if delivery takes longer than 60 seconds.
