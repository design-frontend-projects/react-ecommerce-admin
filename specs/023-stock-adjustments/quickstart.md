# Quickstart - Stock Adjustments Database Changes

This guide outlines how to verify and work with the newly added database tables and fields for the Stock Adjustments feature.

## Database Setup

### 1. Schema Validation
Verify that `prisma/schema.prisma` is correctly configured:
```bash
npx prisma validate
```

### 2. Generate Prisma Client
Generate the updated client type definitions:
```bash
npx prisma generate
```

### 3. Apply Schema Changes
Run the following to push changes directly to your local development database:
```bash
npx prisma db push
```

## Validation & Code Usage

The new tables and fields are fully supported by validation schemas:

### Stock Adjustment Batches
- Model: `stock_adjustments`
- Zod Schema:
  ```typescript
  import { z } from "zod";

  export const stockAdjustmentSchema = z.object({
    store_id: z.string().uuid(),
    status: z.enum(["draft", "approved", "cancelled"]).default("draft"),
    type: z.enum(["manual", "damage", "stocktake"]),
    notes: z.string().optional(),
  });
  ```

### Stock Adjustment Items
- Model: `stock_adjustment_items`
- Zod Schema:
  ```typescript
  import { z } from "zod";

  export const stockAdjustmentItemSchema = z.object({
    product_variant_id: z.string().uuid(),
    qty_before: z.number().nonnegative(),
    qty_after: z.number().nonnegative(),
    qty_adjusted: z.number(),
    unit_cost: z.number().nonnegative().default(0),
    reason: z.string().optional(),
  });
  ```
