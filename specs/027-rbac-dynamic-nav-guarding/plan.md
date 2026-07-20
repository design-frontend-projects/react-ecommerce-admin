# Feature 027 — Implementation Plan

## Stack conventions (per repo CLAUDE.md)

- React 19 + Vite, TanStack Router (file-based, `src/routes/`; tree auto-generated), TanStack Query
  for server state, Zustand for client state.
- Prisma 7 via `@prisma/adapter-pg`; generated client in `src/generated/prisma/` — run
  `pnpm exec prisma generate` after schema edits. Migrations additive, `snake_case`.
- Server access only via `src/server/**` (`requireAuth` + server fns); `{ success, data, error }`
  envelope; Zod at both request build and response parse.
- Feature-sliced: `src/features/<domain>/{data,components,hooks,pages}`. RBAC lives in
  `src/features/users/` + `src/features/access-control/`; guard primitives in `src/components/rbac/`.

## Phase 0 — Route guarding (DONE in this feature)

- `src/components/rbac/require-permission.tsx` (new guard).
- Wrap `users`, `respos/shifts`, `respos/analytics` routes.
- Fix `app-sidebar.tsx` permission matching; remove `use-rbac.ts` console.logs.
- Verify: `pnpm build`, `pnpm lint` on touched files; manual guard checks (see spec verification).

## Phase 1 — Provisioning hardening (next)

- Server: `create-user.ts` generates a CSPRNG temp password (≥16 chars, 4 classes), sets
  `user_metadata.force_password_change=true` + `tenant_users.force_password_change`, returns
  `temporaryPassword` once. Extend result Zod schema (`data/schema.ts`).
- Client: consolidate the three create dialogs into one; migrate `useCreateUser` off deprecated
  `createUserDirect` onto a new `actions.ts createUser` → `POST /api/users`; add a **reveal-once**
  dialog (copy/share) wired to `onSuccess`; clear credential on close.
- First-sign-in force-reset gate before protected routes render.

## Phase 2 — Admin RBAC UI

- Role × screen × permission matrix (Part 7.6) on existing `setRolePermissions`/`toggleRolePermission`.
- Per-user permission overrides UI on `user_permissions` (`/api/users/permissions`).
- Fill any missing CRUD UI for modules/screens/buttons/activity-types (server fns already exist).

## Phase 3 — Catalog-driven sidebar + audit

- Replace static `sidebar-data.ts` visibility with `app_screens`/`screen_permissions` payload.
- Add `rbac_audit` writes in mutation server fns; surface in `/system/audit-logs`.
- Converge client/server resolution (Q5).

## Risks / notes

- RBAC state is not in router context; guards are component-level (matches `_system.tsx`) — do **not**
  attempt `beforeLoad` RBAC reads without first wiring RBAC into router context.
- Repo baseline `tsc`/tests were already red (see project memory); scope verification to touched files.
- `user_roles.tenant_user_id` maps to physical `auth_user_id` but FKs `tenant_users.id` — do not confuse
  with the Supabase uid when writing queries.
