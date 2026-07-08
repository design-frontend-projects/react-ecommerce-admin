# Checklist: RBAC Module Enhancement — Requirements & Quality Gates

**Feature**: `024-rbac-enhancements`

## Requirement Coverage (from the engineering specification)

- [ ] 4.1 Roles: `admin`, `super_admin`, `kitchen`, `captain`, `cashier` seeded and manageable by admin/super_admin; roles creatable before assignment; multi-role per user (FR-001, FR-002)
- [ ] 4.2 Permissions independent of roles; attachable to roles, screens, buttons; admin CRUD incl. standalone create/delete (FR-004)
- [ ] 4.3 User management: view/create/update staff; creation via `supabase.auth.admin.createUser` behind `POST /api/users`; roles assigned at creation (`roleIds[]`); roles changeable later (FR-002, FR-003)
- [ ] 4.4 Screen/module registry as data: name, route, description, allowed roles, applicable permissions; admins register new screens; existing screens seeded; management screens for Roles/Permissions/Users/Screens/Buttons exist (FR-005, FR-012)
- [ ] 4.5 Permission buttons `create/update/delete/approve/reject/pay`; screen×button mapping grants to roles AND individual users; cashier-sees-screen-but-only-pay scenario works (FR-006, FR-007, FR-008)
- [ ] 4.6 Activity types per tenant; sidebar shows modules only when activity type enables them AND role/permission allows (FR-009, FR-010, FR-011)
- [ ] §5 All ten conceptual entities mapped to concrete tables (see data-model.md mapping table)
- [ ] §7 Design consistent with TanStack route structure + Prisma/Supabase conventions; no implementation shipped from this spec exercise

## Security Gates

- [ ] Every new API handler calls `getBearerToken` + `requireAuth(token, '<permission>')` — no client-invoked server fns remain for privileged writes
- [ ] `createUserDirect` client bypass removed; compensation deletes orphaned auth users on partial failure
- [ ] `profiles.role` no longer read for authorization decisions (fallbacks removed)
- [ ] Deny precedence (user deny > user grant > role grant > wildcard) identical client/server via one shared function + shared tests
- [ ] RLS enabled on all 9 new tables (service-role writes; tenant-scoped reads where applicable)
- [ ] No secrets in seed data or client code; service-role client stays server-only
- [ ] `is_system` rows (roles, screens, buttons) protected from deletion/route mutation

## Data & Migration Gates

- [ ] All migrations additive; no existing column altered or dropped
- [ ] All new FKs indexed (`idx_*` naming); composite PKs on pure join tables
- [ ] `tenant_activity_types` backfill preserves current visibility (defaults to both types when unknown)
- [ ] New tables added to `supabase_realtime` publication (else live refresh silently fails)
- [ ] Seed idempotent: catalogs upserted, mappings only created when parent empty; `app_settings` version guard prevents re-run storms
- [ ] Screen `code` values snake_case without dots (permission `resource.action` parsing intact)

## UX / Client Gates

- [ ] Multi-role select in create/invite/edit user forms (RHF + Zod, `roleIds[].min(1)`)
- [ ] `<CanAction>` supports `disable` and `hide` modes; disabled state accessible (aria-disabled)
- [ ] Sidebar updates in near-real-time on role/permission/activity-type changes without re-login
- [ ] Route-level redirect matches nav filtering (no orphan-accessible URLs)
- [ ] New screens RTL-ready and i18n'd; no shadcn CLI overwrite of hand-customized `src/components/ui/*`
- [ ] Roles/Permissions tabs removed from `/users` with links/redirects to the new routes

## Test Gates

- [ ] Unit: `resolveEffectivePermissions` precedence matrix; wildcard interaction with denies
- [ ] Integration: 403 on every new endpoint without the required permission (SC-001, SC-003)
- [ ] Integration: user-creation compensation path (forced transaction failure → auth user deleted)
- [ ] Integration: seed double-run idempotency
- [ ] E2E: cashier pay-only scenario; restaurant-only tenant navigation; activity-type live toggle
- [ ] `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm knip` clean at the end of each phase
