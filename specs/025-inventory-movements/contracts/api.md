# API Contracts: Inventory Movements

Envelope `{ success, data }` / `{ success, error, message }`. Every handler:
`getBearerToken(request)` → `requireAuth(token, '<perm>')`. Thin handlers delegate to
`src/server/fns/*`. Errors mapped by `handleRouteError` / `rpcError`
(INSUFFICIENT_STOCK→409, *_ALREADY_APPLIED→409, *_SAME_STORE/BRANCH_MISSING→422,
*_NOT_FOUND→404, else 400).

## Stock Transfers — `/api/inventory/transfers`

- `GET` (`inventory.view`) — list; `?id=<uuid>` returns one with items.
- `POST` (`inventory.manage`) — `{ fromStoreId, toStoreId, referenceNo?, notes?, items:[{productVariantId, qty, unitCost?}] }` → creates a `draft`.
- `PATCH` (`inventory.manage`) — `{ id, referenceNo?, notes?, items? }` — draft-only edit.
- `DELETE ?id=` (`inventory.manage`) — cancel (blocked once received).
- `POST /api/inventory/transfers/apply` (`inventory.manage`) — `{ id }` → `apply_stock_transfer`.

## Stock Adjustments — `/api/inventory/adjustments`

- `GET` (`inventory.view`) — list; `?id=<uuid>` returns one with items.
- `POST` (`inventory.manage`) — `{ storeId, type:'manual'|'damage'|'stocktake', notes?, items:[{productVariantId, qty, reason?, unitCost?}] }`.
  Server snapshots `qty_before` from live balances and computes `qty_adjusted` per type.
- `DELETE ?id=` (`inventory.manage`) — cancel (blocked once approved).
- `POST /api/inventory/adjustments/apply` (`inventory.manage`) — `{ id }` → `apply_stock_adjustment`.

## Inventory Movements — `/api/inventory/movements`

- `GET` (`inventory.view`) — query filters: `movementType`, `storeId`, `productVariantId`,
  `referenceType`, `dateFrom`, `dateTo`, `limit` (default 200, max 1000). Scoped to the
  caller's tenant (`auth_user_id` on movements).
