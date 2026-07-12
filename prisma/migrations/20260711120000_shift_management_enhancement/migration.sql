BEGIN;

-- =============================================================================
-- Shift Management Enhancement (specs/026-shift-management-enhancement)
-- - res_shifts: branch scoping, close-time snapshots (expected cash, variance),
--   frozen originals, review/correction flags, stale tracking.
-- - res_cash_movements: paid-in/paid-out during an open shift (uses the
--   previously orphaned cash_movement_*_enum types). Append-only, open-shift
--   guarded.
-- - res_shift_audit: append-only immutable audit trail of every shift action.
-- - res_shift_settings: tenant/branch-configurable variance + stale thresholds.
-- - SECURITY DEFINER functions: res_shift_expected_cash(), res_close_shift(),
--   res_shift_maintenance() (stale flag + auto-close, pg_cron every 15 min
--   with a lazy fallback call from the admin shifts endpoint).
-- =============================================================================

-- ── 1. res_shifts: new columns ───────────────────────────────────────────────

ALTER TABLE "res_shifts"
  ADD COLUMN "branch_id"              UUID,
  ADD COLUMN "expected_cash"          DECIMAL(12,2),
  ADD COLUMN "variance"               DECIMAL(12,2),
  ADD COLUMN "cash_sales_total"       DECIMAL(12,2),
  ADD COLUMN "movements_in_total"     DECIMAL(12,2),
  ADD COLUMN "movements_out_total"    DECIMAL(12,2),
  ADD COLUMN "original_closing_cash"  DECIMAL(12,2),
  ADD COLUMN "original_variance"      DECIMAL(12,2),
  ADD COLUMN "variance_comment"       TEXT,
  ADD COLUMN "close_reason"           TEXT,
  ADD COLUMN "closed_by_user_id"      UUID,
  ADD COLUMN "needs_review"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewed_by"            UUID,
  ADD COLUMN "reviewed_at"            TIMESTAMPTZ(6),
  ADD COLUMN "is_corrected"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stale_notified_at"      TIMESTAMPTZ(6);

ALTER TABLE "res_shifts"
  ADD CONSTRAINT "res_shifts_branch_id_fkey" FOREIGN KEY ("branch_id")
    REFERENCES "branches" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "res_shifts"
  ADD CONSTRAINT "chk_res_shifts_status"
    CHECK (status IN ('open', 'closed', 'force_closed', 'auto_closed'));

CREATE INDEX "idx_res_shifts_branch_id" ON "res_shifts" ("branch_id");
CREATE INDEX "idx_res_shifts_opened_at" ON "res_shifts" ("opened_at");
CREATE INDEX "idx_res_shifts_needs_review" ON "res_shifts" ("needs_review")
  WHERE needs_review;

-- Data fix BEFORE the unique index: close historical duplicate-open shifts,
-- keeping the newest open shift per user.
UPDATE "res_shifts" s
SET status       = 'auto_closed',
    close_reason = 'migration: duplicate open shift',
    needs_review = true,
    closed_at    = now()
WHERE s.status = 'open'
  AND EXISTS (
    SELECT 1 FROM "res_shifts" n
    WHERE n.auth_user_id = s.auth_user_id
      AND n.status = 'open'
      AND n.opened_at > s.opened_at
  );

-- Concurrency guard: one active shift per employee.
CREATE UNIQUE INDEX "uq_res_shifts_one_open_per_user"
  ON "res_shifts" ("auth_user_id") WHERE status = 'open';

-- ── 2. res_cash_movements ────────────────────────────────────────────────────

CREATE TABLE "res_cash_movements" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "shift_id"      UUID NOT NULL,
  "branch_id"     UUID,
  "movement_type" "cash_movement_type_enum" NOT NULL,
  "reason"        "cash_movement_reason_enum" NOT NULL,
  "amount"        DECIMAL(12,2) NOT NULL,
  "note"          TEXT,
  "order_id"      UUID,
  "created_by"    UUID,
  "auth_user_id"  UUID DEFAULT auth.uid(),
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "res_cash_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_res_cash_movements_amount" CHECK (amount > 0),
  CONSTRAINT "res_cash_movements_shift_id_fkey" FOREIGN KEY ("shift_id")
    REFERENCES "res_shifts" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "res_cash_movements_order_id_fkey" FOREIGN KEY ("order_id")
    REFERENCES "res_orders" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "idx_res_cash_movements_shift_id" ON "res_cash_movements" ("shift_id");
