-- =============================================================================
-- Migration: 20260918234500_purchase_order_lifecycle_rpcs
-- Description: Modern multi-tenant Purchase Order lifecycle RPC
--   - set_purchase_order_status: draft -> approved -> sent -> partially_received -> received -> closed (or cancelled)
-- =============================================================================

-- Ensure enum po_lifecycle_status_enum exists
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'po_lifecycle_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "po_lifecycle_status_enum" AS ENUM
      ('draft', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled');
  END IF;
END $do$;

-- 1. set_purchase_order_status
CREATE OR REPLACE FUNCTION public.set_purchase_order_status(
  p_po_id uuid,
  p_status po_lifecycle_status_enum
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po     purchase_orders%ROWTYPE;
  v_caller uuid := auth.uid();
  v_from   po_lifecycle_status_enum;
  v_ok     boolean;
BEGIN
  -- 1. Lock the purchase order record by ID
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO_NOT_FOUND|Purchase order % not found', p_po_id USING ERRCODE = 'P0001';
  END IF;

  v_from := COALESCE(v_po.lifecycle_status, 'draft');

  -- 2. Validate state machine transition
  v_ok := CASE
    WHEN p_status = v_from THEN true                                            -- idempotent no-op
    WHEN v_from = 'draft'              AND p_status IN ('approved', 'cancelled') THEN true
    WHEN v_from = 'approved'           AND p_status IN ('sent', 'cancelled') THEN true
    WHEN v_from = 'sent'               AND p_status IN ('partially_received', 'received', 'cancelled') THEN true
    WHEN v_from = 'partially_received' AND p_status IN ('received', 'closed', 'cancelled') THEN true
    WHEN v_from = 'received'           AND p_status IN ('closed', 'cancelled') THEN true
    ELSE false
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'PO_INVALID_TRANSITION|Cannot transition purchase order from % to %', v_from, p_status USING ERRCODE = 'P0001';
  END IF;

  -- 3. Apply updates
  UPDATE purchase_orders
    SET lifecycle_status = p_status,
        status           = p_status::text,
        approved_by      = CASE WHEN p_status = 'approved' THEN COALESCE(approved_by, v_caller::text) ELSE approved_by END,
        approved_at      = CASE WHEN p_status = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
        sent_at          = CASE WHEN p_status = 'sent' THEN COALESCE(sent_at, now()) ELSE sent_at END,
        closed_at        = CASE WHEN p_status = 'closed' THEN COALESCE(closed_at, now()) ELSE closed_at END
    WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'po_id', p_po_id,
    'from', v_from,
    'to', p_status
  );
END;
$$;

-- 2. Grant permissions to PostgREST roles
GRANT EXECUTE ON FUNCTION public.set_purchase_order_status(uuid, po_lifecycle_status_enum) TO authenticated, service_role, anon;

-- 3. Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
