# Phase 1 Data Model: Reorder Rules UI/UX Enhancement, Virtualized SKU Selector & Server-Side Pagination

**Feature Branch**: `027-enhance-reorder-rules`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/specs/027-enhance-reorder-rules/spec.md)

---

## 1. Database Schema (`reorder_rules`)

The `reorder_rules` model in Prisma:

```prisma
model reorder_rules {
  id                    String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id             String            @db.Uuid
  product_variant_id    String            @db.Uuid
  store_id              String            @db.Uuid
  reorder_point         Decimal           @db.Decimal(12, 2)
  min_qty               Decimal?          @db.Decimal(12, 2)
  max_qty               Decimal?          @db.Decimal(12, 2)
  safety_stock          Decimal           @default(0) @db.Decimal(12, 2)
  reorder_qty           Decimal?          @db.Decimal(12, 2)
  eoq                   Decimal?          @db.Decimal(12, 2)
  lead_time_days        Int?              @default(1)
  preferred_supplier_id String?           @db.Uuid
  is_active             Boolean           @default(true)
  created_at            DateTime?         @default(now()) @db.Timestamptz(6)
  updated_at            DateTime?         @default(now()) @db.Timestamptz(6)
  created_by_user_id    String?           @db.Uuid
  updated_by_user_id    String?           @db.Uuid

  product_variants      product_variants  @relation(fields: [product_variant_id], references: [id], onDelete: Cascade)
  stores                stores            @relation(fields: [store_id], references: [store_id], onDelete: Cascade)
  suppliers             suppliers?        @relation(fields: [preferred_supplier_id], references: [id], onDelete: SetNull)

  @@unique([tenant_id, product_variant_id, store_id], name: "uq_reorder_rules_tenant_variant_store")
  @@index([tenant_id, is_active], name: "idx_reorder_rules_tenant_active")
  @@index([tenant_id, store_id], name: "idx_reorder_rules_tenant_store")
}
```

---

## 2. TypeScript / Zod Schemas

### Filter and Pagination Query Schema

```typescript
export const reorderRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(''),
  storeId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  sortBy: z
    .enum([
      'created_at',
      'reorder_point',
      'safety_stock',
      'min_qty',
      'max_qty',
      'lead_time_days',
      'sku',
    ])
    .optional()
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type ReorderRulesQueryParams = z.infer<typeof reorderRulesQuerySchema>
```

### Response Schema & Aggregates

```typescript
export const reorderRulesMetricsSchema = z.object({
  totalRules: z.number(),
  activeRules: z.number(),
  inactiveRules: z.number(),
  totalStores: z.number(),
})

export const ruleListItemSchema = z.object({
  id: z.string().uuid(),
  reorder_point: z.coerce.number(),
  min_qty: z.coerce.number().nullable(),
  max_qty: z.coerce.number().nullable(),
  safety_stock: z.coerce.number(),
  reorder_qty: z.coerce.number().nullable(),
  eoq: z.coerce.number().nullable(),
  lead_time_days: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      barcode: z.string().nullable().optional(),
      products: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable(),
  suppliers: z
    .object({
      id: z.string().optional(),
      supplier_id: z.any().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const paginatedReorderRulesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(ruleListItemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
    metrics: reorderRulesMetricsSchema,
  }),
})

export type PaginatedReorderRulesResponse = z.infer<typeof paginatedReorderRulesResponseSchema>
```

### Rule Input Schema (Mutations)

```typescript
export const ruleInputSchema = z.object({
  productVariantId: z.string().uuid('Select a product variant.'),
  storeId: z.string().uuid('Select a store.'),
  reorderPoint: z.coerce.number().min(0, 'Reorder point must be >= 0.'),
  minQty: z.coerce.number().optional().nullable(),
  maxQty: z.coerce.number().optional().nullable(),
  safetyStock: z.coerce.number().optional().nullable(),
  reorderQty: z.coerce.number().optional().nullable(),
  eoq: z.coerce.number().optional().nullable(),
  leadTimeDays: z.coerce.number().int().optional().nullable(),
  preferredSupplierId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
})

export type RuleInput = z.infer<typeof ruleInputSchema>
```

---

## 3. Product Variant Search Entity

```typescript
export interface VariantSearchResult {
  id: string
  sku: string
  barcode: string | null
  name: string | null
  product_name: string
  price: number
  cost_price: number | null
}

export interface VariantSearchResponse {
  success: boolean
  items: VariantSearchResult[]
}
```
