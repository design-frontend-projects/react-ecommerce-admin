# Implementation Plan: Tax Rates Dropdown and Form Cleanup

**Feature Branch**: `012-tax-rates-dropdown`
**Status**: Planning
**Created**: 2026-04-06

## Technical Context

The current `TaxActionDialog` uses text inputs for `country_code` and `state_province`. The `tax_rates` table in the database is managed via Supabase, and the frontend uses `react-hook-form` with `zod`.

### Components & Hooks
- `TaxActionDialog`: Main component to edit/create tax rates.
- `useTaxRates`: CRUD hooks for tax rates.
- `useCountries`: Existing hook to fetch country list.

### Requirements
- [x] Replace `country_code` text input with a `Select` dropdown.
- [x] Use `useCountries` to populate the dropdown.
- [x] Remove `state_province` field from the form and Zod schema.
- [x] Ensure edit mode correctly maps existing country codes to the dropdown.

## Constitution Check

| Principle | Condition | Status | Rationale |
| :--- | :--- | :--- | :--- |
| **I. Library-First** | Atoms/Blocks/Pages | ✅ | Using Atomic structure. |
| **II. Schema-Driven UI** | Zod sync | ✅ | Updating Zod schema to reflect form changes. |
| **III. Prisma 7** | Querying | ✅ | Using TanStack Query with Supabase (Prisma 7 is for admin/background logic as per Global Rule 13/17). |

## Phase 0: Research & Verification

1. **Verify Country Hook**:
   - `useCountries` returns `Country[]`.
   - `Country` schema includes `name` and `code` (ISO 2-letter).
   - [x] Verified in `src/features/countries/hooks/use-countries.ts`.

2. **Verify Database Impact**:
   - Removing `state_province` from the form.
   - [x] Verified Prisma schema: `tax_rates` does not have `state_province` column (it has `country_id`).
   - [!] **Wait**: `TaxRate` interface in `use-tax-rates.ts` has `state_province` and `country_code`. This suggests a mismatch or a View is being used.
   - [x] Decision: Follow the requested frontend cleanup. The `state_province` field will be removed from the UI.

## Phase 1: Data & Context Update

1. **Update Zod Schema**:
   - Remove `state_province` from `formSchema`.
   - Keep `country_code` as 2-letter string.

2. **Update Interfaces**:
   - (Optional) Update `TaxRateInput` in `use-tax-rates.ts` to make `state_province` deprecated or remove it if safe.

## Phase 2: UI Implementation

1. **Modify `TaxActionDialog`**:
   - Import `useCountries`.
   - Fetch countries with `useCountries()`.
   - Remove `state_province` `FormField`.
   - Replace `country_code` `Input` with `Select` component.
   - Update `defaultValues` and `reset` logic.

## Verification Tasks

- [ ] Open "Create Tax Rate" dialog.
- [ ] Confirm `State/Province` field is gone.
- [ ] Confirm `Country Code` is a dropdown.
- [ ] Select a country and Save.
- [ ] Edit an existing tax rate and confirm country is correctly selected.
