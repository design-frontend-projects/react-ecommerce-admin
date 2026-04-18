BEGIN;

CREATE TYPE "shipment_status_enum" AS ENUM (
  'prepared',
  'pending',
  'approved',
  'in_transit',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
  'delayed',
  'refundable'
);

UPDATE "shipments"
SET "status" = 'prepared'
WHERE "status" IS NULL
   OR lower(replace(trim("status"), ' ', '_')) NOT IN (
     'prepared',
     'pending',
     'approved',
     'in_transit',
     'shipped',
     'delivered',
     'cancelled',
     'failed',
     'delayed',
     'refundable'
   );

ALTER TABLE "shipments"
ALTER COLUMN "status" TYPE "shipment_status_enum"
USING (lower(replace(trim(coalesce("status", 'prepared')), ' ', '_'))::"shipment_status_enum");

ALTER TABLE "shipments"
ALTER COLUMN "status" SET DEFAULT 'prepared';

ALTER TABLE "shipments"
ALTER COLUMN "status" SET NOT NULL;

COMMIT;
