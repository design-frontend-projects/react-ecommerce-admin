# Contract: Reorder Rules API (`/api/inventory/reorder-rules`)

**Feature Branch**: `027-enhance-reorder-rules`  
**Endpoint**: `/api/inventory/reorder-rules`  
**Authentication**: Bearer Token / Clerk Auth Session  
**Required Permissions**:
- `GET`: `inventory.view`
- `POST`: `inventory.manage`
- `PATCH`: `inventory.manage`
- `DELETE`: `inventory.manage`

---

## 1. GET `/api/inventory/reorder-rules`

Fetches a paginated, filtered, and sorted slice of reorder rules along with high-level KPI metrics.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | integer | No | `1` | 1-based page index |
| `pageSize` | integer | No | `20` | Items per page (10, 20, 50, 100) |
| `search` | string | No | `""` | Search query for SKU, product name, or store name |
| `storeId` | UUID string | No | - | Filter rules by specific store location |
| `isActive` | string | No | - | Filter by status (`"true"`, `"false"`, or `"all"`) |
| `sortBy` | string | No | `"created_at"` | Field to sort by (`created_at`, `reorder_point`, `safety_stock`, etc.) |
| `sortOrder` | string | No | `"desc"` | Sort direction (`"asc"` or `"desc"`) |

### Success Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "e4f5a340-9b3f-4228-a477-809278912e11",
        "reorder_point": 25,
        "min_qty": 10,
        "max_qty": 100,
        "safety_stock": 5,
        "reorder_qty": 30,
        "eoq": 50,
        "lead_time_days": 3,
        "is_active": true,
        "created_at": "2026-09-25T14:30:00.000Z",
        "product_variants": {
          "id": "3b1f5e82-411a-4c22-b5f7-92a101f34120",
          "sku": "BEV-ESP-001",
          "barcode": "8901234567890",
          "products": {
            "name": "Espresso Roast Beans 1kg"
          }
        },
        "stores": {
          "store_id": "7ca6469b-433b-4177-a722-1d599c43b910",
          "name": "Downtown Flagship Store"
        },
        "suppliers": {
          "id": "891fb832-601e-4501-8e81-f2453e1a0031",
          "name": "Supreme Coffee Roasters"
        }
      }
    ],
    "total": 125,
    "page": 1,
    "pageSize": 20,
    "totalPages": 7,
    "metrics": {
      "totalRules": 125,
      "activeRules": 115,
      "inactiveRules": 10,
      "totalStores": 4
    }
  }
}
```

### Error Responses

- `401 Unauthorized`: Missing or invalid bearer token.
- `403 Forbidden`: User lacks `inventory.view` permission.
- `500 Internal Server Error`: Database query error with structured error message.

---

## 2. POST `/api/inventory/reorder-rules`

Creates a new reorder rule for a specified variant and store.

### Request Body

```json
{
  "productVariantId": "3b1f5e82-411a-4c22-b5f7-92a101f34120",
  "storeId": "7ca6469b-433b-4177-a722-1d599c43b910",
  "reorderPoint": 25,
  "minQty": 10,
  "maxQty": 100,
  "safetyStock": 5,
  "reorderQty": 30,
  "eoq": 50,
  "leadTimeDays": 3,
  "preferredSupplierId": "891fb832-601e-4501-8e81-f2453e1a0031",
  "isActive": true
}
```

### Success Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "id": "e4f5a340-9b3f-4228-a477-809278912e11"
  }
}
```

### Error Responses

- `400 Bad Request`: Validation failure (negative number, missing required fields).
- `409 Conflict`: A rule for this variant and store already exists (`P2002`).

---

## 3. PATCH `/api/inventory/reorder-rules?id={id}`

Updates an existing reorder rule.

---

## 4. DELETE `/api/inventory/reorder-rules?id={id}`

Deletes an existing reorder rule.
