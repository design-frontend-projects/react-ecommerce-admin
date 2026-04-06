# Tasks: Tax Rates Dropdown and Form Cleanup

**Feature**: Tax Rates Enhancement
**Branch**: `012-tax-rates-dropdown`

## Phase 1: Setup

- [ ] T001 Verify existing setup and ensure dev server is running with `pnpm dev` in repo root.

## Phase 2: Foundational (Type & Schema Updates)

- [ ] T002 [P] Update `TaxRate` and `TaxRateInput` interfaces to remove `state_province` in `src/features/tax-rates/hooks/use-tax-rates.ts`
- [ ] T003 [P] Update `formSchema` and `TaxFormValues` to remove `state_province` in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`

## Phase 3: [US2] Remove State/Province Field

**Goal**: Clean up the UI and form state by removing the unused field.
**Independent Test Criteria**: The "State/Province" field should no longer appear in the dialog or be sent in the mutation payload.

- [ ] T004 [US2] Remove `state_province` from `defaultValues` and `form.reset` logic in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`
- [ ] T005 [US2] Remove `state_province` `FormField` and UI input component in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`

## Phase 4: [US1] Tax Rate Country Dropdown

**Goal**: Replace manual country code entry with a searchable dropdown.
**Independent Test Criteria**: User can select a country from a list; the corresponding ISO code is saved correctly.

- [ ] T006 [US1] Import `useCountries` hook and fetch country data in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`
- [ ] T007 [US1] Replace `country_code` text input with `Select` component from `shadcn/ui` in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`
- [ ] T008 [US1] Map fetched country data to `Select` options (label: name, value: code) in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`

## Phase 5: Polish & Verification

- [ ] T009 [P] Verify that existing tax rates correctly display their country in the edit dialog in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`
- [ ] T010 [P] Add loading and empty states for the country dropdown in `src/features/tax-rates/components/tax-rate-action-dialog.tsx`

## Dependency Graph

- US1 depends on Foundation (T002, T003)
- US2 depends on Foundation (T002, T003)
- US1 and US2 can be worked on in parallel once types are updated.

## Parallel Execution Examples

- `Developer A`: Working on [US1] (T006-T008)
- `Developer B`: Working on [US2] (T004-T005)

## Implementation Strategy

1. **MVP**: Implement T002-T005 to clean up the form first.
2. **Feature**: Then implement the dropdown (T006-T008).
3. **Robustness**: Final polish and verification (T009-T010).
