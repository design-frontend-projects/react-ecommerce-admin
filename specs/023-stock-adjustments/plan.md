# Implementation Plan: Stock Adjustments

**Branch**: `023-stock-adjustments` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-stock-adjustments/spec.md`

## Summary

This feature implements the **Stock Adjustments** module, allowing manual stock entries, adjustments for damaged/expired goods, and full inventory counts (stocktaking). Stock updates will be synchronized with `stock_balances` and recorded in `inventory_movements` within single database transactions to ensure data consistency and auditability.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+
**Primary Dependencies**: React 18, Next.js (TanStack Start/Router), TanStack Query, shadcn/ui, Zod, React Hook Form, Zustand
**Storage**: PostgreSQL (via Prisma 7)
**Testing**: Vitest (unit & integration tests)
**Target Platform**: Web (Desktop & Mobile-responsive)
**Project Type**: Next.js App Router Web Application
**Performance Goals**: UI responsiveness (<100ms render), stock reconciliation transactions completing under 1 second.
**Constraints**: Multi-tenancy isolation by checking tenant/auth user context.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Package Manager: pnpm.
- [x] Testing: Vitest.
- [x] UI: shadcn/ui and Tailwind.
- [x] State: Zustand for client-side state.
- [x] API: TanStack Query for all server-state/API calls.
- [x] Forms & Validation: React Hook Form + Zod.
- [x] Database: Prisma 7.
- [x] Architecture: Atomic component structure (`src/features/stock-adjustments/...`).

## Project Structure

### Documentation (this feature)

```text
specs/023-stock-adjustments/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created later)
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma         # Define stock_adjustments and stock_adjustment_items

src/
├── features/
│   └── stock-adjustments/
│       ├── components/
│       │   ├── stock-adjustments-list.tsx
│       │   ├── manual-adjustment-dialog.tsx
│       │   ├── damage-adjustment-dialog.tsx
│       │   └── stocktake-reconciliation.tsx
│       ├── data/
│       │   └── index.ts  # Database service functions
│       ├── hooks/
│       │   └── use-stock-adjustments.ts
│       └── index.tsx     # Page entry point
```

**Structure Decision**: Single Next.js project with modular feature folder under `src/features/stock-adjustments` matching the existing structure of other features in the repository.

## Complexity Tracking

*No violations identified.*
