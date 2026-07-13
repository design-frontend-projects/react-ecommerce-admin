# Inventory / Warehouse ERP Architecture

_Last updated: 2026-07-13. Companion to the migrations `20260713010000` … `20260713150000`._

## Core principle

**Products define WHAT, warehouses define WHERE, business documents define WHY, inventory movements define HOW, and stock balances are the calculated result.**

`inventory_movements` is the single immutable ledger. No application code ever
writes `stock_balances`, `stock_by_location`, or the denormalized
`product_variants.stock_quantity` cache. All stock mutation flows through one
SQL primitive:

```
post_inventory_movement(p jsonb) → jsonb          -- the engine (SECURITY DEFINER)
apply_inventory_movements(p jsonb[], group_id)    -- batch wrapper, deadlock-safe ordering
```

Every document RPC (`apply_stock_adjustment`, `apply_stock_transfer`,
`post_goods_receipt`, `receive_purchase_order_items`, `adjust_stock_balance`,
`confirm_sales_order`, `fulfill_sales_order`, `cancel_sales_order`,
`post_stock_count`) is a thin orchestrator: it validates the document state
machine, loops its lines, delegates to the primitive, and flips the document
status. The engine itself:

1. Replays idempotently on `(tenant, idempotency_key)`.
2. Resolves direction from `movement_type` (in / out / reservation-only).
3. Enforces batch/serial tracking read from `products.is_batch_tracked` /
   `is_serial_tracked` (batch required on tracked physical moves, blocked and
   expired batches cannot issue, serial count must equal quantity, per-serial
   status transitions + `inventory_movement_serials` links).
4. Locks `stock_balances` FOR UPDATE (fixed lock order: balances →
   `stock_by_location`), captures `qty_before`/`qty_after` for the ledger row.
5. Applies the negative-stock guard: `sale` checks **qty_available**
   (reservations are honored); other out-types check `qty_on_hand`;
   `inventory_allow_negative(tenant, store)` remains the tenant override.
6. Applies moving weighted-average costing: inflow re-averages `avg_cost`,
   outflow is priced at the current `avg_cost` and the historical cost is
   preserved on the ledger row (`unit_cost`, `total_cost`).
7. Upserts `stock_by_location` (falling back to the store's default
   warehouse/zone via `ensure_default_location`), maintains
   `qty_available = qty_on_hand − qty_reserved`, and resyncs the variant cache.

### Reconciliation invariants

`inventory_reconcile(tenant, store?)` reports violations of:

| # | Invariant |
|---|-----------|
| 1 | `SUM(stock_by_location.qty_on_hand)` per (store, variant) == `stock_balances.qty_on_hand` |
| 2 | batch-level location sums == batch on-hand |
| 3 | COUNT(`product_serials` in_stock per store/variant) == on-hand for serial-tracked products |
| 4 | `product_variants.stock_quantity` == `round(SUM(stock_balances.qty_on_hand))` |
| 5 | `qty_available` == `qty_on_hand − qty_reserved` |

The Stock-by-Location screen surfaces a live Reconciled / Drift badge from this
report.

## Domain map

- **Warehouse** (`warehouses` → `warehouse_locations`, self-referential
  zone→rack→shelf→bin tree with materialized `path`). Warehouses sit *beside*
  stores: each store gets a default warehouse + default zone (backfilled), and
  `stock_balances` stays keyed on `store_id` for full backward compatibility.
  Bin-level truth lives in `stock_by_location`.
- **Catalog**: `brands`, `uoms` + `unit_conversions`, `product_barcodes`
  (multi-barcode with pack quantity), `bundle_components`,
  `products.product_type` (`simple|variant|bundle|service|composite`) and the
  tracking flags.
- **Tracking**: `product_batches` (expiry, per-batch status
  active/depleted/expired/blocked) and `product_serials` (7-state lifecycle),
  linked to the ledger via `inventory_movement_serials`.
- **Purchasing**: `purchase_requisitions` → `purchase_orders` (server-enforced
  lifecycle enum `draft→approved→sent→partially_received→received→closed`,
  one-way-synced to the legacy varchar status) → `goods_receipts` (the only
  thing that increases stock, when POSTED).
