# Data Model: Shift Management Enhancement

**Migration**: `prisma/migrations/20260711120000_shift_management_enhancement/migration.sql`
(additive only, `BEGIN;`/`COMMIT;`, named constraints/indexes per repo convention)
plus matching `prisma/schema.prisma` model edits.

## Design decisions

- **`res_shifts.status` stays `VARCHAR(20)`** with a CHECK constraint adding
  `force_closed` / `auto_closed`. Converting to the orphan `shift_status` enum
  would require a column rewrite + coordinated deploy of every direct-supabase
  writer, and the enum lacks the new values. CHECK is additive and
  zero-disruption. The orphan enums ARE used where they fit natively:
  `res_cash_movements`.
- **Effective-values-on-row** correction model: the closed shift row always
  holds current effective values (keeps every list/analytics query one-table);
  originals are frozen once at close in `original_closing_cash` /
  `original_variance` and every change is audited. The alternative
  (corrections table holding effective values) forces a lateral join for the
  latest correction into every read path.
- **Close is a SECURITY DEFINER Postgres function** (`res_close_shift`) so
  expected-cash math, the variance-comment rule, snapshotting, and the audit
  row are atomic and Decimal-safe — same precedent as `apply_stock_transfer`
  (`20260708100000_add_stock_transfers`).

## 1. `res_shifts` — new columns

| Column | Type | Purpose |
|---|---|---|
| `branch_id` | UUID FK → `branches` | Branch scope (from `selectedBranchId`) |
| `expected_cash` | DECIMAL(12,2) | Snapshot at close |
| `variance` | DECIMAL(12,2) | `counted − expected` at close (negative = short); effective (updated by corrections) |
| `cash_sales_total` | DECIMAL(12,2) | Snapshot at close |
| `movements_in_total` / `movements_out_total` | DECIMAL(12,2) | Snapshots at close |
| `original_closing_cash` / `original_variance` | DECIMAL(12,2) | Frozen at close, never updated |
| `variance_comment` | TEXT | Required when \|variance\| > threshold |
| `close_reason` | TEXT | Force/auto-close reason |
| `closed_by_user_id` | UUID | Actor auth uid (differs from owner on force-close) |
| `needs_review` | BOOLEAN NOT NULL DEFAULT false | Set on force/auto-close or over-threshold variance |
| `reviewed_by` / `reviewed_at` | UUID / TIMESTAMPTZ(6) | Admin review sign-off |
| `is_corrected` | BOOLEAN NOT NULL DEFAULT false | Badge flag |
| `stale_notified_at` | TIMESTAMPTZ(6) | Dedupes the threshold-1 notification |

Constraints / indexes:

```sql
ALTER TABLE "res_shifts"
  ADD CONSTRAINT "res_shifts_branch_id_fkey" FOREIGN KEY ("branch_id")
    REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "res_shifts"
  ADD CONSTRAINT "chk_res_shifts_status"
    CHECK (status IN ('open','closed','force_closed','auto_closed'));
CREATE INDEX "idx_res_shifts_branch_id"    ON "res_shifts" ("branch_id");
CREATE INDEX "idx_res_shifts_opened_at"    ON "res_shifts" ("opened_at");
CREATE INDEX "idx_res_shifts_needs_review" ON "res_shifts" ("needs_review") WHERE needs_review;

-- Data fix BEFORE the unique index: close historical duplicate-open shifts
-- (keep newest open per user; older ones → auto_closed + needs_review)
UPDATE "res_shifts" s SET status = 'auto_closed',
       close_reason = 'migration: duplicate open shift',
       needs_review = true, closed_at = now()
WHERE s.status = 'open' AND EXISTS (
  SELECT 1 FROM "res_shifts" n
  WHERE n.auth_user_id = s.auth_user_id AND n.status = 'open'
    AND n.opened_at > s.opened_at);

-- Concurrency guard: one active shift per employee
CREATE UNIQUE INDEX "uq_res_shifts_one_open_per_user"
  ON "res_shifts" ("auth_user_id") WHERE status = 'open';
```

## 2. `res_cash_movements` (new — uses the staged orphan enums)

