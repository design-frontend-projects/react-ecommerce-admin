# Research Findings: Tax Rates Form Update

## Decision: Country DataSource
**Chosen**: `useCountries` hook.
**Rationale**: It already provides a filtered list of all countries in the system from the backend.
**Alternatives considered**: Static country list (hardcoded), but `useCountries` is dynamic and consistent with other modules.

## Decision: Dropdown Component
**Chosen**: `shadcn/ui` `Select` for now.
**Rationale**: Standard UI component for simple dropdowns.
**Alternatives considered**: `Combobox` (was considered for large lists, but countries list is manageable).

## Decision: Remove `state_province`
**Chosen**: Complete removal from UI.
**Rationale**: Business requirement states it's an unused field and specifically requested its removal.
**Alternatives considered**: Hiding it, but explicit removal is cleaner.
