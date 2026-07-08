# Data Model: Inventory Movements

Conventions: snake_case, uuid PKs `gen_random_uuid()`, `Decimal(18,4)` for qty/cost,
`created_at`/`updated_at timestamptz`, FKs indexed, **additive only**.

## Reused substrate (unchanged)

- `inventory_movements` — the ledger. Movements link back to their source document via
  `reference_type` + `reference_id` (`'stock_transfer'` / `'stock_adjustment'`).
- `stock_balances` — current on-hand per `(store_id, product_variant_id)`.
  `qty_available` is a **plain** column → RPCs set it explicitly to `qty_on_hand - qty_reserved`.
- `movement_type_enum` — reused as-is (`transfer_in/out`, `adjustment_in/out`, `damage`, `expired`).
- `transfer_status_enum` — reused (`draft`, `in_transit`, `received`, `cancelled`).
- `audit_logs` — not written by the RPCs; the ledger rows are the authoritative audit trail.

## New enums

- `adjustment_status_enum` — draft, pending, approved, cancelled
- `adjustment_type_enum` — manual, damage, stocktake
- `adjustment_reason_enum` — damage, expired, theft, data_entry_error, stocktake_discrepancy, other

## New tables

- **stock_transfers** — header: `tenant_id`, `from_store_id`/`to_store_id` (→ `stores.store_id`),
  `from_branch_id`/`to_branch_id`, `status`, `reference_no`, `notes`, `created_by`,
  `shipped_by`/`received_by`, `shipped_at`/`received_at`, `auth_user_id`. Indexes on
  tenant, both stores, status.
- **stock_transfer_items** — `stock_transfer_id` (cascade), `product_variant_id`, `qty`, `unit_cost`.
- **stock_adjustments** — header: `tenant_id`, `store_id` (→ `stores.store_id`, cascade),
  `status`, `type`, `notes`, `created_by`, `approved_by`, `approved_at`, `auth_user_id`.
- **stock_adjustment_items** — `stock_adjustment_id` (cascade), `product_variant_id`,
  `qty_before`, `qty_after`, `qty_adjusted`, `unit_cost`, `reason`.

Prisma-only back-relations added to `stores`, `branches`, `product_variants` (no SQL emitted).

## Migrations

- `prisma/migrations/20260708100000_add_stock_transfers/migration.sql` — tables, indexes,
  `updated_at` trigger, RLS + policies, `inventory_allow_negative()` helper, `apply_stock_transfer()` RPC.
- `prisma/migrations/20260708110000_add_stock_adjustments/migration.sql` — enums, tables,
  indexes, trigger, RLS, `apply_stock_adjustment()` RPC.

> Note: this environment is kept in sync with `prisma db push`, which creates tables/enums/
> indexes from `schema.prisma` but not the raw-SQL functions/triggers/RLS. Those were applied
> idempotently on top. A clean environment applies the migration files directly.

## RPC apply semantics

- `apply_stock_transfer(p_transfer_id)`: lock header (idempotency + same-store guard),
  per item decrement source / weighted-avg upsert destination, write paired movements,
  recompute `product_variants.stock_quantity`, set `status='received'`.
- `apply_stock_adjustment(p_adjustment_id)`: per item resolve movement_type, apply
  `qty_adjusted` delta to the **live** balance (FR-005), value outflow at `avg_cost` (FR-006),
  enforce negative guard, rewrite item to reconciled values, set `status='approved'`.
- Both raise `ERRCODE='P0001'` with `CODE|detail`; the server fn maps codes to HTTP status.
