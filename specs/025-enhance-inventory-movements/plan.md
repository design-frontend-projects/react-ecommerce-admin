# Implementation Plan: Enhance Inventory Movements UI/UX & Server-Side Pagination

**Branch**: `025-enhance-inventory-movements` | **Date**: 2026-09-25 | **Spec**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/025-enhance-inventory-movements/spec.md)
**Input**: Feature specification from `/specs/025-enhance-inventory-movements/spec.md`

## Summary

Enhance the Inventory Movements module (`src/features/inventory-movements`) into a high-performance, enterprise-grade stock audit ledger with server-side pagination, debounced multi-field search, multi-faceted filters, executive summary KPI metrics, responsive TanStack Table integration, slide-out movement audit inspection drawer, and CSV dataset export.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+  
**Primary Dependencies**: React 18, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-table`, Tailwind CSS, Radix UI (shadcn/ui), Zod, Lucide React, `react-i18next`  
**Storage**: PostgreSQL via Prisma 7 (server queries) and Supabase client fallback  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Web (Desktop, Tablet, Mobile responsive browsers)  
**Project Type**: Fullstack Web Application (Next.js / TanStack Start Vite-powered app)  
**Performance Goals**: First page render < 600ms, Server API response < 300ms p95, search keystroke debounce 300ms, zero layout shifts (CLS < 0.05)  
**Constraints**: Multi-tenant database isolation (`tenant_id`), RBAC permission verification (`inventory.view`), append-only ledger immutability, full bilingual localization (EN/AR with RTL layout)  
**Scale/Scope**: Thousands to millions of immutable movement records, up to 100 items per page chunk, batch CSV export up to 5,000 records  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Rule | Compliance Status | Analysis & Verification |
|---|---|---|
| **Package Manager: pnpm** | Pass | All packages installed via `pnpm`. No other package managers used. |
| **Testing: Vitest** | Pass | Unit and integration tests written using Vitest and `@testing-library/react`. |
| **UI: shadcn/ui & Tailwind** | Pass | Components built with shadcn/ui primitives (`Table`, `Sheet`, `Select`, `Button`, `Badge`, `Card`, `Skeleton`). |
| **State: Zustand & URL State** | Pass | Global auth state in Zustand; table pagination/filter state persisted in URL query parameters. |
| **API: TanStack Query** | Pass | Server state fetched and cached via `useQuery` with structured cache invalidation tags. |
| **Tables: TanStack Table** | Pass | Server-side paginated TanStack Table with manual pagination, sorting, and column visibility. |
| **Validation: Zod** | Pass | Response payloads, query parameters, and export schemas strictly validated with Zod schemas. |
| **Icons: Lucide React** | Pass | Strictly using `lucide-react` icons. |
| **Multi-Tenancy & Security** | Pass | All server queries scoped strictly by `tenant_id` and verified with `withAuth(PERMISSIONS.INVENTORY_VIEW)`. |

## Project Structure

### Documentation (this feature)

```text
specs/025-enhance-inventory-movements/
├── plan.md              # This implementation plan
├── research.md          # Phase 0 research & architectural decisions
├── data-model.md        # Phase 1 data schema, entities, and validation rules
├── quickstart.md        # Phase 1 verification and developer quickstart guide
├── contracts/           # Phase 1 API and component contract definitions
│   └── movements-api.md # API endpoint query, pagination, and response contract
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Layout

```text
src/
├── features/inventory-movements/
│   ├── components/
│   │   ├── inventory-movements-columns.tsx      # TanStack Table column definitions with semantic badges
│   │   ├── inventory-movements-table.tsx        # Main table container with manual pagination and loading skeletons
│   │   ├── inventory-movements-toolbar.tsx      # Search, faceted filter popovers, date range, column visibility, export
│   │   ├── inventory-movements-kpi-ribbon.tsx   # Executive metric cards (Total In, Out, Net Velocity, Total Count)
│   │   ├── inventory-movements-drawer.tsx       # Slide-out Sheet displaying full movement audit details
│   │   └── inventory-movements-export.ts        # CSV dataset exporter utility
│   ├── data/
│   │   ├── actions.ts                           # Server API fetcher with query parameters and direct Supabase fallback
│   │   └── schema.ts                            # Zod schemas for query params, rows, pagination envelope, and summary
│   ├── hooks/
│   │   └── use-inventory-movements.ts           # TanStack Query hook with query key synchronization
│   └── index.tsx                                # Feature entry point coordinating header, KPIs, toolbar, table, and drawer
├── routes/
│   └── api/
│       └── inventory/
│           └── movements.ts                     # API route handler parsing pagination query parameters
└── server/
    └── fns/
        └── inventory-movements.ts               # Prisma 7 service calculating paginated movements and summary metrics
```

## Complexity Tracking

No constitution violations detected. Implementation utilizes existing architecture, shadcn/ui components, and established repository patterns.
