# Tasks: Supabase OTP Authentication, Onboarding, and Subscription Management

**Input**: Design documents from `/specs/019-supabase-otp-auth/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/auth-api.md, quickstart.md

**Tests**: Vitest tests are included in the task list for each user story phase to ensure full coverage of authentication state, validation, and route gating.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Configure Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AUTH_PROVIDER`) in `.env`
- [x] T002 Initialize Supabase JS client client wrapper in `src/lib/supabase.ts`
- [x] T003 [P] Configure Vitest test setup files and execution script inside `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define Prisma 7 database migration adding `first_use` (Boolean, default true) field to `tenant_subscriptions` model in `prisma/schema.prisma`
- [x] T005 [P] Run Prisma migration and regenerate Prisma client types in `src/generated/prisma/`
- [x] T006 Implement Auth state management Zustand store in `src/store/authStore.ts`
- [x] T007 [P] Create validation schema for Email and OTP entries using Zod in `src/lib/validation/auth.ts`
- [x] T008 Implement route gating utilities and session validation helpers in `src/lib/auth-guard.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Passwordless Sign-In with Email & OTP (Priority: P1) 🎯 MVP

**Goal**: Allow users to request and verify a 6-digit OTP using email address to establish a secure session via Supabase Auth.

**Independent Test**: User can input email, click send, verify countdown starts, enter OTP received, and be authenticated successfully into the app.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Write unit tests for email and OTP Zod validation schemas in `src/__tests__/auth-validation.test.ts`
- [x] T010 [P] [US1] Write integration tests for OTP authentication request and verification logic in `src/__tests__/auth-flow.test.ts`

### Implementation for User Story 1

- [x] T011 [P] [US1] Build React form component for Email input screen in `src/components/auth/LoginEmailForm.tsx`
- [x] T012 [P] [US1] Build React component for OTP input screen with countdown timers in `src/components/auth/LoginOtpForm.tsx`
- [x] T013 [US1] Implement TanStack Router wrapper routes/pages to manage Auth views in `src/routes/login.tsx`
- [x] T014 [US1] Create TanStack Query mutation hooks for sending and verifying OTP in `src/hooks/useAuthMutations.ts`
- [x] T015 [US1] Add structured telemetry event logs for `otp_requested` and `otp_verified` in `src/lib/telemetry.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - First-Use Workspace Onboarding Modal (Priority: P2)

**Goal**: Force newly registered workspace owners to complete profile setup (Company Name, Billing Contact Email, Timezone, Industry) before dashboard access.

**Independent Test**: Setting `first_use: true` in database triggers a non-dismissible onboarding modal which, when filled and saved, flips `first_use: false` and enables normal app access.

### Tests for User Story 2

- [x] T016 [P] [US2] Write unit tests for onboarding Zod validation schema in `src/__tests__/onboarding-validation.test.ts`
- [x] T017 [P] [US2] Build React form component for Onboarding data collection in `src/components/auth/OnboardingForm.tsx`
- [x] T018 [US2] Build global overlay Modal component for Onboarding in `src/components/auth/OnboardingModal.tsx`
- [x] T019 [US2] Create API route for `/api/tenant/onboard` handling form submission and Prisma DB updates in `src/app/api/tenant/onboard/route.ts`
- [x] T020 [US2] Integrate `OnboardingModal` into global layout to render if `session.user.first_use === true`
- [x] T021 [US2] Add telemetry event log for `onboarding_completed` in API route/actionb/telemetry.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Subscription Status Enforcement & Renewal Portal (Priority: P2)

**Goal**: Check tenant subscription status (`status`, `end_date`) and block/gate dashboard access with a renewal portal if the subscription is expired or cancelled.

**Independent Test**: A tenant with `status: "canceled"` or expired `end_date` will see the non-dismissible subscription renewal modal blocking normal dashboard views, which unlocks immediately when subscription updates to paid/active.

### Tests for User Story 3

- [x] T022 [P] [US3] Write unit tests for subscription validation logic in `src/__tests__/subscription-validation.test.ts`
- [x] T023 [US3] Create TanStack query hook `useSubscription()` fetching from `/api/tenant/subscription/status`

### Implementation for User Story 3

- [x] T024 [US3] Create API route for `/api/tenant/subscription/status`
- [x] T025 [US3] Integrate subscription check into global layout `src/routes/__root.tsx` 
- [x] T026 [US3] Build `SubscriptionRenewalModal` and trigger visibility when `session.user.subscription.status !== 'paid'`
- [x] T027 [US3] Add telemetry event log for `subscription_renewed` in `src/lib/telemetry.ts`

**Checkpoint**: User Stories 1, 2, and 3 should now be fully functional and testable independently

---

## Phase 6: User Story 4 - Inviting Teammates During Onboarding (Priority: P3)

**Goal**: Add an optional step to the onboarding flow allowing the tenant owner to invite team members by email and assign them roles.

**Independent Test**: The owner can input multiple emails and roles on the second step of onboarding and click "Send Invites", or click "Skip for now" to bypass it.

### Tests for User Story 4

- [ ] T029 [P] [US4] Write unit tests for invitation validation schemas in `src/__tests__/invite-validation.test.ts`
- [ ] T030 [P] [US4] Write integration tests for email invitation dispatch operations in `src/__tests__/invite-flow.test.ts`

### Implementation for User Story 4

- [ ] T031 [P] [US4] Build invite form layout step inside onboarding module in `src/components/auth/InviteStep.tsx`
- [ ] T032 [US4] Implement API endpoint or server action to register pending user invitations in `src/routes/api/tenant/invite.ts`
- [ ] T033 [US4] Add telemetry event tracking for `invite_sent` in `src/lib/telemetry.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T028 Update `README.md` to document new Supabase Auth flow and variables
- [x] T029 Create `walkthrough.md` documenting the new architecture
- [x] T030 Final testing: run `npm test` and `npm run lint` and verify build passes
- [ ] T036 Run full Vitest suite to ensure no code regressions exist
- [ ] T037 Perform manual verification testing following the test scenarios in `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Bypassed for returning users
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Requires returning or onboarded user profiles
- **User Story 4 (P3)**: Depends on User Story 2 onboarding form completion

### Parallel Opportunities

- Setup tasks (T001, T002, T003) can be worked on in parallel.
- Database migration tasks (T004, T005, T007) can be executed concurrently.
- Once Foundation (Phase 2) is complete, User Story 1 (P1), User Story 2 (P2), and User Story 3 (P2) can be implemented in parallel across different developer assignments.

---

## Parallel Example: User Story 1

```bash
# Implement the presentation forms simultaneously
Task: "Build React form component for Email input screen in src/components/auth/LoginEmailForm.tsx"
Task: "Build React component for OTP input screen with countdown timers in src/components/auth/LoginOtpForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Verify login and session validation behaves correctly.

### Incremental Delivery

1. Deliver foundation.
2. Deliver OTP Authentication (MVP).
3. Deliver Onboarding.
4. Deliver Subscription Gates.
5. Deliver Team Invitations.
