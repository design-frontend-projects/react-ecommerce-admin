# Data Model & Schema Specifications: Inventory Movements

**Branch**: `025-enhance-inventory-movements`  
**Feature**: Enhance Inventory Movements UI/UX & Server-Side Pagination  
**Status**: Completed  

---

## 1. Core Entities & TypeScript Interfaces

### 1.1. Movement Filter Parameters (`MovementQueryParams`)
Defines the complete set of parameters accepted by the server API and persisted in the URL query string:

```typescript
export interface MovementQueryParams {
  page?: number                 // 1-indexed page number (default: 1)
  pageSize?: number             // Records per page: 10, 20, 50, 100 (default: 20)
  search?: string               // Text search across SKU, variant name, barcode, movement_no
  movementType?: string         // Specific movement type (or comma-separated list / array)
  warehouseId?: string          // Filter by warehouse UUID
  storeId?: string              // Filter by store ID
  locationId?: string           // Unified location identifier (warehouse or store)
  referenceType?: string        // Filter by source document type (purchase_order, sales_invoice, etc.)
  productVariantId?: string     // Filter to a specific catalog product variant
  dateFrom?: string             // ISO timestamp or YYYY-MM-DD
  dateTo?: string               // ISO timestamp or YYYY-MM-DD
  sortBy?: string               // Column name for sorting (default: 'movement_date')
  sortOrder?: 'asc' | 'desc'    // Sort direction (default: 'desc')
}
```

### 1.2. Inventory Movement Row Entity (`MovementRow`)
Represents an individual enriched movement record returned to the client:

```typescript
export interface MovementRow {
  id: string
  movement_no: string | null
  movement_type: string
  movement_date: string
  occurred_at: string
  created_at: string
  
  // Quantities & Balances
  quantity_delta: number
  qty: number
  qty_in: number
  qty_out: number
  qty_before: number | null
  qty_after: number | null
  
  // Valuation
  unit_cost: number
  total_cost: number
  
  // Locations & Provenance
  warehouse_id: string | null
  store_id: string | null
  branch_id: string | null
  warehouse_location_id: string | null
  location_id: string | null
  condition: string | null
  
  // Tracking
  batch_id: string | null
  serial_id: string | null
  
  // Document Reference
  reference_type: string | null
  reference_id: string | null
  source_document_type: string | null
  source_document_id: string | null
  remarks: string | null
  notes: string | null
  
  // Joined Relations
  product_variant_id: string
  product_variants: {
    id: string
    sku: string | null
    barcode: string | null
    name: string | null
  } | null
  warehouses: {
    id: string
    name: string | null
    code: string | null
  } | null
  stores: {
    store_id: string
    name: string | null
  } | null
  branches: {
    id: string
    name: string | null
  } | null
  warehouse_locations: {
    id: string
    code?: string
    name: string | null
  } | null
}
```

### 1.3. Paginated Movements Envelope (`PaginatedMovementsResult`)

```typescript
export interface MovementSummaryStats {
  totalMovements: number
  totalIn: number
  totalOut: number
  netDelta: number
}

export interface PaginatedMovementsResult {
  movements: MovementRow[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  summary: MovementSummaryStats
}
```

---

## 2. Zod Validation Schemas

```typescript
import { z } from 'zod'

const safeNumber = (defaultVal = 0) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return defaultVal
    const num = Number(val)
    return isNaN(num) ? defaultVal : num
  }, z.number())

const safeNullableNumber = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return null
  const num = Number(val)
  return isNaN(num) ? null : num
}, z.number().nullable().optional())

export const movementQueryParamsSchema = z.object({
  page: safeNumber(1).optional(),
  pageSize: safeNumber(20).optional(),
  search: z.string().optional(),
  movementType: z.string().optional(),
  warehouseId: z.string().optional(),
  storeId: z.string().optional(),
  locationId: z.string().optional(),
  referenceType: z.string().optional(),
  productVariantId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.string().optional().default('movement_date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const movementSummarySchema = z.object({
  totalMovements: safeNumber(0),
  totalIn: safeNumber(0),
  totalOut: safeNumber(0),
  netDelta: safeNumber(0),
})

export const paginatedMovementsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    movements: z.array(z.any()), // transformed into MovementRow[]
    totalCount: safeNumber(0),
    page: safeNumber(1),
    pageSize: safeNumber(20),
    totalPages: safeNumber(1),
    summary: movementSummarySchema,
  }),
})
```

---

## 3. Database Indexes & Query Strategy

Queries utilize composite and tenant-isolated indexes on `inventory_movements`:
- Index: `(tenant_id, movement_date DESC, id DESC)`: Guarantees immediate sorted paging.
- Index: `(tenant_id, product_variant_id)`: Accelerates variant-specific movement tracing.
- Index: `(tenant_id, warehouse_id)` / `(tenant_id, store_id)`: Accelerates location filtering.
- Immutability Rule: Movements are strictly append-only. No updates (`UPDATE`) or deletions (`DELETE`) occur on the ledger rows.
