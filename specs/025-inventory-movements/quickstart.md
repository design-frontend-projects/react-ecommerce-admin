# Quickstart: Inventory Movements

## Prerequisites
- `pnpm install`; DB reachable via `DATABASE_URL`.
- Tables/enums are created by `prisma db push` (dev) or by applying the two migration
  files in `prisma/migrations/2026070810*/2026070811*` (fresh env). The RPC functions,
  triggers, and RLS policies live in those migration files — on a `db push` environment
  apply them once (see data-model.md note).
- `pnpm exec prisma generate` after any schema change.

## End-to-end flows

### Stock Transfer
1. Sign in as admin/manager → sidebar **Inventory → Stock Transfers**.
2. **New transfer** → pick source + destination store, add variant lines with quantities → **Create draft**.
3. Open the transfer → **Apply**. Verify:
   - Source store on-hand decreased, destination increased (Stock Balances screen).
   - Two rows in **Inventory Movements** (`transfer_out` + `transfer_in`) linked to the transfer.

### Stock Adjustment (stocktake)
1. **Inventory → Stock Adjustments → New adjustment** → type **Stocktake**, pick a store.
2. Add variants, enter counted quantities; the live discrepancy (Δ) shows per line.
3. Open → **Apply**. Verify balances reconciled by delta against current on-hand and
   `adjustment_in`/`adjustment_out` movements recorded.

### Damage write-off
1. New adjustment → type **Damaged/expired**, enter write-off quantity + reason.
2. Apply → stock reduced; a `damage`/`expired` movement records cost loss at `avg_cost`.

## Automated verification
- Server logic unit tests: `pnpm exec vitest run tests/inventory` (17 tests).
- Typecheck: `pnpm exec tsc -b`. Lint: `pnpm lint`.
- RPC behavior was validated with a rolled-back DB smoke test (20 assertions covering
  balance math, paired movements, FR-005 reconciliation, FR-006 costing, negative guard,
  idempotency, same-store guard).
