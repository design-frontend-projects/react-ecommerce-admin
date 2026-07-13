-- =============================================================================
-- Extend movement_type_enum with ERP movement types (manufacturing, cycle
-- counts, loss/found, reservation conversion). VALUES ONLY in this migration:
-- Postgres forbids USING an enum value added inside the same transaction, so
-- the functions that consume these values live in the later movement-engine
-- migration (20260713100000). Do not merge the two.
-- =============================================================================

ALTER TYPE "movement_type_enum" ADD VALUE IF NOT EXISTS 'production_output';
ALTER TYPE "movement_type_enum" ADD VALUE IF NOT EXISTS 'production_consumption';
ALTER TYPE "movement_type_enum" ADD VALUE IF NOT EXISTS 'lost';
ALTER TYPE "movement_type_enum" ADD VALUE IF NOT EXISTS 'found';
ALTER TYPE "movement_type_enum" ADD VALUE IF NOT EXISTS 'cycle_count_in';
ALTER TYPE "movement_type_enum" ADD VALUE IF NOT EXISTS 'cycle_count_out';
ALTER TYPE "movement_type_enum" ADD VALUE IF NOT EXISTS 'reservation_conversion';