```sql
CREATE TABLE "res_cash_movements" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "shift_id"      UUID NOT NULL,
  "branch_id"     UUID,
  "movement_type" "cash_movement_type_enum" NOT NULL,      -- in | out
  "reason"        "cash_movement_reason_enum" NOT NULL,
  "amount"        DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  "note"          TEXT,
  "order_id"      UUID,                                    -- optional, unused this iteration
  "created_by"    UUID,
  "auth_user_id"  UUID DEFAULT auth.uid(),
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "res_cash_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "res_cash_movements_shift_id_fkey" FOREIGN KEY ("shift_id")
    REFERENCES "res_shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "res_cash_movements_order_id_fkey" FOREIGN KEY ("order_id")
    REFERENCES "res_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
CREATE INDEX "idx_res_cash_movements_shift_id"   ON "res_cash_movements" ("shift_id");
CREATE INDEX "idx_res_cash_movements_created_at" ON "res_cash_movements" ("created_at");
```

Guard trigger — movements only on **open** shifts, append-only, and the
`FOR UPDATE` on the parent serializes movement-insert against a concurrent
close (a movement cannot slip in mid-close):

```sql
CREATE OR REPLACE FUNCTION "res_cash_movements_guard"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'res_cash_movements is append-only';
  END IF;
  PERFORM 1 FROM res_shifts WHERE id = NEW.shift_id AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_open'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "trg_res_cash_movements_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "res_cash_movements"
  FOR EACH ROW EXECUTE FUNCTION "res_cash_movements_guard"();
```

## 3. `res_shift_audit` (new — append-only, immutable)

```sql
CREATE TABLE "res_shift_audit" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "shift_id"      UUID NOT NULL,
  "actor_user_id" UUID,      -- NULL for system (auto-close)
  "action"        VARCHAR(40) NOT NULL,
    -- opened | closed | force_closed | auto_closed | corrected
    -- | movement_added | reviewed | stale_flagged
  "old_values"    JSONB,
  "new_values"    JSONB,
  "reason"        TEXT,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "res_shift_audit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "res_shift_audit_shift_id_fkey" FOREIGN KEY ("shift_id")
    REFERENCES "res_shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "idx_res_shift_audit_shift_id"   ON "res_shift_audit" ("shift_id");
CREATE INDEX "idx_res_shift_audit_created_at" ON "res_shift_audit" ("created_at");

-- Immutability enforced twice
CREATE OR REPLACE FUNCTION "res_shift_audit_immutable"() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'res_shift_audit is immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "trg_res_shift_audit_immutable"
  BEFORE UPDATE OR DELETE ON "res_shift_audit"
  FOR EACH ROW EXECUTE FUNCTION "res_shift_audit_immutable"();
REVOKE UPDATE, DELETE ON "res_shift_audit" FROM authenticated, anon;
```

## 4. `res_shift_settings` (new — tenant thresholds)

Typed table rather than `app_settings` (which is a JSON blob keyed to one
`auth_user_id`, used for seed versioning — not tenant-shaped). DECIMAL-typed
thresholds are readable directly by the pg_cron function without JSON parsing.

```sql
CREATE TABLE "res_shift_settings" (
  "id"                             UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id"                  VARCHAR(255) NOT NULL,
  "branch_id"                      UUID,                    -- NULL = restaurant default
  "variance_threshold"             DECIMAL(12,2) NOT NULL DEFAULT 10.00,
  "require_comment_over_threshold" BOOLEAN NOT NULL DEFAULT true,
  "stale_shift_hours"              INT NOT NULL DEFAULT 12, -- threshold-1: flag + notify
  "auto_close_hours"               INT NOT NULL DEFAULT 24, -- threshold-2: auto close
  "updated_by"                     UUID,
  "updated_at"                     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "res_shift_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_res_shift_settings_scope"
  ON "res_shift_settings"
  ("restaurant_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::uuid));
```

## 5. RLS changes

- `res_shifts` INSERT policy: unchanged (legacy open keeps working).
- `res_shifts` UPDATE policy replaced: clients may update only **their own
  open** shift — legacy direct-supabase close keeps working until Phase 2;
  closed rows become client-immutable.

```sql
DROP POLICY IF EXISTS "res_shifts_update" ON "res_shifts";  -- adjust to actual policy name
CREATE POLICY "res_shifts_update_own_open" ON "res_shifts"
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() AND status = 'open')
  WITH CHECK (auth_user_id = auth.uid());
```

- `res_cash_movements`: ENABLE RLS; SELECT own rows (`auth_user_id = auth.uid()`);
  no client INSERT/UPDATE/DELETE policies (writes via service-role server fns).