- **Sales**: `sales_orders` (`draft→confirmed→picking→packed→delivered→
  invoiced→completed`) + `stock_reservations`. Confirmation reserves
  (`reserved` movements → `qty_reserved`), fulfilment converts
  (`reservation_conversion` decrements both reserved and on-hand), invoicing
  creates the `sales_invoices` document with ledger-accurate COGS. POS sells
  direct (no reservation) through the same engine.
- **Counting**: `stock_counts` (`draft→counting→review→posted`) freeze a
  snapshot, capture counted quantities (blind-count supported), and post the
  variance **as a stocktake `stock_adjustments` document** — the count links to
  it via `posted_adjustment_id`. Location-scoped counts post
  `cycle_count_in/out` movements.
- **Replenishment**: `reorder_rules` (per variant × store: reorder point,
  min/max, safety stock, EOQ, lead time, preferred supplier) evaluated by
  `run_reorder_check` against `qty_available` + on-order PO lines →
  `reorder_suggestions` → convert to a requisition (`source='reorder_engine'`)
  → standard PO flow. This replaces the legacy `inventory`-table-based
  auto-reorder; the `inventory` table is deprecated and read-only.

## Multi-tenancy & security

Every new table carries `tenant_id UUID NOT NULL` + `auth_user_id UUID DEFAULT
auth.uid()` with an `_all_own` RLS policy (child tables via EXISTS on their
header). Server fns run through `requireAuth(token, permission)` →
`requireTenantId`. All engine RPCs are `SECURITY DEFINER` and therefore verify
`auth.uid()` against the tenant themselves; `post_inventory_movement` /
`apply_inventory_movements` / `ensure_default_location` are additionally
revoked from `anon`/`authenticated` and granted only to `service_role` — the
browser can never post raw movements.

Permission keys: `inventory.view/manage`, `purchasing.view/manage` (new),
`sales.view/manage` (new). Seeded via `src/features/users/data/rbac.ts`;
existing tenants' roles need a re-seed/backfill of the two new pairs.

## Write paths (after the refactor)

| Action | Path |
|---|---|
| Product wizard initial stock | `POST /api/inventory/opening-stock` → `apply_inventory_movements` (`opening_stock`, idempotent per variant×store). The wizard never writes `stock_quantity`. |
| POS checkout | Prisma tx writes invoice + `transactions` **+ `transaction_details`**, then one `apply_inventory_movements` call (`sale`, idempotency `pos:{invoice}:{variant}`); bundles explode via `bundle_components`, services skip. Engine failure compensates the invoice to `cancelled`. |
| PO receiving | `receive_purchase_order_items` (kept signature) now creates + posts a `goods_receipts` document behind the scenes. |
| Adjustments / transfers / counts / SO lifecycle | Document RPCs → engine. |
| Restaurant POS (respos) | **Deferred (ADR):** recipe-based depletion is manufacturing scope — `production_consumption` / `production_output` enum values and `movement_group_id` are already reserved for it. res_orders currently move no stock, unchanged. |

## Future-ready designs (not yet migrated)

- **Manufacturing**: `production_orders` + items; consume components via
  `production_consumption`, receive finished goods via `production_output`,
  both legs sharing a `movement_group_id`. Restaurant recipe depletion becomes
  a production order posted at order-paid time.
- **FIFO cost layers**: `inventory_cost_layers (store, variant, batch,
  received_movement_id, qty_original, qty_remaining, unit_cost,
  landed_cost_adjustment)`. Because every movement records `unit_cost` and
  `qty_before/after`, layers are reconstructible from the existing ledger when
  the valuation method switches.
- **Landed cost**: `landed_costs` + allocations hanging off `goods_receipts`,
  allocated by qty/value/weight, posted as cost-adjustment movements.

## Operational notes

- Migrations are additive-only; `20260713010000` adds enum values in its own
  file because Postgres cannot use a value added in the same transaction.
- Apply with `pnpm exec prisma migrate deploy`, then
  `pnpm exec prisma generate`.
- Legacy free-text `purchase_orders.status` is kept in sync one-way from
  `lifecycle_status` by trigger `trg_po_status_sync`; old readers keep working.
- The two RPCs the UI called but that never existed anywhere
  (`adjust_stock_balance`, `receive_purchase_order_items`) are now real,
  engine-backed, and committed in `20260713110000`.
