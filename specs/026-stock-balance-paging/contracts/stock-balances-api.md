# Stock Balances API Contract

**Endpoint**: `GET /api/inventory/stock-balances`  
**Authentication**: Required (`withAuth` with `PERMISSIONS.INVENTORY_VIEW`)  
**Format**: JSON  

## 1. Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | `integer` | No | `1` | 1-indexed page number |
| `pageSize` | `integer` | No | `20` | Items per page (min 1, max 100) |
| `search` | `string` | No | `""` | Search query matching SKU, barcode, or product name |
| `facilityType` | `string` | No | `"all"` | Filter by `'all'`, `'warehouses'`, or `'stores'` |
| `stockStatus` | `string` | No | `"all"` | Filter by `'all'`, `'in_stock'`, `'low_stock'`, or `'out_of_stock'` |
| `warehouseId` | `string` | No | - | Filter by specific warehouse ID |
| `storeId` | `string` | No | - | Filter by specific store ID |
| `sortBy` | `string` | No | `"updated_at"` | Field to sort: `'updated_at'`, `'qty_on_hand'`, `'valuation'` |
| `sortOrder` | `string` | No | `"desc"` | Sort direction: `'asc'` or `'desc'` |

## 2. Success Response (`200 OK`)

```json
{
  "success": true,
  "items": [
    {
      "id": "e0b82f04-87d2-4328-87a2-f67b4c9197c1",
      "tenant_id": "tenant-default-001",
      "warehouse_id": "wh-001",
      "location_id": "loc-zone-a",
      "store_id": null,
      "product_variant_id": "var-bev-001",
      "condition": "good",
      "batch_id": null,
      "serial_id": null,
      "qty_on_hand": 120,
      "qty_reserved": 15,
      "qty_available": 105,
      "avg_cost": 2.50,
      "valuation": 300.00,
      "last_movement_at": "2026-09-25T14:30:00.000Z",
      "created_at": "2026-09-01T08:00:00.000Z",
      "updated_at": "2026-09-25T14:30:00.000Z",
      "product_variants": {
        "id": "var-bev-001",
        "sku": "BEV-001-CAN",
        "barcode": "8901234567890",
        "name": "330ml Can",
        "products": {
          "id": "prod-bev-001",
          "name": "Artisan Sparkling Soda",
          "sku": "BEV-001",
          "is_batch_tracked": false,
          "is_serial_tracked": false,
          "reorder_level": 25
        }
      },
      "warehouses": {
        "id": "wh-001",
        "code": "MAIN-WH",
        "name": "Central Distribution Hub"
      },
      "warehouse_locations": {
        "id": "loc-zone-a",
        "code": "A-01-02",
        "name": "Beverage Rack 1",
        "location_type": "rack"
      },
      "stores": null
    }
  ],
  "total": 4580,
  "page": 1,
  "pageSize": 20,
  "totalPages": 229,
  "metrics": {
    "totalVariants": 1240,
    "totalOnHand": 84520,
    "totalReserved": 3210,
    "totalAvailable": 81310,
    "totalValuation": 211300.00,
    "lowStockCount": 42,
    "outOfStockCount": 18
  }
}
```

## 3. Error Responses

- `401 Unauthorized`: Token missing or invalid.
- `403 Forbidden`: User lacks `inventory.stock.view` permission.
- `500 Internal Server Error`: Database query failure or unexpected server error.
