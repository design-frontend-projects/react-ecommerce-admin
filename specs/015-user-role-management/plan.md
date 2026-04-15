# Implementation Plan: User Role Management & RBAC

**Branch**: `015-user-role-management` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-user-role-management/spec.md`

## Summary

This feature enhances the user module to support full User Management and Role-Based Access Control (RBAC). It integrates with **Clerk** for identity and invitation workflows, and **Supabase** (Postgres) for persisting granular roles and permissions. A key requirement is real-time propagation of role changes to active user sessions using a subscription-based model.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+  
**Primary Dependencies**: Clerk Backend SDK (@clerk/nextjs), Supabase Client (@supabase/supabase-js), Prisma 7, TanStack Query, shadcn/ui, Zod  
**Storage**: PostgreSQL (via Prisma), Supabase Realtime for role updates  
**Testing**: Vitest  
**Target Platform**: Next.js App Router  
**Project Type**: Web Application  
**Performance Goals**: Role change propagation < 1s, Permission validation < 20ms (cached)  
**Constraints**: Zero-trust access control, Atomic role assignments, Clerk-to-Tenant linkage  
**Scale/Scope**: Support for 100+ roles/permissions per tenant, 1000s of invited users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Atomic Architecture**: Does the plan follow ui/blocks/pages structure?
- [x] **Schema-Driven UI**: Are roles/permissions mapped via Zod and mirrored in UI?
- [x] **Clerk-First Identity**: Is Clerk used as the source of truth for identities?
- [x] **Real-Time Sync**: Is there a clear mechanism for instant propagation?
- [x] **Security Constraints**: Are all API calls guarded by permission checks?

## Project Structure

### Documentation (this feature)

```text
specs/015-user-role-management/
├── spec.md              # Requirement specification
├── plan.md              # This file
├── research.md          # Phase 0: Research (Real-time sync, Clerk patterns)
├── data-model.md        # Phase 1: DB Schema & Roles/Permissions set
└── quickstart.md        # Phase 1: Developer onboarding
```

### Source Code

```text
prisma/
└── schema.prisma        # Add roles and user_roles models

src/
├── features/
│   └── users/           # Main feature directory (Atomic structure)
│       ├── components/  # UI elements: PermissionToggle, RoleBadge
│       ├── blocks/      # Composed forms: UserList, InviteForm, PermissionEditor
│       ├── pages/       # UserManagementPage
│       ├── data/
│       │   ├── actions.ts   # Clerk Invite & Supabase Role updates
│       │   ├── schema.ts    # Zod schemas for RBAC
│       │   ├── queries.ts   # TanStack Query & Supabase Realtime hooks
│       │   └── rbac.ts      # Permission calculation logic
│       └── index.ts     # Feature export
├── lib/
│   ├── clerk-service.ts  # Clerk Backend SDK wrapper
│   └── supabase-service.ts # Supabase Client with Realtime support
```

**Structure Decision**: Enhancing the existing `src/features/users` module. Roles and permissions are persisted in Supabase to leverage Realtime subscriptions, while core identity remains in Clerk. Logic for permission checking is isolated in `rbac.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
