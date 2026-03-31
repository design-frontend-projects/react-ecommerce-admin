# Tasks: RBAC and User Invitation Module

**Input**: Design documents from `/specs/003-rbac-user-invitation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the spec, so implementation follows a direct approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure for RBAC and invitations per implementation plan
- [ ] T002 Initialize Clerk Backend SDK with `CLERK_SECRET_KEY` in `src/server/clerk.ts`
- [ ] T003 [P] Create `requireAuth` helper for server functions in `src/server/utils/auth.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T004 Implement `getRolesPermissions` server function in `src/server/fns/rbac.ts`
- [ ] T005 [P] Create reusable `<Can />` authorization component in `src/components/rbac/Can.tsx`
- [ ] T006 Setup Prisma client abstraction in `src/lib/prisma.ts` for RBAC queries

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Admin Invites a New User (Priority: P1) 🎯 MVP

**Goal**: Allow admins to invite new users by email and assign an initial role via Clerk invitations.

**Independent Test**: Use the "Invite User" modal to send an invitation. Verify Clerk Dashboard shows the invitation with correct public metadata and a new record exists in `res_employees` (or equivalent).

### Implementation for User Story 1

- [ ] T007 [US1] Implement `inviteUser` server function using Clerk Backend SDK in `src/server/fns/invitations.ts`
- [ ] T008 [P] [US1] Create `InviteUserModal` component with role selection in `src/features/users/components/InviteUserModal.tsx`
- [ ] T009 [US1] Integrate `InviteUserModal` into the main users feature at `src/features/users/index.tsx`
- [ ] T010 [US1] Update user table in `src/features/users/components/UserTable.tsx` to display pending invitation status

**Checkpoint**: User Story 1 is fully functional. Admins can invite team members.

---

## Phase 4: User Story 2 - Invited User Completes Account (Priority: P1)

**Goal**: Guide new users through a profile completion screen after they sign up via an invitation.

**Independent Test**: Accept an invite, sign up, and verify redirection to `/complete-account`. Submit the form and verify the user record is updated in the database and metadata is set in Clerk.

### Implementation for User Story 2

- [ ] T011 [US2] Create `/complete-account` page route in `src/routes/complete-account.tsx`
- [ ] T012 [P] [US2] Create `OnboardingForm` component for profile details in `src/features/auth/components/OnboardingForm.tsx`
- [ ] T013 [US2] Implement `completeOnboarding` server function in `src/server/fns/auth.ts`
- [ ] T014 [US2] Add onboarding state check and redirection logic in `src/routes/__root.tsx`

**Checkpoint**: User Story 2 is complete. The enrollment loop is closed.

---

## Phase 5: User Story 3 - Role and Permission Management (Priority: P2)

**Goal**: Provide a UI for managing roles and their associated permissions.

**Independent Test**: Create a new role, toggle some permissions, and verify the `res_roles` and `role_permissions` tables are updated.

### Implementation for User Story 3

- [ ] T015 [US3] Add "Roles" and "Permissions" tabs to the users feature in `src/features/users/index.tsx`
- [ ] T016 [P] [US3] Create `RoleManagement` view for CRUD on roles in `src/features/users/components/RoleManagement.tsx`
- [ ] T017 [P] [US3] Create `PermissionManagement` view for mapping permissions to roles in `src/features/users/components/PermissionManagement.tsx`
- [ ] T018 [US3] Implement server functions for role/permission persistence in `src/server/fns/rbac.ts`

**Checkpoint**: User Story 3 is complete. Fine-grained RBAC configuration is possible.

---

## Phase 6: User Story 4 - Assigning Roles to Users (Priority: P2)

**Goal**: Allow administrators to change roles for existing users.

**Independent Test**: Change a user's role in the UI and verify their `res_employee_roles` record updates and the change is reflected in Clerk `publicMetadata`.

### Implementation for User Story 4

- [ ] T019 [US4] Implement `updateUserRoles` server function in `src/server/fns/rbac.ts`
- [ ] T020 [US4] Add role editing dropdown/modal to the user list in `src/features/users/components/UserTable.tsx`
- [ ] T021 [US4] Implement Clerk metadata synchronization logic in the backend for role updates

**Checkpoint**: User Story 4 is complete. Ongoing team management is functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T022 [P] Add loading skeletons to user management screens for improved UX
- [ ] T023 Implement global success/error toast notifications for all RBAC actions
- [ ] T024 Perform security audit on all server functions to ensure `requireAuth` is correctly applied
- [ ] T025 Update `README.md` with instructions for RBAC setup and permissions seeding

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion.
- **User Stories (Phase 3+)**: All depend on Phase 2 completion.
  - US1 and US2 are P1 and should be prioritized.
  - US3 and US4 are P2 and can proceed once P1 is stable.

### Parallel Opportunities

- T003 (Auth helper) can run in parallel with T002 (Clerk Init).
- Once Foundational is done, P1 and P2 tasks can be worked on in parallel across different files.
- UI components (P tasks) can be built simultaneously with backend functions.

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Setup and Foundational phases.
2. Implement **User Story 1** (Invitations).
3. Implement **User Story 2** (Onboarding).
4. **VALIDATE**: New users can be invited and can join the system.

### Incremental Delivery

1. Foundation ready.
2. Invite & Onboard loop (MVP).
3. Roles & Permissions Management UI.
4. User Role Mapping.

---

## Notes
- All tasks are mapped to their respective user stories [US1-US4].
- Each user story phase results in a testable outcome.
- Ensure `CLERK_SECRET_KEY` is present in the environment for all server-side tasks.
