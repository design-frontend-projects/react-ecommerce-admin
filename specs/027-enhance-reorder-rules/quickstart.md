# Developer Quickstart: Reorder Rules UI/UX Enhancement & Pagination

**Feature Branch**: `027-enhance-reorder-rules`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/spec.md)

---

## 1. Overview of Key Changes

1. **Backend Service (`src/server/fns/reorder-rules.ts`)**:
   - Upgraded `listRules` to accept `{ page, pageSize, search, storeId, isActive, sortBy, sortOrder }`.
   - Executes parallel `findMany` and `count` using Prisma 7 with filter pushdown.
   - Computes KPI metrics (`totalRules`, `activeRules`, `inactiveRules`, `totalStores`).

2. **API Route (`src/routes/api/inventory/reorder-rules.ts`)**:
   - Parses search parameters and passes typed options to `listRules`.

3. **Frontend Data & Hooks (`src/features/reorder-rules/data/` & `hooks/`)**:
   - Updated Zod schemas in `schema.ts` to include pagination envelope and query params.
   - Enhanced `fetchRules` in `actions.ts` to forward query parameters to the API.
   - Enhanced `useReorderRules` hook with `page`, `pageSize`, `search`, `storeId`, `isActive`, `sortBy`, `sortOrder`.

4. **Component Enhancements (`src/features/reorder-rules/components/`)**:
   - **`table.tsx`**: Migrated to server-side TanStack Table with `@tanstack/react-virtual` row virtualization, server sorting, search debouncing, and store/status filter controls.
   - **`reorder-rules-metrics.tsx`**: New KPI cards banner showing replenishment coverage.
   - **`variant-picker.tsx`**: High-performance virtualized variant picker with `@tanstack/react-virtual` and debounced server lookup.
   - **`rule-form-dialog.tsx`**: Integrated virtualized picker, enhanced validation feedback, and clean dialog layout.
   - **`columns.tsx`**: Sortable headers, condition badges, and full i18n support.

5. **Internationalization (`src/assets/i18n/en.json` & `ar.json`)**:
   - Added complete `reorderRules` translation key dictionaries for English and Arabic.

---

## 2. Verification Steps

1. **Run Dev Server**:
   ```bash
   pnpm run dev
   ```

2. **Navigate to Reorder Rules Page**:
   - Visit: `http://localhost:5173/reorder-rules`
   - Verify KPI cards render (Total Rules, Active Rules, Inactive Rules, Stores).
   - Test table search bar with debounced input.
   - Test store dropdown filter and active/inactive status filter.
   - Change page sizes (10, 20, 50, 100) and verify pagination indicators.

3. **Test Variant Picker in New/Edit Rule Dialog**:
   - Click "New Reorder Rule".
   - Open Product Variant selector and type search terms (SKU, name, barcode).
   - Scroll through virtualized results smoothly.
   - Select variant and verify values populate.
   - Submit form and verify toast notification and table refresh.

4. **Test Language Switching (i18n & RTL)**:
   - Toggle language to Arabic using the language switcher in the header.
   - Verify all texts, table headers, KPI labels, and dialog controls are translated.
   - Verify proper right-to-left layout alignment.

5. **Run Lint and Tests**:
   ```bash
   pnpm test
   ```