- `res_shift_audit`: ENABLE RLS; no client policies (server-only).
- `res_shift_settings`: ENABLE RLS; SELECT for authenticated (close dialog needs
  the threshold); writes server-only.

## 6. SQL functions (SECURITY DEFINER)

### `res_shift_expected_cash(p_shift_id)`
Returns `(expected, cash_sales, mov_in, mov_out)`:

```sql
SELECT s.opening_cash
       + COALESCE(o.cash_sales, 0) + COALESCE(m.mov_in, 0) - COALESCE(m.mov_out, 0),
       COALESCE(o.cash_sales, 0), COALESCE(m.mov_in, 0), COALESCE(m.mov_out, 0)
FROM res_shifts s
LEFT JOIN LATERAL (
  SELECT SUM(total_amount) AS cash_sales FROM res_orders
  WHERE shift_id = s.id AND status = 'paid' AND payment_method = 'cash') o ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount) FILTER (WHERE movement_type = 'in')  AS mov_in,
         SUM(amount) FILTER (WHERE movement_type = 'out') AS mov_out
  FROM res_cash_movements WHERE shift_id = s.id) m ON true
WHERE s.id = p_shift_id;
```

### `res_close_shift(p_shift_id, p_actor, p_counted, p_comment, p_mode, p_reason)`
`p_mode ∈ ('closed','force_closed','auto_closed')`. Atomic close:

1. `SELECT ... FOR UPDATE WHERE status='open'` → else raise `shift_not_open`.
2. Compute expected via `res_shift_expected_cash`; `variance = counted − expected`
   (skipped/NULL when `p_counted IS NULL`, e.g. auto-close — `closing_cash`
   stays NULL and `needs_review=true` drives reconciliation).
3. Resolve threshold from `res_shift_settings` (branch override → restaurant
   default → 10.00). If `p_mode='closed'` and comment required and
   `|variance| > threshold` and no comment → raise `variance_comment_required`.
4. `UPDATE ... WHERE id AND status='open'`: status, closed_at, closed_by_user_id,
   closing_cash, expected_cash, variance, snapshots, `original_closing_cash`,
   `original_variance`, variance_comment, close_reason,
   `needs_review = (p_mode <> 'closed') OR |variance| > threshold`.
5. INSERT `res_shift_audit` row (action = p_mode, old/new values, reason).
6. RETURN the updated row.

### `res_shift_maintenance()`
Called by pg_cron every 15 min AND lazily from the admin shift-list server fn:

1. **Threshold-1 (stale)**: open shifts past `stale_shift_hours` with
   `stale_notified_at IS NULL` → stamp `stale_notified_at`, insert
   `res_notifications` rows (`type='shift_stale'`) — one per admin recipient,
   resolved via `user_roles`/`roles` join (the notifications dropdown filters
   by `recipient_id`).
2. **Threshold-2 (auto-close)**: open shifts past `auto_close_hours` →
   `res_close_shift(id, NULL, NULL, NULL, 'auto_closed', 'auto-closed: exceeded max open duration')`
   + `shift_auto_closed` notifications.

pg_cron registration is guarded so environments without the extension don't
fail the migration:

```sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('res_shift_maintenance', '*/15 * * * *',
                          'SELECT res_shift_maintenance()');
  END IF;
END $$;
```

## 7. Corrections (no SQL function)

Admin corrections run through the service-role server fn
(`src/server/fns/shifts.ts` → Prisma transaction): assert status ≠ 'open' →
update effective fields, recompute `variance = closing_cash − expected_cash`
from the **stored close-time snapshot** (never recomputed from live orders),
set `is_corrected=true` → insert `corrected` audit row with old/new JSONB +
mandatory reason. Clients can never reach closed rows (RLS), so no SQL-side
guard is needed.

## 8. `schema.prisma` deltas

- `res_shifts`: add the §1 columns + `branches` relation +
  `res_cash_movements[]` / `res_shift_audit[]` back-relations.
- New models: `res_cash_movements` (wires `cash_movement_type_enum`,
  `cash_movement_reason_enum`), `res_shift_audit`, `res_shift_settings` —
  snake_case, `/// This model contains row level security` doc comments,
  `@@index` maps matching the SQL above.
- Run `pnpm exec prisma generate` after (client outputs to `src/generated/prisma/`).
