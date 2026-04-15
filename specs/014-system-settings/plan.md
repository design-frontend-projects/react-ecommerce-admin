# Implementation Plan: Global System Settings

**Branch**: `014-system-settings` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-system-settings/spec.md`

## Summary

This feature implements a global system settings management module. It adds an `app_settings` model to the Prisma schema for persisting tenant-specific preferences (branding, localization, business rules) and provides a global access layer (caching/Zustand) to ensure settings are efficiently available throughout the application.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+  
**Primary Dependencies**: Prisma 7, TanStack Query, shadcn/ui, Zod, Zustand  
**Storage**: PostgreSQL (Prisma)  
**Testing**: Vitest  
**Target Platform**: Next.js App Router (TanStack Start/Router pattern)
**Project Type**: Web Application  
**Performance Goals**: Settings retrieval < 50ms (cached), UI update < 100ms  
**Constraints**: Must support multi-tenancy via `clerk_user_id`, SSR safe  
**Scale/Scope**: Global scope, accessible by all feature modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Atomic Architecture**: Does the plan follow ui/blocks/pages structure?
- [x] **Schema-Driven UI**: Are settings mappings defined via Zod/Prisma?
- [x] **Prisma Querying**: Is all DB access through Prisma 7?
- [x] **TanStack State**: Is server state managed via TanStack Query?
- [x] **SSR/SSG Compatibility**: Is the settings provider SSR-safe?

## Project Structure

### Documentation (this feature)

```text
specs/014-system-settings/
├── plan.md              # This file
├── research.md          # Phase 0: Research findings
├── data-model.md        # Phase 1: Prisma model & Zod schemas
├── quickstart.md        # Phase 1: Setup guide
└── tasks.md             # Phase 2: Actionable tasks
```

### Source Code

```text
prisma/
└── schema.prisma        # Add app_settings model

src/
├── features/
│   └── settings/        # Main feature directory (Atomic structure)
│       ├── components/  # UI elements: ToggleSetting, InputSetting, etc.
│       ├── blocks/      # Composed forms: BrandingSection, RegionalSection
│       ├── pages/       # SettingsPage (Admin view)
│       ├── data/
│       │   ├── actions.ts   # Prisma server actions
│       │   ├── schema.ts    # Zod validation & types
│       │   ├── queries.ts   # TanStack Query hooks
│       │   └── store.ts     # Zustand store for global sync
│       └── index.ts     # Feature export
├── components/          # Global UI components
│   └── providers/
│       └── settings-provider.tsx # Global settings context/provider
```

**Structure Decision**: Selected a feature-sliced architecture integrated with the project's existing atomic design pattern. Settings are isolated within `src/features/settings` but exposed via a global provider.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
