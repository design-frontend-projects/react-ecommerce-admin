# Implementation Plan: Stock Balance Server-Side Lazy Pagination & Dynamic SKU Search

**Branch**: `026-stock-balance-paging` | **Date**: 2026-09-25 | **Spec**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/026-stock-balance-paging/spec.md)  
**Input**: Feature specification from `specs/026-stock-balance-paging/spec.md`

## Summary

Enhance the Stock Balances module (`src/features/stock-balances`) with high-performance server-side lazy pagination, database-level filter pushdown (facility types and stock health alerts), accurate total count calculation, and multi-field search. Simultaneously transform the Stock Adjustment modal by replacing upfront full-catalog product loading with an asynchronous, debounced (300ms) server-side variant SKU search combobox and targeted single-variant facility on-hand balance lookups.

---

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+  
**Primary Dependencies**: React 18, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-table`, Tailwind CSS, Radix UI (shadcn/ui), Zod, Lucide React, `react-i18next`, `react-hook-form`  
**Storage**: PostgreSQL via Prisma 7 (server queries) and Supabase client fallback with tenant isolation  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Modern responsive web browsers (Desktop, Tablet, Mobile)  
**Project Type**: Fullstack Web Application (TanStack Start / Vite powered)  
**Performance Goals**: Initial ledger load < 1.2s, API slice response < 300ms p95, SKU search debounce 300ms with response < 400ms, modal opening < 100ms, client memory reduction > 70%  
**Constraints**: Multi-tenant database isolation (`tenant_id`), RBAC permission gating (`inventory.stock.view`, `inventory.stock.manage`), full bilingual localization (EN/AR with RTL layout)  
**Scale/Scope**: Supports catalogs exceeding 50,000 product variants and 100,000 stock balance records without browser degradation  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post Phase 1 design.*

| Principle / Rule | Compliance Status | Analysis & Verification |
|---|---|---|
| **Package Manager: pnpm** | Pass | All libraries managed exclusively through `pnpm`. |
| **Testing: Vitest** | Pass | Unit and integration tests written using Vitest. |
| **UI: shadcn/ui & Tailwind** | Pass | Components built with shadcn/ui primitives (`Table`, `Dialog`, `Popover`, `Command`, `Button`, `Badge`, `Skeleton`). |
| **State: Zustand & URL State** | Pass | Auth state in Zustand; active page index and filter parameters synchronized via URL search or hook state. |
| **API: TanStack Query** | Pass | Server state fetched and cached via `useQuery` with structured cache tags and debounced queries. |
| **Tables: TanStack Table** | Pass | Manual server-side pagination (`manualPagination: true`), server sorting, and responsive column rendering. |
| **Validation: Zod** | Pass | Strict Zod validation on API inputs, response envelopes, and adjustment forms. |
| **Icons: Lucide React** | Pass | Strictly using `lucide-react` icons. |
| **Database: Prisma 7** | Pass | Prisma 7 used for multi-tenant queries, parallel count queries, and aggregate metrics. |
| **Multi-Tenancy & Security** | Pass | Every query scoped strictly by `tenant_id` via `requireTenantId` and verified with `withAuth`. |

---

## Project Structure

### Documentation (this feature)

```text
specs/026-stock-balance-paging/
├── plan.md              # This implementation plan
├── research.md          # Phase 0 research & architectural decisions
├── data-model.md        # Phase 1 data schema, entities, and validation rules
├── quickstart.md        # Phase 1 verification and developer quickstart guide
├── contracts/           # Phase 1 API and component contract definitions
│   ├── stock-balances-api.md # API endpoint query, pagination, and response contract
│   └── variant-search-api.md # Variant search and single on-hand lookup contract
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Layout

