# Quickstart: Tax Rates Form Update

## Getting Started

1.  **Switch Branch**: Ensure you are on `012-tax-rates-dropdown`.
2.  **Run Dev**: `pnpm dev`.
3.  **Navigate**: Go to Settings > Tax Rates.
4.  **Test Create**: Click "Add Tax Rate" and select a country from the dropdown.
5.  **Test Edit**: Edit an existing tax rate and confirm the country is correctly pre-selected.

## Code Path
- **Components**: `src/features/tax-rates/components/tax-rate-action-dialog.tsx`
- **Hooks**: `src/features/countries/hooks/use-countries.ts`
- **Schema**: `src/features/tax-rates/hooks/use-tax-rates.ts` (Zod/Interfaces)
