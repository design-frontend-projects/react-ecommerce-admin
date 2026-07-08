# Implementation Plan: Inventory Movements Module

**Spec**: [spec.md](./spec.md) | **Status**: Implemented

## Approach

Hybrid write path: thin `/api/inventory/**` handlers → `src/server/fns/*` (Prisma for
CRUD/auth, `requireAuth`-gated) with the atomic **apply** step delegated to a Postgres
`SECURITY DEFINER` RPC, matching the existing `adjust_stock_balance` /
`receive_purchase_order_items` convention. Client features follow the canonical
server-authoritative pattern (`authorizedRequest` + Zod), UI mirrors `src/features/stores/**`.

## Touch points

```
prisma/schema.prisma                      # 4 models + 3 enums + back-relations
prisma/migrations/20260708100000_add_stock_transfers/    # tables, RLS, helper, apply_stock_transfer RPC
prisma/migrations/20260708110000_add_stock_adjustments/  # enums, tables, RLS, apply_stock_adjustment RPC

src/server/fns/stock-transfers.ts         # CRUD + applyTransfer (RPC)
src/server/fns/stock-adjustments.ts       # CRUD + applyAdjustment (RPC), snapshots qty_before
src/server/fns/adjustment-logic.ts        # pure delta math (unit-tested)
src/server/fns/inventory-movements.ts     # listMovements (read)
src/server/utils/{tenant,api-error}.ts    # resolveTenantId, ApiError + rpcError + handleRouteError
src/app/api/inventory/{transfers,adjustments}[/apply]/route.ts, movements/route.ts

src/lib/authorized-request.ts             # shared bearer-token fetch helper
src/hooks/use-inventory-lookups.ts        # store/variant/on-hand pickers
src/features/stock-transfers/**           # data, hooks, components, page
src/features/stock-adjustments/**         # data, hooks, components, page (3 modes)
src/features/inventory-movements/**       # read-only ledger view
src/routes/_authenticated/{stock-transfers,stock-adjustments,inventory-movements}/index.tsx

src/features/access-control/data/seed-data.ts   # 3 new screens + screen_buttons
src/components/layout/data/sidebar-data.ts       # 3 nav items under Inventory
```

## Phases (all complete)

1. Schema + additive migrations (+ RPCs).
2. Server fns + `/api` handlers.
3. Client data layer (Zod + TanStack Query hooks).
4. UI screens + thin routes.
5. RBAC seeds + sidebar + page-level `<Can>` gating.
6. Verification: typecheck, lint, unit tests, rolled-back DB RPC smoke test.

## Decisions & notes

- Page-level RBAC only this iteration; button-level `<CanAction>` + route/activity guards
  deferred to `024-rbac-enhancements`.
- `qty_available` confirmed a plain column → RPCs maintain it explicitly.
- Enums (with `pending`) chosen over spec-023's VarChar draft; reconcile if 023 ships separately.
- Single-phase transfers (draft→received); `shipped_*` columns reserved for two-phase later.
- `tenant_id`/`auth_user_id`/`created_by` always stamped from the authenticated user, never client input.
