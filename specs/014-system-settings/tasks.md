# Tasks: Global System Settings

**Input**: Design documents from `/specs/014-system-settings/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create feature directory structure at `src/features/settings/`
- [ ] T002 Update `prisma/schema.prisma` with `app_settings` model

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for data flows and state management

- [ ] T003 [P] Define Zod schemas and TypeScript types in `src/features/settings/data/schema.ts`
- [ ] T004 Define Prisma server actions for CRUD in `src/features/settings/data/actions.ts`
- [ ] T005 [P] Create TanStack Query hooks (useSettings, useUpdateSetting) in `src/features/settings/data/queries.ts`
- [ ] T006 [P] Implement Zustand store for global reactive state in `src/features/settings/data/store.ts`
- [ ] T007 Create `SettingsProvider` and export from `src/components/providers/settings-provider.tsx`

**Checkpoint**: Foundation ready - data flows and global state are established.

---

## Phase 3: User Story 1 - Brand Management (Priority: P1) 🎯 MVP

**Goal**: Enable admins to manage business identity (Name, Logo, Favicon).

**Independent Test**: Update "Site Name" in settings and verify it changes in the browser tab and navbar.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Create basic UI settings components (SettingField, ImageUpload) in `src/features/settings/components/`
- [ ] T009 [US1] Implement `BrandingSection` block in `src/features/settings/blocks/branding-section.tsx`
- [ ] T010 [US1] Assemble `SettingsPage` shell in `src/features/settings/pages/settings-page.tsx`
- [ ] T011 [US1] Register `/admin/settings` route in `src/app/routes/admin/settings.tsx`

**Checkpoint**: Brand Management is functional and accessible via the admin panel.

---

## Phase 4: User Story 2 - Localization Preferences (Priority: P2)

**Goal**: Set global currency, date format, and language.

**Independent Test**: Change currency to "EUR" and verify product prices show "€".

### Implementation for User Story 2

- [ ] T012 [P] [US2] Create Localization-specific components (CurrencySelect, DateFormatPreview) in `src/features/settings/components/`
- [ ] T013 [US2] Implement `RegionalSection` block in `src/features/settings/blocks/regional-section.tsx`
- [ ] T014 [US2] Integrate global settings with existing currency formatting utilities in `src/lib/formatters.ts`

**Checkpoint**: The application correctly reflects regional preferences based on database settings.

---

## Phase 5: User Story 3 - Global Business Rules (Priority: P3)

**Goal**: Configure default tax rates and service fees.

**Independent Test**: Update tax rate to 15% and verify subtotal calculation in a new order.

### Implementation for User Story 3

- [ ] T015 [P] [US3] Create rule-specific components in `src/features/settings/components/`
- [ ] T016 [US3] Implement `BusinessSection` block in `src/features/settings/blocks/business-section.tsx`

**Checkpoint**: Business logic is now driven by configurable system settings.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UI/UX refinements and final validation.

- [ ] T017 [P] Implement global error boundary for settings module
- [ ] T018 Add loading skeletons for settings forms
- [ ] T019 [P] Update developer documentation in `README.md`
- [ ] T020 Run `quickstart.md` validation on a fresh tenant

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup (T001, T002).
- **User Stories (Phase 3+)**: All depend on Foundational (Phase 2).
  - US1 (P1) is the MVP and should be completed first.
  - US2 and US3 can proceed in parallel once US1's page shell is ready.

### Parallel Opportunities

- T003, T005, T006 can be worked on simultaneously once structure exists.
- Component creation (T008, T012, T015) can run in parallel by different frontend developers.
- Documentation and Polish (T017-T020) can run in parallel at the end.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: Ensure branding settings propagate to the navbar and document title.

### Incremental Delivery

1. Foundation → Core data layer ready.
2. US1 → Admin identity management live.
3. US2 → Regional formatting live.
4. US3 → Dynamic business rules live.
