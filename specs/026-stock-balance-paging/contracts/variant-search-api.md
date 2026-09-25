# Product Variant Search API Contract

**Endpoint**: `GET /api/inventory/product-variants`  
**Authentication**: Required (`withAuth` with `PERMISSIONS.INVENTORY_VIEW`)  
**Format**: JSON  

## 1. Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `search` | `string` | No | `""` | Search query matching variant SKU, barcode, or parent product name |
| `limit` | `integer` | No | `25` | Maximum number of results to return (capped at 50) |

## 2. Success Response (`200 OK`)

```json
{
  "success": true,
  "items": [
    {
      "id": "var-bev-001",
      "sku": "BEV-001-CAN",
      "barcode": "8901234567890",
      "name": "330ml Can",
      "product_name": "Artisan Sparkling Soda",
      "price": 3.50,
      "cost_price": 2.50
    },
    {
      "id": "var-bev-002",
      "sku": "BEV-002-BTL",
      "barcode": "8901234567891",
      "name": "750ml Glass Bottle",
      "product_name": "Artisan Sparkling Soda",
      "price": 6.00,
      "cost_price": 4.20
    }
  ]
}
```

## 3. Targeted Single Variant Facility On-Hand Lookup

**Endpoint**: `GET /api/inventory/stock-balances` with `productVariantId` & facility ID:
- For Warehouse: `GET /api/inventory/stock-balances?productVariantId={id}&warehouseId={whId}&limit=1`
- For Store: `GET /api/inventory/stock-balances?productVariantId={id}&storeId={storeId}&limit=1`

**Success Response (`200 OK`)**:
Returns `items` with at most 1 matching balance record containing `qty_on_hand`, `qty_reserved`, and `avg_cost`.
