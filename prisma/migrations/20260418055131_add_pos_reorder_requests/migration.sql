BEGIN;

CREATE TABLE "pos_reorder_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clerk_user_id" VARCHAR(255) NOT NULL DEFAULT clerk_user_id(),
  "product_id" INTEGER NOT NULL,
  "product_variant_id" UUID,
  "requested_by_clerk_user_id" VARCHAR(255) NOT NULL,
  "requested_by_name" VARCHAR(255) NOT NULL,
  "requested_by_role" VARCHAR(100),
  "requested_quantity" INTEGER,
  "requested_min_stock" INTEGER,
  "status" "reorder_request_status" NOT NULL DEFAULT 'pending',
  "read_by_clerk_user_id" VARCHAR(255),
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "pos_reorder_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_reorder_requests_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products" ("product_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "pos_reorder_requests_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "idx_pos_reorder_requests_tenant_status_created"
  ON "pos_reorder_requests" ("clerk_user_id", "status", "created_at");

CREATE INDEX "idx_pos_reorder_requests_requester_status"
  ON "pos_reorder_requests" ("requested_by_clerk_user_id", "status");

CREATE INDEX "idx_pos_reorder_requests_product"
  ON "pos_reorder_requests" ("product_id");

CREATE INDEX "idx_pos_reorder_requests_variant"
  ON "pos_reorder_requests" ("product_variant_id");

CREATE UNIQUE INDEX "uq_pos_reorder_requests_pending_base_product"
  ON "pos_reorder_requests" (
    "clerk_user_id",
    "requested_by_clerk_user_id",
    "product_id"
  )
  WHERE "status" = 'pending' AND "product_variant_id" IS NULL;

CREATE UNIQUE INDEX "uq_pos_reorder_requests_pending_variant"
  ON "pos_reorder_requests" (
    "clerk_user_id",
    "requested_by_clerk_user_id",
    "product_id",
    "product_variant_id"
  )
  WHERE "status" = 'pending' AND "product_variant_id" IS NOT NULL;

CREATE OR REPLACE FUNCTION "set_pos_reorder_requests_updated_at"()
RETURNS TRIGGER
AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_pos_reorder_requests_updated_at"
BEFORE UPDATE ON "pos_reorder_requests"
FOR EACH ROW
EXECUTE FUNCTION "set_pos_reorder_requests_updated_at"();

ALTER TABLE "pos_reorder_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_reorder_requests_insert_own"
  ON "pos_reorder_requests"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "clerk_user_id" = clerk_user_id()
    AND "requested_by_clerk_user_id" = clerk_user_id()
  );

CREATE POLICY "pos_reorder_requests_select_admin"
  ON "pos_reorder_requests"
  FOR SELECT
  TO authenticated
  USING (
    "clerk_user_id" = clerk_user_id()
    AND (auth.jwt() -> 'public_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

CREATE POLICY "pos_reorder_requests_select_own"
  ON "pos_reorder_requests"
  FOR SELECT
  TO authenticated
  USING (
    "clerk_user_id" = clerk_user_id()
    AND "requested_by_clerk_user_id" = clerk_user_id()
  );

CREATE POLICY "pos_reorder_requests_update_admin"
  ON "pos_reorder_requests"
  FOR UPDATE
  TO authenticated
  USING (
    "clerk_user_id" = clerk_user_id()
    AND (auth.jwt() -> 'public_metadata' ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    "clerk_user_id" = clerk_user_id()
    AND (auth.jwt() -> 'public_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

COMMIT;
