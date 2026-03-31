# Implementation Plan: RBAC and User Invitation Module

**Branch**: `003-rbac-user-invitation` | **Date**: 2026-04-01 | **Spec**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/003-rbac-user-invitation/spec.md)
**Input**: Feature specification from `/specs/003-rbac-user-invitation/spec.md`

## Summary

Implement a full Role-Based Access Control (RBAC) system including user invitation workflows using Clerk's Backend API and TanStack Start's `createServerFn`. This feature will allow administrators to manage team access, define roles/permissions, and onboard new users through a profile completion process, syncing identity metadata between Clerk and a PostgreSQL database.

## Technical Context

**Language/Version**: TypeScript / Node.js (Latest)
**Primary Dependencies**: `@clerk/backend`, `@clerk/tanstack-start`, `@tanstack/react-query`, `prisma`, `zod`, `shadcn/ui`, `lucide-react`, `zustand`
**Storage**: PostgreSQL (Prisma 7 ORM)
**Testing**: Vitest
**Target Platform**: Web (Modern Browsers)
**Project Type**: Full-stack Web Application (TanStack Start)
**Performance Goals**: < 200ms API response time for invitation flows, Zero CLS for the "Complete Account" screen.
**Constraints**: Requires `CLERK_SECRET_KEY`, Database RLS alignment with Clerk IDs.
**Scale/Scope**: Manageable set of ~10 permissions and 3-5 default roles.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Justification |
|------|--------|---------------|
| Package Manager: pnpm | [PASS] | Project uses `pnpm-lock.yaml`. |
| UI: shadcn/ui + Tailwind 4 | [PASS] | Standard for the project. |
| API: TanStack Query + createServerFn | [PASS] | Aligns with user rules for server-state. |
| Database: Prisma 7 | [PASS] | Required for advanced querying. |
| SEO: Meta & Semantic HTML | [PASS] | Mandatory for all pages. |
| State: Zustand | [PASS] | Used for client-side state. |

## Project Structure

### Documentation (this feature)

```text
specs/003-rbac-user-invitation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (generated via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── features/
│   ├── users/           # Modified: Add user management UI & roles/permissions tabs
│   └── auth/            # New: Complete Account screen & Invitation handling
├── server/
│   ├── fns/             # New: server functions for user management (createServerFn)
│   └── clerk.ts         # New: Clerk Backend SDK initialization
├── components/          # Shared UI blocks for RBAC
└── lib/
    ├── prisma.ts        # Prisma client abstraction
    └── utils.ts         # Auth/Permission helpers
```

**Structure Decision**: Using the **Single project** layout integrated into the existing `src/features/users` directory as primarily requested, with additions to `src/server` for backend logic.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
