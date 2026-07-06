# API Contracts - Stock Adjustments

This document defines the API endpoints and JSON request/response payloads for the Stock Adjustments module.

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/stock-adjustments` | List stock adjustments batches | Yes (Manager/Admin) |
| **POST** | `/api/stock-adjustments` | Create a new stock adjustment batch | Yes (Manager/Admin) |
| **GET** | `/api/stock-adjustments/:id` | Get details of a stock adjustment batch | Yes (Manager/Admin) |
| **POST** | `/api/stock-adjustments/:id/approve` | Approve and apply a pending/draft adjustment | Yes (Manager/Admin) |

---

## POST `/api/stock-adjustments`

Creates a new stock adjustment session.

### Request Body

```json
{
  "store_id": "89ef06a8-7bb7-4560-b6f3-33e144a807d8",
  "type": "manual",
  "notes": "End of week discrepancy corrections",
  "items": [
    {
      "product_variant_id": "2768079a-e8d9-4809-9fbf-6238b688d6be",
      "qty_before": 25,
      "qty_after": 22,
      "qty_adjusted": -3,
      "unit_cost": 5.50,
      "reason": "data_entry_error"
    }
  ]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "e30e7046-d250-459f-859a-a4be969c3a38",
    "store_id": "89ef06a8-7bb7-4560-b6f3-33e144a807d8",
    "status": "approved",
    "type": "manual",
    "notes": "End of week discrepancy corrections",
    "created_by": "f512762a-89a1-4328-98de-39e144a80c98",
    "created_at": "2026-07-07T01:50:00.000Z",
    "updated_at": "2026-07-07T01:50:00.000Z"
  }
}
```

---

## POST `/api/stock-adjustments/:id/approve`

Finalizes and applies a draft stock adjustment batch. Updates `stock_balances` and writes to `inventory_movements`.

### Response (200 OK)

```json
{
  "success": true,
  "message": "Stock adjustment approved and inventory successfully updated."
}
```
