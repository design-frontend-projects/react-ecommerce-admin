-- Migration: 20260909023000_set_stores_store_id_default
-- Description: AlterTable stores: add default gen_random_uuid() to store_id

ALTER TABLE "stores" ALTER COLUMN "store_id" SET DEFAULT gen_random_uuid();
