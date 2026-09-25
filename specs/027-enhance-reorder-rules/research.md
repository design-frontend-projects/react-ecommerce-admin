# Phase 0 Research: Reorder Rules UI/UX Enhancement, Virtualized SKU Selector & Server-Side Pagination

**Feature Branch**: `027-enhance-reorder-rules`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/spec.md)

---

## 1. Architectural Decisions

### Decision 1: Server-Side Pagination & Filter Pushdown for Reorder Rules
- **Context**: Currently, `listRules` fetches all reorder rules for a tenant in memory, and the frontend applies client-side TanStack Table pagination.
- **Decision**: Update the backend route `/api/inventory/reorder-rules` and server function `listRules` in `src/server/fns/reorder-rules.ts` to execute server-side filtering, searching, sorting, and pagination via Prisma 7 `findMany` and `count` in a `prisma.$transaction`.
- **Query Parameters**:
  - `page`: 1-based page index (default 1)
  - `pageSize`: items per page (10, 20, 50, 100, default 20)
  - `search`: string matching variant SKU, variant barcode, parent product name, or store name case-insensitively
  - `storeId`: optional UUID filter for specific store location
  - `isActive`: optional boolean filter for active/inactive rules
  - `sortBy`: sort field (`created_at`, `reorder_point`, `safety_stock`, `min_qty`, `max_qty`, `lead_time_days`)
  - `sortOrder`: `asc` | `desc` (default `desc`)
- **Rationale**: Keeps database query execution fast and payload sizes small (~5-15 KB per page), scaling easily past 50,000 rules without browser performance degradation.
- **Alternatives Considered**: Client-side pagination (fails at scale, wastes network bandwidth); Cursor-based pagination (more complex with arbitrary sorting and jump-to-page controls).

---

### Decision 2: Product Variant Virtualized Combobox with `@tanstack/react-virtual`
- **Context**: In `rule-form-dialog.tsx`, product variants were previously rendered using a non-virtualized Radix UI `<Select>` with an unpaginated lookup, causing browser freezes when catalogs grow into thousands of variants.
- **Decision**: Build a dedicated `ReorderRuleVariantPicker` component using `@tanstack/react-virtual`'s `useVirtualizer`.
  - Integrates with debounced (300ms) server search via `searchProductVariants` (`/api/inventory/product-variants`).
  - Supports paginated / slice fetching (`limit = 30` or `50`).
  - Renders only visible rows inside a fixed height scroll container (`max-h-[300px]`, item height ~56px).
  - Dynamically calculates container offsets and translate transforms.
  - Automatically preserves and highlights currently selected variant even if the initial search query doesn't match it.
- **Rationale**: Delivers smooth 60fps scrolling, minimal DOM footprint (only ~6-8 rendered DOM nodes regardless of result size), instant modal open times (<100ms), and zero catalog dump overhead.
- **Alternatives Considered**:
  - Native `<select>`: cannot be styled properly, freezes on >1,000 options.
  - Un-virtualized Radix `CommandList`: creates heavy DOM trees for hundreds of items leading to dropped frames during typing and scrolling.

---

### Decision 3: Table Virtualization with Server-Side Pagination
- **Context**: The user explicitly requested `@tanstack/react-virtual` with pagination and server-side search and pagination.
- **Decision**:
  - The Reorder Rules table utilizes TanStack Table (`useReactTable`) with `manualPagination: true`, `manualSorting: true`, and `manualFiltering: true`.
  - The table body utilizes `@tanstack/react-virtual` (`useVirtualizer`) for row virtualization over the active page's row slice.
  - This ensures that even when users select high density page sizes (50 or 100 rows per page), the DOM only renders the visible ~15-20 rows inside the scroll area, maximizing scroll fluidity and preventing UI stutter on low-power devices.
  - Standard pagination controls (`DataTablePagination`) remain at the bottom, synchronizing page changes with server fetches.
- **Rationale**: Combines the predictability and accessibility of page-based navigation with the high-performance memory characteristics of DOM virtualization.

---

### Decision 4: Bilingual Localization (i18n) & RTL Architecture
- **Context**: Translation keys for `reorderRules` were completely missing in `src/assets/i18n/en.json` and `src/assets/i18n/ar.json`, causing static fallback strings to be displayed.
- **Decision**:
  - Add comprehensive `reorderRules` namespace dictionaries to both `en.json` and `ar.json`.
  - Replace any remaining hardcoded strings in `index.tsx`, `components/table.tsx`, `components/columns.tsx`, `components/rule-form-dialog.tsx`, `components/dialogs.tsx`, `components/primary-buttons.tsx`, and `components/row-actions.tsx` with `t('reorderRules....')` calls.
  - Apply RTL-friendly logical Tailwind utility classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) throughout all reorder rules components.
- **Rationale**: Guarantees complete language parity between English and Arabic, zero untranslated UI artifacts, and proper directional alignment.

---

### Decision 5: Replenishment KPI Metrics Banner
- **Context**: The reorder rules screen lacked high-level replenishment health indicators.
- **Decision**:
  - Return aggregated metric counts in the list response:
    - `totalRules`: total count of reorder rules
    - `activeRules`: count of enabled rules
    - `inactiveRules`: count of disabled rules
    - `totalStores`: distinct count of configured stores
  - Render an executive metrics card banner above the table with icons (`ShieldAlert`, `CheckCircle2`, `Building2`, `Boxes`), gradient accents, and quick-filter click handlers.
- **Rationale**: Immediate operational clarity for inventory managers without navigating away from the rules ledger.

---

## 2. Dependencies & Ecosystem Verification

- `@tanstack/react-virtual`: `^3.13.20` installed in `package.json`.
- `@tanstack/react-table`: `^8.21.3` installed in `package.json`.
- `@tanstack/react-query`: `^5.69.0` installed in `package.json`.
- `react-i18next`: `^15.7.4` installed in `package.json`.
- `lucide-react`: `^1.16.0` installed in `package.json`.
- `prisma`: `^7.0.1` installed in `package.json`.
