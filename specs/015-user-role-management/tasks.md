# Tasks: User Role Management & RBAC

**Input**: Design documents from `/specs/015-user-role-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: External service configuration and core database schema

- [ ] T001 Initialize feature structure at `src/features/users/` (components, blocks, pages, data)
- [ ] T002 [P] Update `prisma/schema.prisma` with `roles` and `user_roles` models per data-model.md
- [ ] T003 Configure Clerk Backend SDK wrapper in `src/lib/clerk-service.ts`
- [ ] T004 [P] Setup Supabase Client with Realtime support in `src/lib/supabase-service.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Security logic and state management for RBAC

- [ ] T005 [P] Define Zod schemas and types for roles/permissions in `src/features/users/data/schema.ts`
- [ ] T006 Implement permission lookup and calculation logic in `src/features/users/data/rbac.ts`
- [ ] T007 [P] Create Zustand store for caching active user permissions in `src/features/users/data/store.ts`
- [ ] T008 [P] Implement TanStack Query hooks for fetching user roles in `src/features/users/data/queries.ts`

**Checkpoint**: Foundation ready - permission checking logic is available throughout the app.

---

## Phase 3: User Story 1 - Admin User Invitation (Priority: P1) 🎯 MVP

**Goal**: Enable admins to invite colleagues to their tenant via email.

**Independent Test**: Send an invite and verify a "Pending" user appears in the admin list.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Create `InviteForm` dialog block in `src/features/users/blocks/invite-form.tsx`
- [ ] T010 [US1] Implement `inviteUser` server action using Clerk SDK in `src/features/users/data/actions.ts`
- [ ] T011 [US1] Create `UserList` table block with role and status indicators in `src/features/users/blocks/user-list.tsx`
- [ ] T012 [US1] Assemble `UserManagementPage` in `src/features/users/pages/user-management-page.tsx`
- [ ] T013 [US1] Register `/admin/users` route in `src/app/routes/admin/users.tsx`

**Checkpoint**: Basic user invitation and management is functional.

---

## Phase 4: User Story 2 - Granular Access Control (Priority: P2)

**Goal**: Enforce permissions across UI and API.

**Independent Test**: Log in as "Staff" and confirm "Admin Settings" buttons are hidden or disabled.

### Implementation for User Story 2

- [ ] T014 [P] [US2] Create helper UI components (e.g., `Can` wrapper) in `src/features/users/components/rbac-guard.tsx`
- [ ] T015 [US2] Implement `PermissionEditor` block for modifying role permissions in `src/features/users/blocks/permission-editor.tsx`
- [ ] T016 [US2] Guard protected admin routes using the `useRBAC` hook

**Checkpoint**: Access control is enforced across the dashboard.

---

## Phase 5: User Story 3 - Instant Permission Sync (Priority: P3)

**Goal**: Propagate role changes to active users in real-time.

**Independent Test**: Change a user's role and verify they lose/gain access instantly in their browser session.

### Implementation for User Story 3

- [ ] T017 [US3] Implement Supabase Realtime subscription to `user_roles` table in `src/features/users/data/queries.ts`
- [ ] T018 [US3] Add a visual role-update notification in `src/features/users/components/role-sync-toast.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Security audits and UI polish.

- [ ] T019 [P] Perform a security audit of all server actions for session verification
- [ ] T020 Run `quickstart.md` validation for role management setup
- [ ] T021 [P] Ensure all user management forms have loading and error states

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Blocks all tasks.
- **Foundational (Phase 2)**: Depends on T001, T002.
- **User Story 1 (P1)**: Depends on Phase 2 completion.
- **User Story 3 (P3)**: Depends on US2 components being integrated.

### Parallel Opportunities

- T003 and T004 (service setup) can run in parallel.
- All foundational data tasks (T005-T008) can run in parallel once directory is ready.
- Feature UI (InviteForm, UserList) can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational layers.
2. Build User Management Page + Invitation flow.
3. Validate through a manual invitation acceptance.

### Incremental Delivery

1. Foundation → Permission logic ready.
2. US1 → Team member invitations live.
3. US2 → Permission-based UI filtering live.
4. US3 → Real-time security updates live.