CREATE INDEX "idx_res_cash_movements_created_at" ON "res_cash_movements" ("created_at");

-- Movements only on open shifts; append-only. FOR UPDATE on the parent shift
-- serializes movement inserts against a concurrent close.
CREATE OR REPLACE FUNCTION "res_cash_movements_guard"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'res_cash_movements is append-only';
  END IF;
  PERFORM 1 FROM res_shifts WHERE id = NEW.shift_id AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'shift_not_open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_res_cash_movements_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "res_cash_movements"
  FOR EACH ROW EXECUTE FUNCTION "res_cash_movements_guard"();

-- ── 3. res_shift_audit (append-only, immutable) ──────────────────────────────

CREATE TABLE "res_shift_audit" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "shift_id"      UUID NOT NULL,
  "actor_user_id" UUID,
  "action"        VARCHAR(40) NOT NULL,
  "old_values"    JSONB,
  "new_values"    JSONB,
  "reason"        TEXT,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "res_shift_audit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_res_shift_audit_action" CHECK (action IN (
    'opened', 'closed', 'force_closed', 'auto_closed', 'corrected',
    'movement_added', 'reviewed', 'stale_flagged', 'settings_changed'
  )),
  CONSTRAINT "res_shift_audit_shift_id_fkey" FOREIGN KEY ("shift_id")
    REFERENCES "res_shifts" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "idx_res_shift_audit_shift_id" ON "res_shift_audit" ("shift_id");
CREATE INDEX "idx_res_shift_audit_created_at" ON "res_shift_audit" ("created_at");

CREATE OR REPLACE FUNCTION "res_shift_audit_immutable"() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'res_shift_audit is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_res_shift_audit_immutable"
  BEFORE UPDATE OR DELETE ON "res_shift_audit"
  FOR EACH ROW EXECUTE FUNCTION "res_shift_audit_immutable"();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE UPDATE, DELETE ON "res_shift_audit" FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE UPDATE, DELETE ON "res_shift_audit" FROM anon;
  END IF;
END $$;

-- ── 4. res_shift_settings ────────────────────────────────────────────────────

CREATE TABLE "res_shift_settings" (
  "id"                             UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id"                  VARCHAR(255) NOT NULL,
  "branch_id"                      UUID,
  "variance_threshold"             DECIMAL(12,2) NOT NULL DEFAULT 10.00,
  "require_comment_over_threshold" BOOLEAN NOT NULL DEFAULT true,
  "stale_shift_hours"              INTEGER NOT NULL DEFAULT 12,
  "auto_close_hours"               INTEGER NOT NULL DEFAULT 24,
  "updated_by"                     UUID,
  "created_at"                     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"                     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "res_shift_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_res_shift_settings_hours"
    CHECK (stale_shift_hours >= 1 AND auto_close_hours > stale_shift_hours)
);

-- One settings row per (restaurant, branch); NULL branch = restaurant default.
CREATE UNIQUE INDEX "uq_res_shift_settings_scope"
  ON "res_shift_settings"
  ("restaurant_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::uuid));

-- ── 5. Row level security ────────────────────────────────────────────────────

-- res_shifts: clients may only update their OWN OPEN shift (legacy
-- direct-supabase close keeps working; closed rows become client-immutable).
-- The existing UPDATE policies were created outside migration history, so drop
-- whatever is there defensively.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'res_shifts' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON "res_shifts"', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "res_shifts_update_own_open" ON "res_shifts"
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() AND status = 'open')
  WITH CHECK (auth_user_id = auth.uid());

ALTER TABLE "res_cash_movements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_cash_movements_select_own" ON "res_cash_movements"
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
-- No client INSERT/UPDATE/DELETE policies: writes go through service-role
-- server fns only.

ALTER TABLE "res_shift_audit" ENABLE ROW LEVEL SECURITY;
-- No client policies at all: audit is server-only.

ALTER TABLE "res_shift_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_shift_settings_select" ON "res_shift_settings"
  FOR SELECT TO authenticated
  USING (true);
-- Writes are server-only (shifts.manage behind /api).

-- ── 6. Notification fan-out helper ───────────────────────────────────────────

