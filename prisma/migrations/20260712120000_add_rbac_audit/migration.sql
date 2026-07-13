-- Feature 027 Part 8: append-only RBAC change log.
CREATE TABLE IF NOT EXISTS "rbac_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_auth_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" VARCHAR(255) NOT NULL,
    "diff" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "rbac_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_rbac_audit_created_at" ON "rbac_audit" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_rbac_audit_target" ON "rbac_audit" ("target_type", "target_id");
