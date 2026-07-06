# Data Model - Stock Adjustments Database Changes

This document outlines the modifications made to the database schema models and validations for the Stock Adjustments feature.

## Database Entities

We will introduce two new tables: `stock_adjustments` and `stock_adjustment_items`.

### 1. `stock_adjustments` (New)
Represents a batch adjustment session (e.g., a manual update, a damage record, or a stocktake session).
- **Field**: `id`
  - **Type**: `Uuid`
  - **Constraints**: `@id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- **Field**: `store_id`
  - **Type**: `Uuid`
  - **Constraints**: `@db.Uuid`
  - **Description**: Links the adjustment session to a specific store.
- **Field**: `status`
  - **Type**: `String`
  - **Constraints**: `default("draft") @db.VarChar(20)` (Values: `draft`, `approved`, `cancelled`)
- **Field**: `type`
  - **Type**: `String`
  - **Constraints**: `@db.VarChar(20)` (Values: `manual`, `damage`, `stocktake`)
- **Field**: `notes`
  - **Type**: `String?`
- **Field**: `created_by`
  - **Type**: `String?`
- **Field**: `approved_by`
  - **Type**: `String?`
- **Field**: `created_at`
  - **Type**: `DateTime`
  - **Constraints**: `@default(now()) @db.Timestamptz(6)`
- **Field**: `updated_at`
  - **Type**: `DateTime`
  - **Constraints**: `@default(now()) @updatedAt @db.Timestamptz(6)`
- **Field**: `auth_user_id`
  - **Type**: `String?`
  - **Constraints**: `@default(dbgenerated("auth.uid()")) @db.Uuid`

### 2. `stock_adjustment_items` (New)
Represents individual product variant adjustments in a batch adjustment session.
- **Field**: `id`
  - **Type**: `Uuid`
  - **Constraints**: `@id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- **Field**: `stock_adjustment_id`
  - **Type**: `Uuid`
  - **Constraints**: `@db.Uuid`
- **Field**: `product_variant_id`
  - **Type**: `Uuid`
  - **Constraints**: `@db.Uuid`
- **Field**: `qty_before`
  - **Type**: `Decimal`
  - **Constraints**: `@db.Decimal(18, 4)`
  - **Description**: Recorded system quantity before the adjustment.
- **Field**: `qty_after`
  - **Type**: `Decimal`
  - **Constraints**: `@db.Decimal(18, 4)`
  - **Description**: Final physical count or adjusted quantity.
- **Field**: `qty_adjusted`
  - **Type**: `Decimal`
  - **Constraints**: `@db.Decimal(18, 4)`
  - **Description**: Delta quantity adjustment (positive or negative).
- **Field**: `unit_cost`
  - **Type**: `Decimal`
  - **Constraints**: `@db.Decimal(18, 4) @default(0)`
  - **Description**: Unit cost of the item at the time of adjustment.
- **Field**: `reason`
  - **Type**: `String?`
  - **Constraints**: `@db.VarChar(100)` (e.g., "damage", "expired", "theft", "data_entry_error", "stocktake_discrepancy")

## Schema Definitions (Prisma)

Add the following to `prisma/schema.prisma`:

```prisma
model stock_adjustments {
  id                   String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  store_id             String                   @db.Uuid
  status               String                   @default("draft") @db.VarChar(20)
  type                 String                   @db.VarChar(20)
  notes                String?
  created_by           String?
  approved_by          String?
  created_at           DateTime                 @default(now()) @db.Timestamptz(6)
  updated_at           DateTime                 @default(now()) @updatedAt @db.Timestamptz(6)
  auth_user_id         String?                  @default(dbgenerated("auth.uid()")) @db.Uuid
  stores               stores                   @relation(fields: [store_id], references: [store_id], onDelete: Cascade, onUpdate: NoAction)
  stock_adjustment_items stock_adjustment_items[]
}

model stock_adjustment_items {
  id                  String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  stock_adjustment_id String            @db.Uuid
  product_variant_id  String            @db.Uuid
  qty_before          Decimal           @db.Decimal(18, 4)
  qty_after           Decimal           @db.Decimal(18, 4)
  qty_adjusted        Decimal           @db.Decimal(18, 4)
  unit_cost           Decimal           @default(0) @db.Decimal(18, 4)
  reason              String?           @db.VarChar(100)
  stock_adjustments   stock_adjustments @relation(fields: [stock_adjustment_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  product_variants    product_variants  @relation(fields: [product_variant_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
}
```

## Relationships
- `stock_adjustments` is child of `stores` (One-to-Many).
- `stock_adjustment_items` is child of `stock_adjustments` (One-to-Many).
- `stock_adjustment_items` links to `product_variants` (Many-to-One).
- Adjustments are applied directly to `stock_balances` and recorded in `inventory_movements` in a single transactional query.
