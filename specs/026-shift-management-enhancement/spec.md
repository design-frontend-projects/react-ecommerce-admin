# Feature Specification: Shift Management Enhancement

**Feature Branch**: `026-shift-management-enhancement`
**Created**: 2026-07-11
**Status**: Design approved — ready for implementation
**Supersedes**: `002-shifts-module-enhancement` (basic open/close, implemented)
**Input**: Stakeholder spec — mandatory shift open/close around login/logout, cash
reconciliation with expected-vs-counted variance, cash movements, staffing
visibility, analytics, and admin/super_admin oversight with an immutable audit log.

## Objective

Every employee who handles cash must open a shift (opening float) before using
the restaurant POS and close it (counted cash) before signing out. The system
computes expected cash server-side (opening + cash sales + paid-ins − paid-outs),
persists the variance at close, supports intermediate cash movements, gives
admins full oversight (search, force-close, corrections, audit trail, live
"who's working" view, analytics), and flags/auto-closes abandoned shifts.

## Scope decisions (resolved with stakeholder, 2026-07-11)

| Open question | Decision |
|---|---|
| POS surface | **Restaurant POS (respos) only.** Retail POS (`sales_invoices`/`transactions`) shift-awareness deferred to a future feature. |
| Cash movements (paid-in/paid-out/safe drop) | **In scope.** New `res_cash_movements` table using the already-staged `cash_movement_type_enum` / `cash_movement_reason_enum`. |
| Shift key | **One active shift per employee**, branch-tagged (`res_shifts.branch_id`). No register/till linkage this iteration (`pos_terminals` stays unlinked). |
| Abandoned shifts | **Flag then auto-close.** Threshold 1 (default 12h): flag + notify admins. Threshold 2 (default 24h): auto-close with `status='auto_closed'`, `needs_review=true`. Both tenant-configurable. Mechanism: **pg_cron** every 15 min + lazy fallback invocation from the admin list endpoint. |
| Variance threshold | Tenant-configurable in new `res_shift_settings` table (default 10.00, optional per-branch override). Above threshold → comment required at close (server-enforced). |
| Corrections | Closed shift row holds **effective** values; **original** close values frozen in `original_closing_cash`/`original_variance` columns; every correction appends an immutable `res_shift_audit` row (old/new + mandatory reason). No employee acknowledgment required; owner is notified. |
| Force-close | Unilateral by admin, mandatory reason, owner notified. |
| Multi-currency | **Out of scope** — single currency per tenant assumed (matches current `res_orders` money handling). |
| Time zones | Store `timestamptz` (already the convention); analytics bucket in the viewer's locale. Per-branch TZ config deferred. |

## Actors & Permissions

Three new permissions in the existing `resource.action` catalog
(`BASE_PERMISSION_DEFINITIONS`, lazily seeded — no migration needed):

| Permission | Meaning | Default grants |
|---|---|---|
| `shifts.use` | Open/close own shift, record cash movements on own shift | cashier, captain, staff, manager, admin |
| `shifts.view` | View all shifts, live staffing, analytics | manager, admin |
| `shifts.manage` | Force-close, correct, review shifts; manage shift settings | admin (super_admin via `*` wildcard) |

- Kitchen role gets none (no cash handling) and is **not** gated.
- Enforcement gate applies to users with `shifts.use` but **without**
  `shifts.manage` (admins exempt but may open shifts voluntarily).
- Existing role-name checks (`user?.role === 'admin'`, cashier checks in the
  sign-out dialog and enforcement gate) migrate to permission checks.
- super_admin/platform scope follows the existing model: `*` wildcard +
  `profiles.system_owner`.

## Functional Requirements

### FR-1 Shift lifecycle
- **Open**: employee submits opening cash (pre-filled/lockable to previous
  shift's closing cash — existing behavior kept) + branch (from
  `selectedBranchId`). Server inserts with actor's `auth_user_id`; a partial
  unique index guarantees one open shift per employee (concurrent open → 409).
- **Active**: `res_orders.shift_id` linkage unchanged (already implemented,
  including offline order queue carrying `shift_id`).
- **Close**: employee submits counted cash. Postgres function
  `res_close_shift()` atomically computes expected cash and variance
  (Decimal, `FOR UPDATE` race-safe), enforces the variance-comment rule,
  snapshots totals onto the row, freezes originals, writes the audit row.
