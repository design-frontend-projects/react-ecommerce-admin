# Tasks: Inventory Movements Module

All tasks complete.

## Phase 1 — Schema & migrations
- [x] T001 Add `stock_transfers`, `stock_transfer_items`, `stock_adjustments`, `stock_adjustment_items` models + 3 enums + back-relations to `prisma/schema.prisma`.
- [x] T002 Migration `20260708100000_add_stock_transfers` (tables, indexes, trigger, RLS, `inventory_allow_negative()`, `apply_stock_transfer()`).
- [x] T003 Migration `20260708110000_add_stock_adjustments` (enums, tables, indexes, trigger, RLS, `apply_stock_adjustment()`).
- [x] T004 `pnpm exec prisma generate`.

## Phase 2 — Server
- [x] T005 `src/server/utils/tenant.ts` (resolveTenantId/requireTenantId).
- [x] T006 `src/server/utils/api-error.ts` (ApiError, rpcError, handleRouteError).
- [x] T007 `src/server/fns/adjustment-logic.ts` (pure delta math).
- [x] T008 `stock-transfers.ts`, `stock-adjustments.ts`, `inventory-movements.ts` server fns.
- [x] T009 `/api/inventory/{transfers,transfers/apply,adjustments,adjustments/apply,movements}` handlers.

## Phase 3 — Client
- [x] T010 `src/lib/authorized-request.ts`; `src/hooks/use-inventory-lookups.ts`.
- [x] T011 `stock-transfers` + `stock-adjustments` + `inventory-movements` data/schema/actions/hooks.

## Phase 4 — UI & routes
- [x] T012 Transfers: provider, columns, table, create/view dialogs, primary buttons, page + route.
- [x] T013 Adjustments: same set with 3-mode create flow + stocktake discrepancy display.
- [x] T014 Movements ledger: filterable read-only page + route.

## Phase 5 — RBAC & nav
- [x] T015 3 new screens + screen_buttons in `seed-data.ts`.
- [x] T016 3 sidebar nav items; page mutations gated by `<Can permission="inventory.manage">`.

## Phase 6 — Verification
- [x] T017 `tsc -b` clean; `pnpm lint` clean (only pre-existing-pattern warnings).
- [x] T018 Unit tests `tests/inventory/*` (17 passing).
- [x] T019 Rolled-back DB RPC smoke test (20 assertions passing).
