# Implementation Plan: Marketplace Inventory & Auto-Reordering Database Changes

**Branch**: `022-inventory-marketplace-reorder` | **Date**: 2026-07-06 | **Spec**: [spec.md](file:///E:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/022-inventory-marketplace-reorder/spec.md)
**Input**: Feature specification from `/specs/022-inventory-marketplace-reorder/spec.md`

## Summary

The feature enables tenants to manage product inventory with marketplace integration, supplier preferences, and automated reordering. The technical approach involves adding boolean flags to `products`, `inventory`, `suppliers`, and `rbac_tenants` models in the database schema, generating Prisma client types, and implementing Zod validations on the client/server forms.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+
**Primary Dependencies**: React 18, Next.js (TanStack Start/Router), Prisma 7, TanStack Query, Zod, React Hook Form
**Storage**: PostgreSQL (Prisma 7 ORM)
**Testing**: Vitest
**Target Platform**: Web
**Project Type**: Web Application
**Performance Goals**: Database updates under 200ms, zero CLS impact on UI forms
**Constraints**: All boolean flags default to `false` for backward compatibility
**Scale/Scope**: 4 model updates in database, 4 schema validations updated in React app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Core Principles**:
  - Core Principle 1: Library-First - All logic encapsulated in dedicated feature directories under `src/features`. (Pass)
  - Core Principle 2: Test-First - Form validation schemas are testable via standard Vitest unit tests. (Pass)
  - Core Principle 3: Simplicity - Start simple: boolean flags in schema instead of complex tables/relations. (Pass)

## Project Structure

### Documentation (this feature)

```text
specs/022-inventory-marketplace-reorder/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── checklists/
    └── requirements.md  # Specification Quality Checklist
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma        # Database schema models

src/
├── features/
│   ├── products/
│   │   ├── components/  # wizard and dialog components
│   │   └── data/        # product and wizard schemas
│   ├── suppliers/
│   │   ├── components/  # supplier edit dialog components
│   │   └── hooks/       # use-suppliers types and hooks
│   └── settings/
│       └── data/        # settings schema and defaults
```

**Structure Decision**: Modified existing single-project structure under `prisma/` and `src/features/` to integrate marketplace and auto-reorder flags.

## Complexity Tracking

No violations of project constitution detected. The database schema and validation edits represent the simplest possible implementation.