```text
src/
├── features/stock-balances/
│   ├── components/
│   │   ├── stock-balances-table.tsx         # TanStack Table with server-side pagination, sorting, skeletons
│   │   ├── stock-balances-columns.tsx       # Column definitions with condition badges and balance formatting
│   │   ├── stock-balances-metrics.tsx       # Summary KPI cards (total on-hand, valuation, alert counts)
│   │   ├── adjustment-dialog.tsx            # Stock Adjustment modal with lazy variant combobox
│   │   ├── variant-sku-picker.tsx           # Debounced server-side SKU search combobox component
│   │   └── stock-balances-dialogs.tsx       # Dialog container coordinating adjustment and movement drawer
│   ├── data/
│   │   ├── actions.ts                       # Server fetchers for paginated balances and variant search with Supabase fallbacks
│   │   ├── schema.ts                        # Zod schemas for filters, rows, pagination envelope, and metrics
│   │   └── adjustment-schema.ts             # Zod validation schema for stock adjustments
│   ├── hooks/
│   │   └── use-stock-balances.ts            # TanStack Query hook with page, pageSize, search, and facility filters
│   └── index.tsx                            # Main page entry point coordinating tabs, metrics, table, and dialogs
├── routes/
│   └── api/
│       └── inventory/
│           ├── stock-balances.ts            # API route handler parsing pagination query parameters
│           └── product-variants.ts          # API route handler for debounced variant SKU search
├── server/
│   └── fns/
│       ├── stock-balances.ts                # Prisma 7 service calculating paginated stock balances and aggregates
│       └── product-variants.ts              # Prisma 7 service querying matching product variants
└── hooks/
    └── use-inventory-lookups.ts             # Enhanced with debounced useVariantSearch and targeted useVariantFacilityOnHand
```

---

## Implementation Approach & Key Changes

### 1. Server-Side Stock Balances Pagination (`src/server/fns/stock-balances.ts` & `src/routes/api/inventory/stock-balances.ts`)
- Parse `page`, `pageSize`, `search`, `facilityType`, `stockStatus`, `warehouseId`, `storeId`, `sortBy`, `sortOrder`.
- Push facility conditions (`warehouse_id: { not: null }` vs `store_id: { not: null }`) and stock status (`lte: 0` vs `lte: 10`) into Prisma `where`.
- Execute `Promise.all([findMany, count, aggregate])` to return `items`, `total`, `page`, `pageSize`, `totalPages`, and accurate `metrics`.

### 2. Product Variant Search Server Endpoint (`src/server/fns/product-variants.ts` & `src/routes/api/inventory/product-variants.ts`)
- Accept `search` and `limit` (default 25).
- Search `product_variants` matching `sku`, `barcode`, or `products.name` with `mode: 'insensitive'`.
- Return `{ success: true, items: [...] }`.

### 3. Client Action & Hook Enhancements (`src/features/stock-balances/data/actions.ts` & `hooks/use-stock-balances.ts`)
- Update `fetchStockBalances` to send `page`, `pageSize`, `search`, `facilityType`, `stockStatus`.
- Update Supabase fallback to apply `.range(skip, skip + pageSize - 1)` with `{ count: 'exact' }`.
- Export `searchProductVariants(getToken, query, limit)` with fallback.
- Export `fetchVariantFacilityOnHand(getToken, variantId, facility)` for targeted balance lookup.

### 4. Table Server-Side Integration (`src/features/stock-balances/components/stock-balances-table.tsx` & `index.tsx`)
- Lift or bind pagination state (`pageIndex`, `pageSize`, `search`, `sorting`) into `useStockBalances`.
- Switch `useReactTable` to `manualPagination: true`, `manualSorting: true`, `manualFiltering: true`, `pageCount: totalPages`.
- Render `DataTablePagination` with accurate total row indicators and page navigation.
- Render skeleton rows during page transitions.

### 5. Asynchronous SKU Combobox (`src/features/stock-balances/components/variant-sku-picker.tsx` & `adjustment-dialog.tsx`)
- Create `VariantSkuPicker` using shadcn `Popover` and `Command` (or custom debounced combobox).
- Debounce query 300ms.
- Fast-path: When `currentRow` is provided, display its existing variant immediately without search.
- When variant and facility are selected, fetch targeted on-hand balance via `useVariantFacilityOnHand`.

---

## Complexity Tracking

No constitution violations detected. Implementation strictly aligns with established repo patterns (TanStack Table, TanStack Query, Prisma 7, shadcn/ui, Zod).
