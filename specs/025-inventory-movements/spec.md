# Feature Specification: Inventory Movements Module

**Feature Branch**: `024-rbac-enhancements` (delivered alongside RBAC work)
**Created**: 2026-07-08
**Status**: Implemented
**Input**: "Build inventory movement tracking (inbound/outbound/transfers), enhance the
data models and relationships, and expose role-based, validated screens."

## Summary

Adds the two stock-write flows the ledger substrate did not yet have — **inter-store
Stock Transfers** and **batch Stock Adjustments** (manual / damaged-expired /
stocktake) — plus a read-only **Inventory Movements** audit view. Every stock change
lands in the existing `inventory_movements` ledger and updates `stock_balances` in a
single database transaction. Screens are gated by the existing `inventory.view` /
`inventory.manage` permissions and appear under the activity-gated `inventory` module.

## User Scenarios

### US1 — Inter-store Stock Transfer (P1)
As a store manager, I create a transfer from Store A to Store B with one or more
variants, then apply it. On apply, stock decrements at A and increments at B (weighted
average cost carried), and paired `transfer_out`/`transfer_in` movements are recorded.

### US2 — Manual / Damage / Stocktake Adjustment (P1)
As a manager, I create an adjustment of a given type:
- **manual** — signed delta per line;
- **damage** — positive write-off quantity per line with a reason (damage/expired/theft),
  cost loss valued at `avg_cost`;
- **stocktake** — physical counts per line; discrepancy = counted − system snapshot.
On apply, balances update and typed movements (`adjustment_in/out`, `damage`, `expired`)
are logged.

### US3 — Movements Ledger (P2)
As an auditor, I view every stock movement filtered by type, store, variant, reference,
and date — the complete audit trail.

## Requirements

- **FR-001**: Transfers and adjustments are created as `draft`, then applied atomically.
- **FR-002**: Applying updates `stock_balances.qty_on_hand`/`qty_available` and writes
  `inventory_movements` rows in one transaction (Postgres RPC, `SECURITY DEFINER`).
- **FR-003**: Transfers write paired `transfer_out` + `transfer_in` rows linked via
  `reference_type='stock_transfer'`, `reference_id=<id>`.
- **FR-004**: Damage/expired cost loss uses `stock_balances.avg_cost` (no override).
- **FR-005**: Stocktake reconciles by applying the captured discrepancy delta to the
  **current live** balance (interim sales preserved, not overwritten).
- **FR-006**: Negative-resulting stock is blocked unless the tenant enables
  `inventory.allow_negative_stock` (app_settings).
- **FR-007**: Apply is idempotent — an already-received/approved document cannot re-apply.
- **FR-008**: All endpoints enforce `requireAuth('inventory.view'|'inventory.manage')`.
- **FR-009**: New screens are registered in the screen registry and the sidebar under the
  `inventory` module; page mutations gated by `<Can permission="inventory.manage">`.
- **FR-010**: `product_variants.stock_quantity` (denormalized aggregate) is recomputed on
  every apply; `stock_balances` remains the source of truth.

## Success Criteria

- **SC-001**: 100% of transfers/adjustments update balances and ledger in one txn
  (verified by rolled-back DB smoke test — 20 assertions).
- **SC-002**: Ledger view lists all movements with type/store/variant/reference filters.
- **SC-003**: Cashier/manager access is permission-gated; server rejects unauthorized calls.
- **SC-004**: All migrations are additive; no existing behavior changes.

## Out of Scope (deferred)

- Two-phase ship/receive transfers (`shipped_*` columns reserved for a no-migration upgrade).
- Button-level `<CanAction>` gating and activity-type route redirects (owned by `024-rbac-enhancements`).
- CSV bulk import.