- Closed rows are client-immutable (RLS `UPDATE` policy limited to own **open**
  shifts). Admin corrections only via service-role server fn.

### FR-2 Mandatory enforcement
- On entering `/respos/*` without an open shift: existing non-dismissible
  `OpenShiftDialog` gate, predicate switched from `isCashier` to the
  permission rule above.
- On sign-out with an open shift: existing sign-out gate, same predicate; close
  dialog upgraded to show live Expected / Counted / Variance and require a
  comment when over threshold.
- Abandoned sessions (token expiry, crash): handled server-side by
  `res_shift_maintenance()` (flag → notify → auto-close). Re-login with a
  still-open shift simply passes the gate.
- **Offline policy**: shift open/close/force-close/movements require online
  (they hit `/api`). Close is blocked while offline orders are pending sync
  (expected cash would be wrong otherwise). Order creation offline is unchanged.

### FR-3 Cash management
- `res_cash_movements`: type in/out, reason (income, expense, payout,
  adjustment, customer_payment, supplier_payment), amount > 0, note. Insertable
  only while the parent shift is open (trigger, `FOR UPDATE` on parent —
  serializes against close). Append-only.
- Expected cash = `opening_cash + cash sales (paid res_orders with
  payment_method='cash') + Σ movements in − Σ movements out`, computed by
  `res_shift_expected_cash()` in SQL. All money math is Postgres
  `DECIMAL(12,2)`; the client transports money as **decimal strings**, never
  floats.

### FR-4 Staffing visibility
- "Who's working now": all open shifts with employee, branch, opened-at,
  elapsed time, stale badge (computed on read). Live via a `res_shifts`
  `postgres_changes` subscription added to the existing
  `useResposRealtime` channel.

### FR-5 Analytics (admin, `shifts.view`)
1. Shift duration trends (avg/median per day; excludes auto-closed).
2. Cash variance trends per employee / per branch over time.
3. Staffing coverage heat-grid (headcount by hour × weekday).
4. Top variance offenders (Σ|variance|, count over threshold, drill-down).
All aggregations run server-side (`$queryRaw`), rendered with Recharts
following the `src/features/pos/components/shift-dashboard.tsx` pattern.

### FR-6 Admin management
- Search/filter all shifts (status, employee, branch, date range, needs-review).
- Force-close with mandatory reason (≥5 chars) → owner notified.
- Correct a closed shift's amounts with mandatory reason → variance recomputed
  from the **close-time snapshot** of expected cash, `is_corrected=true`,
  audit row with old/new values.
- Mark reviewed (`needs_review` → false, reviewed_by/at, audit row).
- Per-shift audit timeline (open → close → corrections chain, originals shown).

### FR-7 Audit log
- Dedicated `res_shift_audit` table (not the generic `audit_logs` — that table
  requires a profile FK + `activity_types` seeding and lacks append-only
  enforcement). Actions: opened, closed, force_closed, auto_closed, corrected,
  movement_added, reviewed, stale_flagged.
- Immutability enforced twice: BEFORE UPDATE/DELETE trigger raising, plus
  `REVOKE UPDATE, DELETE` from client roles.

### FR-8 Notifications
`res_notifications` rows (+ existing realtime dropdown) for: `shift_stale`,
`shift_auto_closed`, `shift_high_variance`, `shift_force_closed`. Admin
recipients resolved per-user (the dropdown filters by `recipient_id`, so one
row per admin recipient, resolved via `user_roles`/`roles`).

## Non-functional requirements
- Additive-only migration; legacy direct-supabase open/close keeps working
  between phases (rollout safety is a hard requirement).
- Tenant isolation via existing RLS conventions (`auth_user_id DEFAULT
  auth.uid()`); privileged reads/writes go through `/api` + `requireAuth`.
- Real-time admin dashboards via the existing Supabase Realtime pattern.
- Money precision: Decimal end-to-end; no JS float arithmetic on money.

## Assumptions (flagged, not blocking)
1. `restaurant_id` (VarChar) remains the tenant key on `res_shifts` for
   continuity; `branch_id` is the new structural scope. A future migration may
   normalize `restaurant_id`.
2. Cash sales detection keys off `res_orders.payment_method = 'cash'` and
   `status = 'paid'`. Mixed/split tenders are out of scope (no per-tender
   payment table exists).
3. pg_cron is available on the Supabase project; the migration guards
   registration so environments without it don't fail (lazy fallback covers
   them functionally).