-- Inserts one res_notifications row per admin/super_admin user. recipient_id
-- is text in res_notifications, storing the auth uid.
CREATE OR REPLACE FUNCTION "res_shift_notify_admins"(
  p_type    VARCHAR,
  p_title   VARCHAR,
  p_message TEXT,
  p_data    JSONB
) RETURNS void AS $$
BEGIN
  INSERT INTO res_notifications (recipient_id, type, title, message, data)
  SELECT DISTINCT tu.auth_user_id::text, p_type, p_title, p_message, p_data
  FROM tenant_users tu
  JOIN user_roles ur ON ur.auth_user_id = tu.id
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name IN ('admin', 'super_admin')
    AND tu.auth_user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Expected-cash + close functions ───────────────────────────────────────

CREATE OR REPLACE FUNCTION "res_shift_expected_cash"(p_shift_id UUID)
RETURNS TABLE (
  expected   DECIMAL(12,2),
  cash_sales DECIMAL(12,2),
  mov_in     DECIMAL(12,2),
  mov_out    DECIMAL(12,2)
) AS $$
  SELECT (COALESCE(s.opening_cash, 0)
          + COALESCE(o.cash_sales, 0)
          + COALESCE(m.mov_in, 0)
          - COALESCE(m.mov_out, 0))::DECIMAL(12,2),
         COALESCE(o.cash_sales, 0)::DECIMAL(12,2),
         COALESCE(m.mov_in, 0)::DECIMAL(12,2),
         COALESCE(m.mov_out, 0)::DECIMAL(12,2)
  FROM res_shifts s
  LEFT JOIN LATERAL (
    SELECT SUM(total_amount) AS cash_sales
    FROM res_orders
    WHERE shift_id = s.id AND status = 'paid' AND payment_method = 'cash'
  ) o ON true
  LEFT JOIN LATERAL (
    SELECT SUM(amount) FILTER (WHERE movement_type = 'in')  AS mov_in,
           SUM(amount) FILTER (WHERE movement_type = 'out') AS mov_out
    FROM res_cash_movements
    WHERE shift_id = s.id
  ) m ON true
  WHERE s.id = p_shift_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Atomic close. p_mode: closed | force_closed | auto_closed.
-- p_counted NULL (auto-close): closing_cash and variance stay NULL and the
-- shift is flagged for review instead of reconciled.
CREATE OR REPLACE FUNCTION "res_close_shift"(
  p_shift_id UUID,
  p_actor    UUID,
  p_counted  DECIMAL(12,2),
  p_comment  TEXT DEFAULT NULL,
  p_mode     VARCHAR DEFAULT 'closed',
  p_reason   TEXT DEFAULT NULL
) RETURNS res_shifts AS $$
DECLARE
  v_shift     res_shifts;
  v_exp       RECORD;
  v_variance  DECIMAL(12,2);
  v_threshold DECIMAL(12,2);
  v_require   BOOLEAN;
  v_over      BOOLEAN;
