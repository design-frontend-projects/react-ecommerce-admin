# API Contract: Inventory Movements Ledger Endpoint

**Service**: Inventory Movements Ledger API  
**Endpoint**: `GET /api/inventory/movements`  
**Authentication**: Required (Bearer JWT with `inventory.view` permission)  
**Tenancy**: Multi-tenant, strictly scoped by `tenant_id` from auth context  

---

## 1. Request Specification

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | integer | No | `1` | 1-indexed page number |
| `pageSize` | integer | No | `20` | Number of items per page (`10`, `20`, `50`, `100`) |
| `search` | string | No | `""` | Search text matching variant SKU, variant name, barcode, or movement reference |
| `movementType` | string | No | `""` | Specific movement type (e.g. `purchase`, `sale`, `adjustment_in`, `transfer_out`) |
| `warehouseId` | string | No | `""` | Filter by warehouse UUID |
| `storeId` | string | No | `""` | Filter by store ID |
| `productVariantId` | string | No | `""` | Filter by product variant UUID |
| `referenceType` | string | No | `""` | Filter by document reference type |
| `dateFrom` | string | No | `""` | Earliest movement date (ISO 8601 or YYYY-MM-DD) |
| `dateTo` | string | No | `""` | Latest movement date (ISO 8601 or YYYY-MM-DD) |
| `sortBy` | string | No | `movement_date` | Column to sort by (`movement_date`, `qty_in`, `qty_out`, `unit_cost`) |
| `sortOrder` | string | No | `desc` | Sort direction (`asc` or `desc`) |
| `export` | string | No | `""` | When set to `csv`, exports up to 5,000 filtered rows |

---

## 2. Response Specification (200 OK)

### Content-Type: `application/json`

```json
{
  "success": true,
  "data": {
    "movements": [
      {
        "id": "c1f7a01d-5df7-4638-a28a-7cf9a9cb0001",
        "movement_no": "MOV-2026-00412",
        "movement_type": "purchase",
        "movement_date": "2026-09-25T11:30:00.000Z",
        "occurred_at": "2026-09-25T11:30:00.000Z",
        "created_at": "2026-09-25T11:30:05.123Z",
        "quantity_delta": 50,
        "qty": 50,
        "qty_in": 50,
        "qty_out": 0,
        "qty_before": 120,
        "qty_after": 170,
        "unit_cost": 14.50,
        "total_cost": 725.00,
        "warehouse_id": "wh-001-main",
        "store_id": null,
        "branch_id": null,
        "warehouse_location_id": "loc-a1-shelf2",
        "condition": "good",
        "batch_id": "BATCH-2026-09A",
        "serial_id": null,
        "reference_type": "purchase_order",
        "reference_id": "po-99120",
        "source_document_type": "Purchase Order",
        "source_document_id": "PO-2026-0912",
        "remarks": "Received supplier shipment from Global Distributors Ltd",
        "notes": null,
        "product_variant_id": "var-88192-red-xl",
        "product_variants": {
          "id": "var-88192-red-xl",
          "sku": "APP-TSH-RED-XL",
          "barcode": "8901234567890",
          "name": "Classic Cotton T-Shirt - Red / XL"
        },
        "warehouses": {
          "id": "wh-001-main",
          "name": "Central Distribution Warehouse",
          "code": "CDW"
        },
        "stores": null,
        "branches": null,
        "warehouse_locations": {
          "id": "loc-a1-shelf2",
          "code": "A1-S2",
          "name": "Aisle 1, Shelf 2"
        }
      }
    ],
    "totalCount": 1845,
    "page": 1,
    "pageSize": 20,
    "totalPages": 93,
    "summary": {
      "totalMovements": 1845,
      "totalIn": 12450,
      "totalOut": 8320,
      "netDelta": 4130
    }
  }
}
```

---

## 3. Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden: missing permission inventory.view"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Unable to fetch movements"
}
```
