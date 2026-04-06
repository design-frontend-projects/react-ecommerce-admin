# Data Model: Stores Module

## Prisma Entity Definition

The `stores` model is defined as follows in `prisma/schema.prisma`:

```prisma
model stores {
  clerk_user_id       String?
  phone               String?
  email               String?
  address             String?
  latitude            Decimal?              @db.Decimal
  longitude           Decimal?              @db.Decimal
  created_at          DateTime?             @db.Timestamp(6)
  updated_at          DateTime?             @db.Timestamp(6)
  city_id             String?               @db.Uuid
  country_id          String?               @db.Uuid
  name                String?
  store_id            String                @id @db.Uuid @default(dbgenerated("gen_random_uuid()"))
  status              Boolean?              @default(true)
  branch_id           String?               @db.Uuid
  
  // Relations
  branches            branches?             @relation(fields: [branch_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  cities              cities?               @relation(fields: [city_id], references: [id], onUpdate: NoAction)
  countries           countries?            @relation(fields: [country_id], references: [id], onUpdate: NoAction)
}
```

## Zod Validation Schema

The frontend and API will use Zod for validation, ensuring consistency with the database constraints.

```typescript
import { z } from "zod";

export const StoreSchema = z.object({
  store_id: z.string().uuid().optional(),
  name: z.string().min(1, "Store name is required"),
  clerk_user_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().optional(),
  latitude: z.number().optional().or(z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)).optional(),
  longitude: z.number().optional().or(z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)).optional(),
  city_id: z.string().uuid().optional(),
  country_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  status: z.boolean().default(true),
});

export type StoreInput = z.infer<typeof StoreSchema>;
```

## Data Lifecycle

1. **Creation**:
   - `store_id` is auto-generated if not provided (UUID).
   - `created_at` and `updated_at` are set to `now()`.
   - `clerk_user_id` is linked directly.
2. **Update**:
   - `updated_at` is recalculated on every write.
   - All fields except `store_id` and `created_at` are mutable.
3. **Deletion**:
   - Soft-delete or hard-delete based on system-wide archival policy (currently assuming hard-delete).
