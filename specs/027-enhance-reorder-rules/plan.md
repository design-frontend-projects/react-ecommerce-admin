# Implementation Plan: Reorder Rules UI/UX Enhancement, Virtualized SKU Selector & Server-Side Pagination

**Branch**: `027-enhance-reorder-rules` | **Date**: 2026-09-25 | **Spec**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/spec.md)  
**Input**: Feature specification from `specs/027-enhance-reorder-rules/spec.md`

## Summary

Enhance the Reorder Rules module (`src/features/reorder-rules`) with modern, high-performance capabilities:
1. **Server-Side Pagination & Search**: Update the backend route `/api/inventory/reorder-rules` and Prisma 7 service `listRules` to support server-side pagination (10, 20, 50, 100), multi-field search (SKU, product title, store name), store and status filtering, sorting, and aggregate KPI calculation.
2. **Virtualized Variant Selector (`@tanstack/react-virtual`)**: Replace the unpaginated, non-virtualized Radix Select in `rule-form-dialog.tsx` with a high-performance combobox using `@tanstack/react-virtual` for 60fps scrolling, debounced (300ms) server-side variant queries, and initial variant preservation.
3. **Table Virtualization & UI/UX Polish**: Enhance `ReorderRulesTable` with `@tanstack/react-virtual` row virtualization, server-side TanStack Table integration, non-blocking skeleton loaders, and a replenishment KPI metrics overview banner.
4. **Complete Localization (i18n & RTL)**: Extract and translate 100% of static text into `react-i18next` dictionaries across English (`en.json`) and Arabic (`ar.json`), with bidirectional layout support.

---

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+  
**Primary Dependencies**: React 18, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/react-virtual`, Tailwind CSS, Radix UI (shadcn/ui), Zod, Lucide React, `react-i18next`  
**Storage**: PostgreSQL via Prisma 7 with tenant isolation (`tenant_id`)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Modern responsive web browsers (Desktop, Tablet, Mobile)  
**Project Type**: Fullstack Web Application (TanStack Start / Vite)  
**Performance Goals**: Initial ledger load < 1.2s, API page slice response < 300ms p95, variant search debounce 300ms with response < 400ms, modal open time < 100ms, smooth 60fps scrolling with zero DOM bloat  
**Constraints**: Multi-tenant database isolation (`tenant_id`), RBAC permission gating (`inventory.view`, `inventory.manage`), full bilingual localization (EN/AR with RTL layout support)  
**Scale/Scope**: Scales gracefully to catalogs exceeding 50,000 product variants and 20,000 configured reorder rules without browser slowdown  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post Phase 1 design.*

| Principle / Rule | Compliance Status | Analysis & Verification |
|---|---|---|
| **Package Manager: pnpm** | Pass | All packages managed via `pnpm`. |
| **Testing: Vitest** | Pass | Unit, contract, and component tests run via Vitest. |
| **UI: shadcn/ui & Tailwind** | Pass | UI built with Tailwind CSS and Radix UI / shadcn/ui primitives. |
| **State: Zustand & TanStack Query** | Pass | Server state managed via TanStack Query (`useQuery`, `useMutation`), URL/filter state synchronized. |
| **API: TanStack Query & REST** | Pass | REST API endpoint `/api/inventory/reorder-rules` with structured envelope and TanStack Query caching. |
| **Virtualization: `@tanstack/react-virtual`** | Pass | Virtualized list rendering for variant selection and table rows for high performance. |
| **Tables: TanStack Table** | Pass | Manual server-side pagination (`manualPagination: true`), server sorting, and responsive column rendering. |
| **Validation: Zod** | Pass | Strict Zod validation on API inputs, query params, response envelope, and form data. |
| **Icons: Lucide React** | Pass | Icons exclusively sourced from `lucide-react`. |
| **Database: Prisma 7** | Pass | Prisma 7 utilized for multi-tenant queries, count aggregations, and transactional mutations. |
| **Multi-Tenancy & Security** | Pass | Tenant isolation enforced via `requireTenantId` and RBAC verified via `withAuth`. |
| **Internationalization: i18n & RTL** | Pass | Translation keys implemented in `en.json` and `ar.json` using `react-i18next` with RTL classes. |

---

## Project Structure

### Documentation (this feature)

```text
specs/027-enhance-reorder-rules/
├── plan.md              # This implementation plan
├── research.md          # Phase 0 research & architectural decisions
├── data-model.md        # Phase 1 data schema, entities, and validation rules
├── quickstart.md        # Phase 1 verification and developer quickstart guide
├── contracts/           # Phase 1 API and component contract definitions
│   ├── reorder-rules-api.md     # Server-side pagination & filter API contract
│   └── variant-picker-contract.md # Virtualized SKU picker component contract
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Layout

```text
src/
├── features/reorder-rules/
│   ├── components/
│   │   ├── table.tsx                # Virtualized TanStack Table with server pagination & filters
│   │   ├── columns.tsx              # Column definitions with sorting and condition badges
│   │   ├── reorder-rules-metrics.tsx # KPI summary banner (Total, Active, Inactive, Stores)
│   │   ├── variant-picker.tsx       # @tanstack/react-virtual combobox with debounced server lookup
│   │   ├── rule-form-dialog.tsx     # Reorder rule create/edit modal with virtualized picker
│   │   ├── dialogs.tsx              # Dialog container orchestrating form and delete dialogs
│   │   ├── primary-buttons.tsx      # Action buttons (New Rule, Export)
│   │   ├── row-actions.tsx          # Actions dropdown (Edit, Toggle Status, Delete)
│   │   └── provider.tsx             # Context provider for dialog states
│   ├── data/
│   │   ├── actions.ts               # API fetchers forwarding query params and handling fallbacks
│   │   └── schema.ts                # Zod schemas for query params, envelopes, rows, and form inputs
│   ├── hooks/
│   │   ├── use-reorder-rules.ts     # TanStack Query hook with pagination, search, and filter options
│   │   └── use-supplier-options.ts  # Supplier lookup hook
│   └── index.tsx                    # Feature root page with metrics, filters, table, and dialogs
├── routes/
│   └── api/
│       └── inventory/
│           └── reorder-rules.ts     # API route handler parsing pagination and search parameters
├── server/
│   └── fns/
│       └── reorder-rules.ts         # Prisma 7 service calculating paginated rules and KPI metrics
└── assets/
    └── i18n/
        ├── en.json                  # English translation dictionary for reorderRules
        └── ar.json                  # Arabic translation dictionary for reorderRules
```

**Structure Decision**: Enhances the existing `src/features/reorder-rules` module, backend API route `/api/inventory/reorder-rules`, Prisma service `/server/fns/reorder-rules.ts`, and translation files `src/assets/i18n/{en,ar}.json`.

---

## Complexity Tracking

*No constitution violations. All solutions use native stack libraries (`@tanstack/react-virtual`, TanStack Table, Prisma 7, shadcn/ui, Zod, `react-i18next`).*
