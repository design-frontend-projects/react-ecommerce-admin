# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Bluewave POS" — a restaurant/retail POS + management suite (despite the repo name). Client-rendered React 19 SPA (Vite) with a Prisma + Supabase server/data layer. PWA with offline POS support. Multi-tenant with branch scoping.

## Commands

Package manager is **pnpm** (dev server runs on port **5190**).

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Dev server | `pnpm dev` |
| Build (typecheck + bundle) | `pnpm build` (`tsc -b && vite build`) |
| Lint | `pnpm lint` |
| Format / check | `pnpm format` / `pnpm format:check` |
| Dead-code / unused deps | `pnpm knip` |
| All tests | `pnpm test` (vitest) |
| Single test file | `pnpm exec vitest run src/test/<file>.test.ts` |
| Single test by name | `pnpm exec vitest -t "<test name>"` |
| Prisma generate | `pnpm exec prisma generate` |
| Prisma migrate (dev) | `pnpm exec prisma migrate dev` |
| Prisma seed | `pnpm exec prisma db seed` |
| Docker (3 replicas + nginx) | `docker compose up -d --build` |

Prisma is **not** wrapped in npm scripts — invoke via `pnpm exec prisma ...`. The generated client outputs to `src/generated/prisma/` (not `node_modules`), so run `prisma generate` after schema changes.

## Architecture

- **Frontend:** React 19 + Vite 7 (SWC), TypeScript, TailwindCSS v4 + shadcn/ui (Radix in `src/components/ui/`). Forked from the shadcn-admin starter and heavily extended.
- **Routing:** TanStack Router, file-based in `src/routes/`. Route tree is auto-generated into `src/routeTree.gen.ts` (do not edit by hand). `_authenticated/route.tsx` is the auth/subscription guard; `respos/` is the restaurant POS surface; `_authenticated/_system/` is the super-admin area.
- **State — three distinct layers, keep them separate:**
  1. **Zustand** for client/global state (`src/stores/auth-store.ts`, `respos-store.ts`, `src/store/crmStore.ts`, per-feature `data/store.ts`).
  2. **TanStack Query** for ALL server state (configured in `src/main.tsx` with global 401/403/500 handling).
  3. **React Context** for cross-cutting UI only (theme, font, RTL direction, PWA, layout, search) in `src/context/`.
- **Feature-sliced layout:** `src/features/<domain>/` (~40 domains). Inside each: `data/` (`queries.ts` reads, `actions.ts` writes, `schema.ts` Zod contracts, `types.ts`, `store.ts`), plus `components/`, `blocks/`, `hooks/`, `pages/`, `services/`, `index.ts`. Routes are thin wrappers that mount a feature's page. The `data/` folder acts as a per-feature repository — follow `src/features/users/data/*` as the canonical pattern.

## Backend / data flow

- **ORM:** Prisma 7 via the `@prisma/adapter-pg` driver adapter over a raw `pg` Pool. Schema: `prisma/schema.prisma` (~90 models, ~40 enums).
- **DB singleton:** `src/lib/prisma.ts` is environment-aware — on the server it loads the generated client; **in the browser it returns a Proxy that throws.** All DB access must go through server code.
- **Two API styles coexist (transitional):** Next-style route handlers in `src/app/api/**/route.ts` (the active server contract that `fetch('/api/...')` hits) and TanStack Start file routes in `src/routes/api/**`. Prefer `src/app/api/**` for new server endpoints.
- **Thin handlers, fat server fns:** `app/api` handlers delegate to `src/server/fns/*` (rbac, users, invitations, auth). Shared helpers in `src/server/utils/{auth,http}.ts`; Supabase admin client in `src/server/supabase-admin.ts`.
- **Typical write flow:** Component → TanStack Query hook → `data/actions.ts` (Zod-validates, attaches Supabase bearer token) → `fetch('/api/...')` → `route.ts` handler → `requireAuth(token, 'perm')` → `src/server/fns/*` → `src/lib/prisma.ts` → Postgres. Responses use the `{ success, data, error }` envelope and are re-parsed with Zod on the client.
- **Shortcut to know:** many RBAC/customer reads go client → Supabase directly (`supabase.from(...)`) relying on RLS, bypassing the Prisma API layer. Writes go through the API path above.

## Auth & RBAC

- **Supabase Auth** (Email + OTP, passwordless). Migrated off Clerk — lingering "clerk" references are legacy. Set `VITE_AUTH_PROVIDER=supabase`. Session lives in `src/stores/auth-store.ts` (hydrated via `supabase.auth.onAuthStateChange`).
- **Server is authoritative:** every `app/api` handler calls `requireAuth(token, 'some.permission')` (`src/server/utils/auth.ts`), which verifies the JWT and checks permissions via `tenant_users → user_roles → roles → role_permissions → permissions`. Base roles/permissions are seeded on first RBAC catalog request (`src/server/fns/rbac.ts`); defaults in `src/features/users/data/rbac.ts`.
- **Client gating is UX-only:** `<Can role= permission=>` (`src/components/rbac/Can.tsx`) and `rbac-guard.tsx`, reading a Zustand RBAC store. Permissions refresh live via Supabase Realtime subscriptions (`src/features/users/data/queries.ts`).
- **Two RBAC model families exist** in the schema — the active `roles/permissions/tenant_users/...` set and a newer `rbac_*` set. The active production path is the non-prefixed set. Confirm which a table belongs to before touching it.

## Conventions

- **Path aliases** (`tsconfig.json` + `vite.config.ts`, keep in sync): `@/*` → `src/*`, `@crm/*` → `src/components/crm/*`, `@tests/*` → `tests/*`.
- **DB:** `snake_case` tables/columns, 3NF, always include `created_at`/`updated_at`, index all FKs. Migrations are **additive** — add new migration files, never alter existing prod columns directly.
- **Forms:** React Hook Form + Zod (`@hookform/resolvers`). Zod is the contract boundary on both request build and response parse.
- **Lint enforces `no-console: 'error'`** — use structured logging, not `console.log`. Type imports must be inline (`consistent-type-imports`).
- **Prettier:** no semicolons, single quotes, 2-space, printWidth 80. Import sorting and Tailwind class sorting are enforced by plugins.
- **RTL is first-class.** Several `src/components/ui/*` are hand-customized for RTL — do NOT overwrite them via the shadcn CLI (see README for the exact list).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, ...), enforced via Commitizen (`cz.yaml`).

## Spec-driven workflow

Features are specced before implementation under `specs/NNN-feature-name/` (e.g. the current branch `023-stock-adjustments`). Each folder holds `spec.md`, `plan.md`, `research.md`, `data-model.md`, `tasks.md`, `contracts/`, `checklists/`. **When implementing a numbered feature, read its `spec.md` + `plan.md` first** — `plan.md` states the exact stack conventions and required feature-folder structure for that feature. Additional design docs live in `docs/` (`crm-module.md`, `inventory_automation_plan.md`, `pwa-edge-cases.md`).

Note: `.agent/rules/*` and root `GEMINI.md` are an auxiliary agent-framework ruleset (some rules in Vietnamese); the load-bearing coding conventions are captured above.

## Gotchas

- README is **stale** (describes the shadcn-admin starter + Clerk). Trust this file over the README for auth/architecture.
- No SSR/server entry is wired — reason about runtime as "client SPA + `/api` handlers."
- Feature specced but not yet in code will not have a `src/features/<name>/` folder — check before assuming it exists.
