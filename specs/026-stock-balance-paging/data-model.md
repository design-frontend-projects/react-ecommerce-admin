# Data Model & Schema Specifications

**Feature Branch**: `026-stock-balance-paging`  
**Feature Name**: Stock Balance Server-Side Lazy Pagination & Dynamic SKU Search  
**Date**: 2026-09-25  

## Overview

This document specifies the database models, filtering parameters, response envelopes, and TypeScript contracts for server-side paginated stock balances and dynamic product variant SKU search.

---

## 1. Stock Balance Entities & Query Parameters

### 1.1 `StockBalanceFilters` Schema
Represents the validated parameters passed to the stock balances endpoint.

```typescript
export interface StockBalanceFilters {
  // Pagination
  page?: number                  // 1-indexed page number (default: 1)
  pageSize?: number              // Items per page (default: 20, max: 100)
  limit?: number                 // Backward compatibility alias for pageSize
  offset?: number                // Backward compatibility alias for (page - 1) * pageSize

  // Search & Faceted Filters
  search?: string                // Text search across SKU, barcode, and product title
  facilityType?: 'all' | 'warehouses' | 'stores'
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  
  // Specific Location Filters
  warehouseId?: string
  warehouseIds?: string[]
  storeId?: string
  locationId?: string            // Specific bin or warehouse zone
  productVariantId?: string
  condition?: 'good' | 'damaged' | 'refurbished' | 'returned'

  // Sorting
  sortBy?: 'updated_at' | 'qty_on_hand' | 'valuation' | 'product_name' | 'sku'
  sortOrder?: 'asc' | 'desc'
}
```

### 1.2 `StockBalanceRow` Schema
Represents a single row in the paginated stock balance ledger.

```typescript
export interface StockBalanceRow {
  id: string
  tenant_id: string
  warehouse_id: string | null
  location_id: string | null
  store_id: string | null
  product_variant_id: string
  condition: 'good' | 'damaged' | 'refurbished' | 'returned'
  batch_id: string | null
  serial_id: string | null
  qty_on_hand: number
  qty_reserved: number
  qty_available: number
  avg_cost: number
  valuation: number
  last_movement_at: string | null
  created_at: string
  updated_at: string
  
  // Relations
  product_variants?: {
    id: string
    sku: string
    barcode: string | null
    name: string | null
    products?: {
      id: string
      name: string
      sku: string
      is_batch_tracked: boolean
      is_serial_tracked: boolean
      reorder_level?: number | null
    } | null
  } | null

  warehouses?: {
    id: string
    code: string
    name: string
  } | null

  warehouse_locations?: {
    id: string
    code: string
    name: string | null
    location_type: string
  } | null

  stores?: {
    store_id: string
    name: string
  } | null
}
```

### 1.3 `StockBalancesResponse` Envelope

```typescript
export interface StockBalancesResponse {
  success: boolean
  items: StockBalanceRow[]
  total: number                  // Total records matching active filters across the tenant
  page: number                   // Current 1-indexed page
  pageSize: number               // Active items per page
  totalPages: number             // Math.ceil(total / pageSize)
  metrics?: StockMetrics         // Summary KPI calculations
}

export interface StockMetrics {
  totalVariants: number
  totalOnHand: number
  totalReserved: number
  totalAvailable: number
  totalValuation: number
  lowStockCount: number
  outOfStockCount: number
}
```

---

## 2. Product Variant Search Entities

### 2.1 `VariantSearchQuery` Parameters

```typescript
export interface VariantSearchParams {
  search: string                 // Search query (min 1 char, debounced 300ms)
  limit?: number                 // Results cap (default: 25, max: 50)
}
```

### 2.2 `VariantSearchResult` Schema

```typescript
export interface VariantSearchResult {
  id: string                     // product_variant_id (UUID)
  sku: string                    // Variant SKU code
  barcode: string | null         // Barcode if assigned
  name: string | null            // Variant title or attribute descriptor
  product_name: string           // Parent product name
  price: number                  // Selling price
  cost_price: number | null      // Standard unit cost
}

export interface VariantSearchResponse {
  success: boolean
  items: VariantSearchResult[]
}
```

---

## 3. Targeted Variant Facility On-Hand Entity

```typescript
export interface VariantFacilityOnHandParams {
  productVariantId: string
  facilityType: 'warehouse' | 'store'
  facilityId: string
}

export interface VariantFacilityOnHandResult {
  product_variant_id: string
  facility_id: string
  qty_on_hand: number
  qty_reserved: number
  qty_available: number
  avg_cost: number
}
```

---

## 4. State Transitions & Validation Rules

1. **Active Page Reset**: Whenever `filters.search`, `filters.facilityType`, `filters.stockStatus`, or `filters.warehouseId` change, `page` MUST automatically reset to 1.
2. **Page Boundaries**:
   - `page >= 1`
   - `1 <= pageSize <= 100`
   - If `page > totalPages` (due to external deletions or filter changes), the query clamps or resets `page` to 1.
3. **Multi-Tenancy Isolation**:
   - Every database query in Prisma 7 is scoped by `tenant_id` via `requireTenantId(authUserId)`.
4. **Debounced Search**:
   - Search inputs are debounced by 300ms before triggering API calls to preserve server resources.
