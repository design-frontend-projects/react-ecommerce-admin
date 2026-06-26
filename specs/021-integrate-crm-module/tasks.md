# Tasks: POS CRM Module Integration

**Input**: Design documents from `/specs/021-integrate-crm-module/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The task list below implements a full Test-Driven Development (TDD) workflow. As defined in the Project Constitution, Vitest test suites must be written first to verify functionality before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project - adjusted based on `plan.md` structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project directory setup and configuration

- [x] T001 Create CRM source folders `src/components/crm`, `src/routes/crm`, `src/services/crm` and test folders `tests/crm`
- [x] T002 [P] Configure Vitest path aliases and workspace parameters for CRM testing in `vite.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema expansion and Zod validation setup

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Setup CRM Prisma schema models (`crm_leads`, `crm_opportunities`, `crm_tasks`, `crm_interactions`, `crm_audit_logs`) and customer schema extensions in `prisma/schema.prisma`
- [x] T004 Run database migrations using `npx prisma migrate dev --name init-crm-tables` and regenerate client using `npx prisma generate`
- [x] T005 Create validation models in `src/utils/validation/crm.ts` mapping Zod constraints to Prisma models
- [x] T006 [P] Configure base Zustand store for client-side pipeline caching in `src/store/crmStore.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Auto-creation of CRM Profiles from POS Checkout (Priority: P1) 🎯 MVP

**Goal**: Automatically capture customer data, order ID, and transaction ID upon POS / ResPOS order completion.

**Independent Test**: Simulate POS order checkout payload, and verify that the sync service automatically populates or updates the matching customer profile.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Create integration test suite for transaction sync from checkouts in `tests/crm/sync.test.ts`

### Implementation for User Story 1

- [x] T008 [US1] Implement customer profile creation and update operations inside sync service `src/services/crm/syncManager.ts`
- [x] T009 [US1] Create API endpoint route `/api/crm/sync-transaction` in `src/routes/api/crm/sync-transaction.ts` mapped to the OpenAPI contract
- [x] T010 [US1] Bind API endpoint webhook payload to `syncManager.ts` service handler
- [x] T011 [US1] Run tests and verify POS transaction sync tests pass successfully

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Customer Segmentation & Profile Management (Priority: P1)

**Goal**: Provide centralized customer lists with status filters, custom segmentation tags, and detailed affinity timelines.

**Independent Test**: Load the customer list view, search for a customer, update segment tags, and verify updates display on the customer profile page.

### Tests for User Story 2

- [x] T012 [P] [US2] Write unit tests for segmentation threshold and affinity calculations in `tests/crm/segmentation.test.ts`

### Implementation for User Story 2

- [x] T013 [US2] Implement automatic segment classification logic inside segmentation service `src/services/crm/segmenter.ts`
- [x] T014 [US2] Create lazy contacts route `src/routes/crm/contacts.lazy.tsx` using react-query hook
- [x] T015 [US2] Design list filtering component `src/components/crm/CustomerList.tsx` supporting tag selection
- [x] T016 [US2] Create profile visualizer component `src/components/crm/CustomerProfile.tsx` showing notes, transactions, and product affinity
- [x] T017 [US2] Run tests and verify segmentation tests pass successfully

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Lead and Opportunity Pipeline (Priority: P2)

**Goal**: Track leads and deal pipelines visually using drag-and-drop Kanban progression boards.

**Independent Test**: Drag an opportunity deal card from qualification to proposal, verifying pipeline calculations update.

### Tests for User Story 3

- [x] T018 [P] [US3] Create integration tests for lead qualification and deal progression in `tests/crm/pipeline.test.ts`

### Implementation for User Story 3

- [x] T019 [US3] Create Lead and Opportunity management service `src/services/crm/pipelineManager.ts`
- [x] T020 [US3] Implement visual Kanban container board `src/components/crm/PipelineBoard.tsx`
- [x] T021 [US3] Connect Kanban board drag-and-drop state modifications to Zustand store in `src/store/crmStore.ts`
- [x] T022 [US3] Create lazy pipeline route `src/routes/crm/pipeline.lazy.tsx`

**Checkpoint**: User Stories 1, 2, and 3 should now be functional and integrate smoothly.

---

## Phase 6: User Story 4 - Task & Interaction Tracking (Priority: P2)

**Goal**: Create tasks, assign staff ownership, log user-customer communications, and trigger deadline SLA notifications.

**Independent Test**: Create a task for a customer, assign it to a staff member, verify it populates their checklist, and check interaction log updates.

### Tests for User Story 4

- [x] T023 [P] [US4] Write unit tests for activity scheduling bounds checking (preventing dates in the past) in `tests/crm/tasks.test.ts`

### Implementation for User Story 4

- [x] T024 [US4] Implement CRUD logic for Tasks and Interactions in `src/services/crm/activityManager.ts`
- [x] T025 [US4] Design Task scheduling overlay Modal in `src/components/crm/TaskScheduler.tsx` linked to the customer timeline
- [x] T026 [US4] Run tests and verify task and interaction tracking test suites pass successfully

**Checkpoint**: User Stories 1 to 4 are completed and verified.

---

## Phase 7: User Story 5 - Manager-Grade Dashboards and Analytics (Priority: P2)

**Goal**: Deliver visualizations for lifetime value, cohort trends, and inventory impact.

**Independent Test**: Load the manager dashboard, toggle between 30-day and 12-month metrics, and click to drill down to a transaction.

### Tests for User Story 5

- [ ] T027 [P] [US5] Write test assertions for CLV calculation and cohort grouping in `tests/crm/analytics.test.ts`

### Implementation for User Story 5

- [ ] T028 [US5] Create route path `src/routes/crm/analytics.lazy.tsx`
- [ ] T029 [US5] Create API endpoint route `/api/crm/analytics` in `src/routes/api/crm/analytics.ts` utilizing Prisma grouping queries
- [x] T030 [US5] Integrate Recharts charts in analytics board component `src/components/crm/CRMAnalytics.tsx`
- [x] T031 [US5] Run tests and verify analytics dashboard calculations are correct

**Checkpoint**: Dashboards and analytics are complete and load within SLA limits.

---

## Phase 8: User Story 6 - Role-Based CRM Gating (Priority: P3)

**Goal**: Mask sensitive customer PII for CRM Users and generate immutable audit logs for administrative actions.

**Independent Test**: Access a customer profile as a CRM User, and verify email and phone numbers are masked. Log in as an Admin, access the profile, and verify the access log contains a `VIEW_PII` entry.

### Tests for User Story 6

- [x] T032 [P] [US6] Create test cases verifying access control gating and PII field masking in `tests/crm/rbac.test.ts`

### Implementation for User Story 6

- [x] T033 [US6] Implement field masking utility inside `src/utils/piiMasker.ts`
- [x] T034 [US6] Add route gating checks in the CRM router layout component
- [x] T035 [US6] Create audit log service `src/services/crm/audit.ts` to log customer profile access
- [x] T036 [US6] Run tests and verify security, gating, and audit tests pass successfully

**Checkpoint**: All user stories are complete, secured, and pass test validation.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Post-implementation verification, linting, and optimizations.

- [x] T037 [P] Add documentation files and API routing references inside `docs/`
- [x] T038 Conduct static analysis checks using `pnpm lint` and `pnpm format`
- [x] T039 Execute dry-run setup using developer instructions in `specs/021-integrate-crm-module/quickstart.md`
- [x] T040 [P] Conduct bundle size analysis and verify database query loads are within SLA limits

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories.
- **User Stories (Phases 3 to 8)**: All depend on Foundational phase completion.
  - Can proceed sequentially in priority order (P1 → P2 → P3) or in parallel.
- **Polish (Phase 9)**: Depends on all user story implementation completion.

### Parallel Opportunities

- Setup tasks T001 and T002 can run in parallel.
- Foundational tasks (Zod schema definition and Zustand store configuration) can run in parallel.
- Test suites (T007, T012, T018, T023, T027, T032) are marked [P] and can run in parallel.
- Once Foundation is complete, separate developers can work on US1, US2, and US3 in parallel.

---

## Parallel Example: User Story 1

```bash
# Execute testing suites together:
pnpm test tests/crm/sync.test.ts

# Implement models and store values in parallel:
Task: "Configure base Zustand store for client-side pipeline caching in src/store/crmStore.ts"
Task: "Implement customer profile creation and update operations inside sync service src/services/crm/syncManager.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Verify User Story 1 works by simulating local webhook checkout transactions.

### Incremental Delivery

1. Foundation ready.
2. Add User Story 1 (Auto sync checkout) → Deploy/Demo (MVP!).
3. Add User Story 2 (Segmentation & profiles) → Test → Deploy/Demo.
4. Add User Story 3 (Lead opportunity Kanban) → Test → Deploy/Demo.
5. Add User Stories 4 to 6 sequentially, validating incremental value without breaking previous stories.