BEGIN
  IF p_mode NOT IN ('closed', 'force_closed', 'auto_closed') THEN
    RAISE EXCEPTION 'invalid_close_mode';
  END IF;

  SELECT * INTO v_shift FROM res_shifts
  WHERE id = p_shift_id AND status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'shift_not_open';
  END IF;

  SELECT * INTO v_exp FROM res_shift_expected_cash(p_shift_id);
  v_variance := CASE WHEN p_counted IS NULL THEN NULL
                     ELSE p_counted - v_exp.expected END;

  SELECT variance_threshold, require_comment_over_threshold
  INTO v_threshold, v_require
  FROM res_shift_settings
  WHERE restaurant_id = COALESCE(v_shift.restaurant_id, '')
    AND (branch_id = v_shift.branch_id OR branch_id IS NULL)
  ORDER BY branch_id NULLS LAST
  LIMIT 1;
  v_threshold := COALESCE(v_threshold, 10.00);
  v_over := v_variance IS NOT NULL AND ABS(v_variance) > v_threshold;

  IF p_mode = 'closed' AND COALESCE(v_require, true) AND v_over
     AND COALESCE(NULLIF(TRIM(p_comment), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'variance_comment_required';
  END IF;

  UPDATE res_shifts SET
    status                = p_mode,
    closed_at             = now(),
    closed_by_user_id     = p_actor,
    closing_cash          = p_counted,
    expected_cash         = v_exp.expected,
    variance              = v_variance,
    cash_sales_total      = v_exp.cash_sales,
    movements_in_total    = v_exp.mov_in,
    movements_out_total   = v_exp.mov_out,
    original_closing_cash = p_counted,
    original_variance     = v_variance,
    variance_comment      = p_comment,
    close_reason          = p_reason,
    needs_review          = (p_mode <> 'closed') OR v_over
  WHERE id = p_shift_id AND status = 'open'
  RETURNING * INTO v_shift;

  INSERT INTO res_shift_audit (shift_id, actor_user_id, action, old_values, new_values, reason)
  VALUES (
    p_shift_id, p_actor, p_mode,
    jsonb_build_object('status', 'open'),
    jsonb_build_object(
      'status', p_mode,
      'closing_cash', p_counted,
      'expected_cash', v_exp.expected,
      'variance', v_variance
    ),
    COALESCE(p_reason, p_comment)
  );

  IF p_mode = 'closed' AND v_over THEN
    PERFORM res_shift_notify_admins(
      'shift_high_variance',
      'Shift closed with high variance',
      'Shift closed by ' || COALESCE(v_shift.opened_by, 'unknown')
        || ' has a cash variance of ' || v_variance::text || '.',
      jsonb_build_object('shift_id', p_shift_id, 'variance', v_variance)
    );
  END IF;

  RETURN v_shift;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Stale-flag + auto-close maintenance ───────────────────────────────────

CREATE OR REPLACE FUNCTION "res_shift_maintenance"() RETURNS void AS $$
DECLARE
  v_stale RECORD;
  v_auto  RECORD;
BEGIN
  -- Threshold-1: flag + notify once per shift. Tenants without a settings row
  -- fall back to the defaults (12h stale / 24h auto-close).
  FOR v_stale IN
    UPDATE res_shifts s SET stale_notified_at = now()
    WHERE s.status = 'open'
      AND s.stale_notified_at IS NULL
      AND s.opened_at < now() - make_interval(hours => COALESCE((
            SELECT cfg.stale_shift_hours FROM res_shift_settings cfg
            WHERE cfg.restaurant_id = COALESCE(s.restaurant_id, '')
              AND (cfg.branch_id = s.branch_id OR cfg.branch_id IS NULL)
            ORDER BY cfg.branch_id NULLS LAST LIMIT 1
          ), 12))
    RETURNING s.id, s.opened_by, s.opened_at
  LOOP
    INSERT INTO res_shift_audit (shift_id, actor_user_id, action, new_values)
    VALUES (v_stale.id, NULL, 'stale_flagged',
            jsonb_build_object('opened_at', v_stale.opened_at));
    PERFORM res_shift_notify_admins(
      'shift_stale',
      'Shift open too long',
      'Shift opened by ' || COALESCE(v_stale.opened_by, 'unknown')
        || ' has been open beyond the configured threshold.',
      jsonb_build_object('shift_id', v_stale.id, 'opened_at', v_stale.opened_at)
    );
  END LOOP;

  -- Threshold-2: auto-close.
  FOR v_auto IN
    SELECT s.id, s.opened_by
    FROM res_shifts s
    WHERE s.status = 'open'
      AND s.opened_at < now() - make_interval(hours => COALESCE((
            SELECT cfg.auto_close_hours FROM res_shift_settings cfg
            WHERE cfg.restaurant_id = COALESCE(s.restaurant_id, '')
              AND (cfg.branch_id = s.branch_id OR cfg.branch_id IS NULL)
            ORDER BY cfg.branch_id NULLS LAST LIMIT 1
          ), 24))
  LOOP
    PERFORM res_close_shift(
      v_auto.id, NULL, NULL, NULL, 'auto_closed',
      'auto-closed: exceeded max open duration'
    );
    PERFORM res_shift_notify_admins(
      'shift_auto_closed',
      'Shift auto-closed',
      'Shift opened by ' || COALESCE(v_auto.opened_by, 'unknown')
        || ' was auto-closed after exceeding the maximum open duration.',
      jsonb_build_object('shift_id', v_auto.id)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pg_cron registration, guarded for environments without the extension.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'res_shift_maintenance', '*/15 * * * *', 'SELECT res_shift_maintenance()'
    );
  END IF;
END $$;

COMMIT;
