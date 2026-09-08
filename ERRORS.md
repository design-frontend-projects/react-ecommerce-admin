# Error Log

## [2026-09-08 23:40] - Purchase Orders Tenant ID Constraint Violation (23502)

- **Type**: Integration
- **Severity**: High
- **File**: `src/features/purchase-orders/hooks/use-purchase-orders.ts:160`
- **Agent**: antigravity-ide
- **Root Cause**: When creating a new purchase order, the `.insert()` mutation into PostgreSQL table `purchase_orders` omitted `tenant_id`. Because `purchase_orders.tenant_id` and `purchase_order_items.tenant_id` are defined as `UUID NOT NULL` without a default value, Postgres rejected the insertion with code `23502` (`not_null_violation`).
- **Error Message**: 
  ```
  {
      "code": "23502",
      "details": null,
      "hint": null,
      "message": "null value in column \"tenant_id\" of relation \"purchase_orders\" violates not-null constraint"
  }
  ```
- **Fix Applied**: 
  1. Integrated `resolveClientTenantId` and `getAuthTenantAndUser` from `@/lib/client-tenant` into `useCreatePurchaseOrder` and `useUpdatePurchaseOrder`.
  2. Attached `tenant_id`, `subtotal`, `grand_total`, `created_by_user_id`, and `updated_by_user_id` to both `purchase_orders` header and `purchase_order_items` line items.
  3. Added tenant scoping (`eq('tenant_id', tenantId)`) to `usePurchaseOrders`, `usePurchaseOrder`, and `useDeletePurchaseOrder`.
  4. Added automated test suite `src/__tests__/purchase-orders-tenant.test.ts` to prevent regression.
- **Prevention**: Always resolve and pass `tenant_id` and user audit fields for all database table insertions where multi-tenancy columns are `NOT NULL`.
- **Status**: Fixed

---

## [2026-09-09 00:10] - PO Receive Dialog Cross-Row Quantity Mutation

- **Type**: Logic
- **Severity**: Medium
- **File**: `src/features/purchase-orders/components/po-receive-dialog.tsx:45`
- **Agent**: antigravity-ide
- **Root Cause**: `receivedQtys` state was keyed by `item.po_item_id`. In the PostgreSQL schema, the primary key of `purchase_order_items` is `id` (UUID), so `item.po_item_id` was `undefined` for every item in the fetched order. Consequently, editing the quantity in row 1 wrote to `receivedQtys["undefined"]`, causing all other rows to read the exact same value.
- **Error Message**: 
  ```
  Editing 'Receive Now' for row 1 duplicated and mirrored into row 2 in POReceiveDialog
  ```
- **Fix Applied**: 
  1. Implemented resilient unique key resolver `getItemKey(item, index) = String(item.id || item.po_item_id || 'idx_' + index)`.
  2. Changed `receivedQtys` state to `Record<string, number | string>` and reset independently when the dialog opens.
  3. Added input placeholder `'0'` and capped entry to `remainingToReceive = Math.max(0, quantity_ordered - prevReceived)`.
  4. Display `Fulfilled` badge for items already fully received.
  5. Added comprehensive vitest suite `src/__tests__/purchase-order-receive.test.tsx` verifying multi-row state isolation and quantity clamping.
- **Prevention**: Never assume database column naming conventions without verifying the table primary key (`id` vs `table_id`). Always key mapped input state by verified unique identifiers with index fallbacks.
- **Status**: Fixed

---

## [2026-09-09 01:15] - Stores PGRST204 Schema Cache Column auth_user_id Missing

- **Type**: Integration
- **Severity**: High
- **File**: `src/features/stores/hooks/use-stores.ts:58`
- **Agent**: antigravity-ide (@frontend-specialist & @database-architect)
- **Root Cause**: During the tenant-isolation migration, `stores.auth_user_id` was dropped in favor of `tenant_id`, `created_by_user_id`, and `updated_by_user_id`. However, `StoreActionDialog` and `useCreateStore` continued to inject the legacy `auth_user_id` field into the `.insert()` payload, which caused PostgREST to reject the request with `PGRST204` ("Could not find the 'auth_user_id' column of 'stores' in the schema cache"). Additionally, `stores.store_id` lacked a database default for `gen_random_uuid()`.
- **Error Message**: 
  ```json
  {
      "code": "PGRST204",
      "details": null,
      "hint": null,
      "message": "Could not find the 'auth_user_id' column of 'stores' in the schema cache"
  }
  ```
- **Fix Applied**: 
  1. Removed `auth_user_id` from `storeSchema` (`src/features/stores/data/schema.ts`) and `StoreActionDialog` (`src/features/stores/components/store-action-dialog.tsx`).
  2. Integrated `resolveClientTenantId` and `getAuthTenantAndUser` in `useCreateStore`, `useUpdateStore`, `useStores`, and `useDeleteStore`.
  3. Sanitized payload in `useCreateStore` and `useUpdateStore` to strip obsolete fields (`auth_user_id`), coerce empty string foreign keys (`branch_id`, etc.) to `null`, and inject `tenant_id`, `created_by_user_id`, and `updated_by_user_id`.
  4. Set `DEFAULT gen_random_uuid()` on `stores.store_id` in PostgreSQL and updated Prisma schema and migrations.
  5. Added comprehensive vitest suite `src/__tests__/stores-tenant.test.ts` to ensure `auth_user_id` is never transmitted and tenant scoping is strictly applied.
- **Prevention**: When migrating tables from single-user to multi-tenant isolation, remove deprecated user column definitions across all form schemas and hook mutations, and apply `resolveClientTenantId` pattern.
- **Status**: Fixed

---
