# Implementation Plan: POS CRM Module Integration

**Branch**: `021-integrate-crm-module` | **Date**: 2026-06-26 | **Spec**: [spec.md](file:///E:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/021-integrate-crm-module/spec.md)
**Input**: Feature specification from `/specs/021-integrate-crm-module/spec.md`

## Summary

This feature integrates a full Customer Relationship Management (CRM) module into the existing POS and restaurant booking/order application. It automatically captures transaction data from `pos_sales` and `res_orders` to maintain customer profiles, supports lead/opportunity pipeline tracking, follow-up task scheduling, and role-based analytics dashboards.

Technical Approach:
1. **Schema Extension**: Add tables for `crm_leads`, `crm_opportunities`, `crm_tasks`, `crm_interactions`, and `crm_audit_logs` to the Prisma schema. Add relations linking these to existing `customers`, `pos_sales`, and `res_orders`.
2. **Synchronization Service**: Develop a robust event listener and sync layer that processes transaction completions (POS checkouts and Restaurant order payments) to automatically update customer histories, segments, and affinity metrics.
3. **Zustand State Management**: Manage lead pipeline state, interaction histories, and active dashboard filters in client-side state.
4. **TanStack Router**: Establish routes for `/crm`, `/crm/contacts`, `/crm/pipeline`, `/crm/tasks`, and `/crm/analytics` under the existing application layout.
5. **Interactive UI**: Utilize Tailwind v4 + shadcn/ui to build kanban pipeline boards, customer profile timelines, and recharts-based analytical reports.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+  
**Primary Dependencies**: React 19, @tanstack/react-router, @tanstack/react-query, @tanstack/react-table, recharts, lucide-react, zustand, react-hook-form, zod  
**Storage**: PostgreSQL (via Prisma 7 / Supabase)  
**Testing**: Vitest  
**Target Platform**: Web application (Desktop/Tablet optimized, responsive mobile layout)  
**Project Type**: single-project  
**Performance Goals**: UI load time < 1s, DB queries < 200ms under 500 concurrent connections, sync processing time < 3s  
**Constraints**: Field-level PII masking for CRM Users, immutable audit log capture, automatic offline queue retry  
**Scale/Scope**: ~50,000 customers, 100,000 POS/ResPOS sales records, 50 concurrent store users  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Rule 1: Test-First (TDD Workflow)**: Non-negotiable. All database serialization utilities, sync handlers, and RBAC gate checks must have Vitest unit tests defined before final implementation.
- **Rule 2: Schema Integrity**: New tables must fully match PostgreSQL snake_case conventions and maintain strict referential integrity (e.g., ON DELETE CASCADE/SET NULL) with existing tables.
- **Rule 3: Clean API Design**: The backend/loader contracts must strictly define parameters and return types using Zod. No untyped JSON payload exchanges.

## Project Structure

### Documentation (this feature)

```text
specs/021-integrate-crm-module/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── crm-api.json     # API Contract for the CRM routes
└── checklists/
    └── requirements.md  # Spec checklist
```

### Source Code (repository root)

```text
src/
├── components/
│   └── crm/
│       ├── CRMOverview.tsx        # Dashboard widgets and alerts
│       ├── CustomerProfile.tsx    # Timeline, affinity, notes, and tasks
│       ├── PipelineBoard.tsx      # Kanban board for leads and opportunities
│       └── CRMAnalytics.tsx       # Recharts dashboards for managers
├── routes/
│   └── crm/
│       ├── index.lazy.tsx         # /crm main router route
│       ├── contacts.lazy.tsx      # /crm/contacts view
│       ├── pipeline.lazy.tsx      # /crm/pipeline view
│       └── analytics.lazy.tsx     # /crm/analytics view
├── services/
│   └── crm/
│       ├── syncManager.ts         # POS / ResPOS transaction sync hooks
│       ├── segmenter.ts           # Segment automation rules
│       └── audit.ts               # Immutable security log dispatchers
├── store/
│   └── crmStore.ts                # Zustand store for pipelines and dashboard filters
└── utils/
    └── piiMasker.ts               # Field-level permission mask rules
```

**Structure Decision**: Using Single Project structure (Vite + React 19 + TanStack Router). All source files are located inside the standard `src/` directory, and test suites are mapped inside `/tests`.

## Complexity Tracking

*No violations of Project Constitution detected.*
