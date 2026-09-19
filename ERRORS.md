# Error Log

## [2026-09-19 04:55] - Maximum Update Depth Exceeded when Assigning Users to POS Terminal

- **Type**: Runtime / Logic
- **Severity**: High
- **File**: `src/features/pos/pages/pos-terminal-users-page.tsx:892`
- **Agent**: @frontend-specialist
- **Root Cause**: In the POS assign cashiers modal dialog (`pos-terminal-users-page.tsx`), the list of available cashiers was wrapped inside `<form onSubmit={handleAssignSubmit}>`. Each cashier list item was a clickable `<div>` with `onClick={() => handleToggleUserSelection(u.id)}` containing a Radix `<Checkbox checked={isChecked} onCheckedChange={() => handleToggleUserSelection(u.id)} />`. Because the checkboxes were placed inside a `<form>`, Radix UI automatically mounted an internal hidden `<input type="checkbox">` (`CheckboxBubbleInput`) to synchronize standard form state. Whenever `checked` toggled, `CheckboxBubbleInput` dispatched a synthetic DOM `click` event with `bubbles: true`. This synthetic click bubbled up through the parent DOM hierarchy and triggered the outer `<div>`'s `onClick` handler, calling `handleToggleUserSelection(u.id)` again in the same cycle. This inverted the selection, re-triggered `CheckboxBubbleInput`, and produced an infinite state-setting render loop (`dispatchSetState` inside Radix `setRef`), culminating in `Error: Maximum update depth exceeded`.
- **Error Message**:
  ```
  installHook.js:1 Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
      at setRef (@radix-ui/react-compose-refs)
      at dispatchSetStateInternal (react-dom-client.development.js)
  ```
- **Fix Applied**:
  1. In `src/features/pos/pages/pos-terminal-users-page.tsx`:
     - Filtered event targets in the row `onClick` handler to ignore clicks originating from form checkboxes or inputs (`if (target.closest('[data-slot="checkbox"]') || target.tagName === 'INPUT') return;`).
     - Added `onClick={(e) => e.stopPropagation()}` on the `<Checkbox>` component to isolate direct checkbox user interactions from the outer row.
     - Provided `aria-label={`Select ${u.name}`}` on the `<Checkbox>` for accessibility.
     - Guarded `assignTerminalId` fallback in `<Select value={assignTerminalId || undefined}>`.
  2. In `src/features/pos/components/pos-main-screen.tsx`:
     - Guarded `setSession` against redundant store dispatches when `session?.id === terminalStatus.activeSession.id`.
  3. Created regression test suite in `src/__tests__/pos-terminal-users-assignment.test.tsx` testing both row click and direct checkbox toggling during cashier assignment, verifying complete elimination of the error.
- **Prevention**: When placing interactive rows with nested Radix `Checkbox` elements inside forms, never attach unrestrained `onClick` handlers on parent elements that toggle the same state as the checkbox without checking `e.target` or stopping event propagation, because Radix form inputs dispatch synthetic bubbling click events to synchronize form state.
- **Status**: Fixed

---

## [2026-09-19 04:20] - TypeScript Possibly Undefined Operator Comparison on Promotion Scopes

- **Type**: Syntax / Type
- **Severity**: Low
- **File**: `src/features/promotions/pages/promotion-detail-page.tsx:558`
- **Agent**: @frontend-specialist
- **Root Cause**: `promo.brands` (along with `categories`, `products`, `branches`, `stores`, `channels`, `rules`, etc.) on `InvPromotion` are optional relational properties (`brands?: ...[] | undefined`). Evaluating `promo.brands?.length > 0` produces a `number | undefined` on the left-hand side of relational comparison `>`, which TypeScript flags under `strictNullChecks` / `"strict": true` with `'promo.brands.length' is possibly 'undefined'`.
- **Error Message**:
  ```
  'promo.brands.length' is possibly 'undefined'.
  ```
- **Fix Applied**: Replaced uncoalesced length comparisons with nullish coalescing defaults: `(promo.brands?.length ?? 0) > 0` and `(promo.rules?.length ?? 0) === 0` across all scope lists and relational tabs in `src/features/promotions/pages/promotion-detail-page.tsx`.
- **Prevention**: When checking array lengths on optional or nullable relational fields in TypeScript, always use nullish coalescing `(arr?.length ?? 0) > 0` or truthy guards `arr && arr.length > 0` so that relational operators (`>`, `<`, `===`) always operate on strictly typed numbers.
- **Status**: Fixed

---

## [2026-09-19 04:15] - TypeScript Any Types and React Compiler Watch Incompatibility in Promotions Pages

- **Type**: Syntax / Integration
- **Severity**: Medium
- **File**: `src/features/promotions/pages/promotion-detail-page.tsx`, `src/features/promotions/pages/promotion-wizard-page.tsx`
- **Agent**: @frontend-specialist
- **Root Cause**: 
  1. In `promotion-detail-page.tsx` and `promotion-wizard-page.tsx`, untyped casts (`as any`) were used across rule action mappings, route navigation fallback parameters, customer group options, and channel options, violating `@typescript-eslint/no-explicit-any`.
  2. In `promotion-wizard-page.tsx`, calling `form.watch(...)` inside array field mappings (`ruleFields.map`, `conditionFields.map`) triggered React Compiler's `react-hooks/incompatible-library` warning (`Compilation Skipped: Use of incompatible library - React Hook Form's useForm() API returns a watch() function which cannot be memoized safely`).
- **Error Message**:
  ```
  error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
  warning Compilation Skipped: Use of incompatible library react-hooks/incompatible-library
  ```
- **Fix Applied**:
  1. In `src/features/promotions/types/index.ts`: Enhanced `InvPromotion` and `InvPromotionRule` with both database snake_case and application camelCase properties to eliminate untyped casts across all promotional entities.
  2. In `promotion-detail-page.tsx`:
     - Defined `DetailRuleItem` with optional `action_type`, `rule_type`, and `ruleType` fields.
     - Typed TanStack Router navigation to `/_authenticated/promotions/$promotionId/edit` with `params: { promotionId: promo.id }` cleanly without `as any`.
     - Derived `ruleAction` cleanly using optional chaining and nullish coalescing.
  3. In `promotion-wizard-page.tsx`:
     - Replaced inline `form.watch(...)` calls in render loops with `useWatch({ control: form.control })`, completely resolving the React Compiler memoization incompatibility.
     - Introduced explicit interfaces `CustomerGroupOptionItem` and `ChannelOptionItem` for virtual searchable multi-select options.
     - Updated `RuleItem` and `form.reset` prefill to handle both camelCase and snake_case API representations safely without `as any`.
  4. Ran eslint and Vitest test suite (`src/__tests__/promotion*.ts*`), verifying 25/25 passing tests and 0 lint warnings/errors.
- **Prevention**: Use `useWatch({ control })` instead of invoking `form.watch()` inside render loops or array mappings. Define comprehensive entity types that accommodate database snake_case naming alongside frontend camelCase naming to avoid resorting to `as any`.
- **Status**: Fixed

---

## [2026-09-19 03:20] - Prisma Invalid UUID Syntax Error in /api/pos/products count() and findMany()

- **Type**: Integration
- **Severity**: High
- **File**: `src/routes/api/pos/products.ts:137`
- **Agent**: @backend-specialist
- **Root Cause**: `src/routes/api/pos/products.ts` directly assigned the query parameter `categoryId` to Prisma's `category_id` field (`category_id: categoryId`). In PostgreSQL and Prisma, `products.category_id` is a `@db.Uuid` column. When the frontend POS catalog or category pills passed human-readable category names (e.g., `"Fresh Meats & Poultry"`), PostgreSQL rejected the query with `invalid input syntax for type uuid: "Fresh Meats & Poultry"`, causing a 500 error in `prisma.products.count()` and `prisma.products.findMany()`.
- **Error Message**:
  ```
  Invalid `prisma.products.count()` invocation in
  src/routes/api/pos/products.ts:137:27

  Invalid input value: invalid input syntax for type uuid: "Fresh Meats & Poultry"
  ```
- **Fix Applied**:
  1. Updated `src/routes/api/pos/products.ts`:
     - Added `isUuid()` helper to validate PostgreSQL UUID formatting (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).
     - Extracted `buildPosProductWhere()` query builder:
       - If `categoryId` is a valid UUID, filter directly by `category_id: categoryId`.
       - If `categoryId` is a human-readable name, filter safely via relational `categories: { OR: [{ name: { equals: category, mode: 'insensitive' } }, { name_ar: { equals: category, mode: 'insensitive' } }] }`.
       - If `brandId` is a valid UUID, filter by `brand_id: brandId`, else filter via relational `brands: { name: { equals: brand, mode: 'insensitive' } }`.
       - Validated `warehouseId` format before querying `stock_balances` to avoid invalid UUID syntax errors.
  2. Updated `src/routes/api/pos/products.ts`:
     - Queried tenant categories from `prisma.categories.findMany` and returned them in `data.categories`.
  3. Updated `src/features/pos/components/pos-main-screen.tsx`:
     - Removed inline render `setState` loop (`prevItems` tracking against unstable `[]`), wrapping `rawItems` in `useMemo`.
     - Populated `categories` declaratively using server-returned `catalogData.categories` with fallback to item categories, eliminating infinite re-render loops and preventing connection pool exhaustion (`EMAXCONNSESSION`).
  4. Added comprehensive test coverage in `src/__tests__/pos-products-api.test.ts` verifying UUID validation and query construction for both UUID and category/brand names.
- **Prevention**: Never pass unvalidated string parameters directly to Prisma UUID columns. Never perform synchronous `setState` in render or effects on unstable array fallbacks (`catalogData?.items || []`) which cause infinite re-render loops and server connection pool exhaustion.
- **Status**: Fixed

---

## [2026-09-19 03:15] - Prisma Client Browser Usage Error in Promotions Module

- **Type**: Integration
- **Severity**: High
- **File**: `src/features/promotions/hooks/use-inv-promotions.ts:78`
- **Agent**: @backend-specialist
- **Root Cause**: The client-side TanStack Query hooks in `src/features/promotions/hooks/` (`use-inv-promotions.ts`, `use-inv-coupons.ts`, `use-inv-approvals.ts`, `use-discount-analytics.ts`) directly imported and executed server CRUD functions (`createPromotion`, `getPromotions`, `createCoupon`, etc.) from `@/server/fns/promotions-crud.ts`. Because these were plain TypeScript functions rather than HTTP endpoints, Vite bundled `promotions-crud.ts` into the browser bundle. When executed in the browser, accessing `@/lib/prisma` threw an error because `PrismaClient` is prohibited from running client-side.
- **Error Message**:
  ```
  handle-server-error.ts:7 Error: PrismaClient cannot be used in the browser. Please use an API route or server function.
      at Object.get (prisma.ts:37:15)
      at resolveTenantId (tenant.ts:28:36)
      at requireTenantId (tenant.ts:59:26)
      at createPromotion (promotions-crud.ts:245:26)
      at Object.mutationFn (use-inv-promotions.ts:78:14)
  ```
- **Fix Applied**:
  1. Created server API routes in `src/routes/api/`:
     - `src/routes/api/promotions.ts`: handles GET, POST (create/duplicate), PATCH (update/status), DELETE.
     - `src/routes/api/coupons.ts`: handles GET, POST (create/bulk), PATCH (update/status), DELETE.
     - `src/routes/api/discount-approvals.ts`: handles GET, POST (create/review).
     - `src/routes/api/discount-reports.ts`: handles GET analytics.
  2. Created `src/features/promotions/data/actions.ts` using `authorizedRequest` with Supabase session tokens to call the `/api/` endpoints from the browser.
  3. Decoupled all promotion client hooks from `@/server/fns/`, ensuring zero direct Prisma imports in browser-facing bundles.
  4. Added unit tests in `src/__tests__/promotions-api-actions.test.ts` verifying all HTTP actions and query parameters.
- **Prevention**: Never import server-only files or Prisma utilities into client-side React hooks or components. Always establish API routes under `src/routes/api/` with `withAuth` and dispatch client calls via `authorizedRequest`.
- **Status**: Fixed

---

## [2026-09-19 02:45] - Prisma Client Error: Unknown field `name_ar` for select statement on model `products` in /api/pos/products

- **Type**: Integration
- **Severity**: High
- **File**: `src/routes/api/pos/products.ts:61`
- **Agent**: @backend-specialist
- **Root Cause**: `src/routes/api/pos/products.ts` attempted to select `name_ar`, `tax_rate_id`, and `tax_rates` on `model products`, as well as `base_price`, `cost_price`, `variant_attributes`, and `product_images` on `model product_variants`. In addition, its `search` filter referenced `product_barcodes` as a direct relation on `products`. None of these fields or relations exist on `products` in `schema.prisma`. Taxes are stored in the standalone `tax_rates` table and pricing is maintained under `price_list_items`.
- **Error Message**:
  ```
  Invalid `prisma.products.findMany()` invocation in
  src/routes/api/pos/products.ts:61:27

  Unknown field `name_ar` for select statement on model `products`. Available options are marked with ?.
  ```
- **Fix Applied**:
  1. Updated `src/routes/api/pos/products.ts`:
     - Removed non-existent fields (`name_ar`, `tax_rate_id`, `tax_rates`) from `prisma.products.findMany({ select: ... })`.
     - Removed non-existent fields (`base_price`, `cost_price`, `variant_attributes`, `product_images`) from `product_variants` select.
     - Added `price_list_items: { select: { price: true, cost_price: true }, take: 1 }` on `product_variants` and `products`.
     - Queried tenant's active tax rate via `prisma.tax_rates.findFirst(...)` and mapped `taxRateId`, `taxRate`, `taxInclusive` to POS items.
     - Fixed `product_barcodes` search by querying `product_barcodes` table directly for matching variant IDs instead of using a non-existent relation.
     - Implemented safe fallback mapping for standalone products without variants.
  2. Updated `src/server/fns/pos-pricing-resolver.ts`:
     - Removed non-existent `tax_rate_id` and `tax_rates` from products select in `resolvePosVariantPrices()`.
     - Fetched active tax rate from `prisma.tax_rates.findFirst(...)`.
     - Removed non-existent `is_active` filter on `price_list_items` and added robust fallback lookup when no specific candidate price list is configured.
  3. Added comprehensive test coverage in `src/__tests__/pos-products-api.test.ts` and verified all POS tests pass.
- **Prevention**: Always verify model fields and relations directly against `prisma/schema.prisma` before issuing Prisma queries. Do not assume fields exist across relational models without checking model definitions.
- **Status**: Fixed

---

- **Type**: Integration
- **Severity**: High
- **File**: `src/features/pos/data/api.ts:416`
- **Agent**: @backend-specialist
- **Root Cause**: During UUID normalization in migration `20260814000000_normalize_db_and_uuid_pks`, the `shipments` table primary key was normalized to `id UUID` (without any column named `shipment_id`). In `src/features/pos/data/api.ts`, `getNonRestaurantShipments`, `updateNonRestaurantShipment`, and `getPosShipmentDetails` still queried `.select('shipment_id, ...')`, `.order('shipment_id')`, and `.eq('shipment_id', ...)`. In addition, functions parsed shipment IDs with `Number(shipmentId)`, which produced `NaN` for UUID values.
- **Error Message**:
  ```json
  {
    "failureCount": 0,
    "error": {
      "code": "42703",
      "details": null,
      "hint": null,
      "message": "column shipments.shipment_id does not exist"
    }
  }
  ```
- **Fix Applied**:
  1. Updated `src/features/pos/data/api.ts`:
     - Updated `NonRestaurantShipment` and `ShipmentsRow` to support UUID string identifiers and optional timestamps.
     - In `getNonRestaurantShipments()`, changed `.select(...)` to query `id, sales_invoice_id, order_id, ...` and ordered by `created_at DESC` (falling back gracefully).
     - In `updateNonRestaurantShipment()`, `getNonRestaurantShipmentDetails()`, and `getPosShipmentDetails()`, updated queries and filters to use `id` with string/UUID parameter validation instead of forcing `numericShipmentId`.
     - In `mapNonRestaurantShipmentRow()`, safely resolved `id`, `shipment_id`, and `order_id` whether provided as string or number without producing `NaN`.
     - In `getNonRestaurantShipmentDetails()`, added fallback order lookup for `sales_orders` when `sales_invoice_id` is not present.
  2. Updated `src/features/pos/components/non-restaurant-shipments-board.tsx`:
     - Updated `openDetailsSheet`, `submitEdit`, and `handleQuickStatusAction` to preserve string/UUID identifiers.
     - Formatted table rows and dialogs to safely truncate UUIDs (e.g. `#e1234567`) while keeping key uniqueness.
  3. Added `created_at` and `updated_at` to `model shipments` in `prisma/schema.prisma` and created migration `20260919030000_add_shipments_timestamps`. Applied the columns to PostgreSQL.
  4. Added test cases in `src/features/pos/data/__tests__/shipments-api.test.ts` for UUID string mapping and verified with Vitest (13/13 passing).
- **Prevention**: Whenever database tables are normalized from integer primary keys to UUIDs (`id UUID`), ensure all Supabase client queries and data mapping functions are updated from legacy field names (`<table_name>_id`) to `id`, and ensure IDs are treated as strings rather than coerced to numbers.
- **Status**: Fixed

---

## [2026-09-18 23:35] - Missing PostgreSQL RPC public.set_purchase_order_status(p_po_id, p_status) in Schema Cache

- **Type**: Integration
- **Severity**: High
- **File**: `src/server/fns/purchase-orders.ts:32`
- **Agent**: @backend-specialist
- **Root Cause**: `setPurchaseOrderStatus` invoked `supabaseAdmin.rpc('set_purchase_order_status', { p_po_id, p_status })`, but the function never existed in the live PostgreSQL database. The legacy migration `20260713120000_purchase_doc_rpcs` defined the function with `p_po_id integer` and referenced obsolete columns (`po_id`, `auth_user_id`) that were removed or renamed during the UUID normalization migration `20260814000000`. The migration was never successfully applied, leaving the function absent from `pg_proc`.
- **Error Message**:
  ```json
  {
    "success": false,
    "message": "Could not find the function public.set_purchase_order_status(p_po_id, p_status) in the schema cache",
    "error": {
      "message": "Could not find the function public.set_purchase_order_status(p_po_id, p_status) in the schema cache"
    }
  }
  ```
- **Fix Applied**:
  1. Created migration `prisma/migrations/20260918234500_purchase_order_lifecycle_rpcs/migration.sql` with modern PL/pgSQL implementation using `p_po_id uuid` parameter, `id` column references, and full lifecycle state machine validation.
  2. Applied migration to Supabase PostgreSQL database via `scripts/apply-po-lifecycle-migration.ts`.
  3. Granted `EXECUTE` permissions to `authenticated`, `service_role`, and `anon` roles.
  4. Triggered `NOTIFY pgrst, 'reload schema'` to refresh PostgREST schema cache.
  5. Added `PO_NOT_FOUND` and `PO_INVALID_TRANSITION` error codes to `RPC_ERROR_MAP` in `src/server/utils/api-error.ts`.
  6. Verified RPC call works via `scripts/test-po-rpc.ts` — idempotent call returned `{ po_id, from: 'draft', to: 'draft' }` with `error: null`.
- **Prevention**: Whenever defining server functions that call Supabase RPCs, ensure corresponding database functions are deployed with correct parameter types matching the current schema (UUID not integer), granted to PostgREST roles, and verified with integration tests.
- **Status**: Fixed

---

## [2026-09-18 22:30] - ZodError: expected number, received NaN on /inventory-movements (qty_in and qty_out undefined)

- **Type**: Integration
- **Severity**: High
- **File**: `src/features/inventory-movements/data/schema.ts:18`
- **Agent**: @fullstack-specialist
- **Root Cause**: The `inventory_movements` database table stores signed deltas in `quantity_delta` (positive for inward stock, negative for outward stock) rather than discrete `qty_in` and `qty_out` columns. When querying `inventory_movements`, the backend returned raw rows where `qty_in` and `qty_out` were `undefined`. In `src/features/inventory-movements/data/schema.ts`, `movementRowSchema` declared `qty_in: z.coerce.number()` and `qty_out: z.coerce.number()`. Because `Number(undefined)` evaluates to `NaN`, Zod threw `Invalid input: expected number, received NaN` for every record in the ledger.
- **Error Message**:
  ```json
  {
    "failureCount": 0,
    "error": {
      "name": "ZodError",
      "message": "[{\"expected\": \"number\", \"code\": \"invalid_type\", \"received\": \"NaN\", \"path\": [\"data\", 0, \"qty_in\"], \"message\": \"Invalid input: expected number, received NaN\"}, {\"expected\": \"number\", \"code\": \"invalid_type\", \"received\": \"NaN\", \"path\": [\"data\", 0, \"qty_out\"], \"message\": \"Invalid input: expected number, received NaN\"}]"
    }
  }
  ```
- **Fix Applied**:
  1. Updated `src/server/fns/inventory-movements.ts`:
     - Computed `qty_in` and `qty_out` from `quantity_delta` (`qty_in = delta > 0 ? delta : 0`, `qty_out = delta < 0 ? Math.abs(delta) : 0`).
     - Serialized Decimal fields (`quantity_delta`, `unit_cost`, `total_cost`, `qty_before`, `qty_after`) to numbers.
     - Converted `movement_no` `BigInt` to string to avoid JSON serialization failures.
     - Serialized `movement_date`, `occurred_at`, `created_at` dates to ISO strings.
     - Fetched `warehouse_locations` and enriched variant information (`barcode`, `name`).
     - Handled location filtering where `warehouseId === storeId` via an `OR` clause.
  2. Updated `src/features/inventory-movements/data/schema.ts`:
     - Added resilient `safeNumber` and `safeNullableNumber` preprocessors that convert undefined/null/NaN to default numbers instead of throwing.
     - Added schema transform to automatically derive `qty_in` and `qty_out` from `quantity_delta` if not already provided.
  3. Updated `src/features/inventory-movements/index.tsx`:
     - Displayed both warehouse and store options in location filter and dispatched the appropriate ID parameter.
  4. Updated `src/server/fns/serials.ts` and `src/features/serials/data/schema.ts` to similarly prevent `NaN` ZodErrors on serial movement trails.
  5. Added unit and server integration tests in `src/__tests__/inventory-movements-schema.test.ts` and `src/__tests__/inventory-movements-server.test.ts` (6/6 passing).
- **Prevention**: In Zod schemas parsing API payloads, avoid `z.coerce.number()` on fields that might be `undefined` or `null` from the database. Use `z.preprocess()` with fallback defaults or schema transforms, and ensure server functions explicitly compute and serialize domain-specific fields from underlying DB columns.
- **Status**: Fixed

---

## [2026-09-17 18:45] - Missing PostgreSQL RPC public.confirm_sales_order(p_order_id) in Schema Cache

- **Type**: Integration
- **Severity**: High
- **File**: `src/server/fns/sales-orders.ts:622`
- **Agent**: @backend-specialist
- **Root Cause**: `confirmOrder` invoked `supabaseAdmin.rpc('confirm_sales_order', { p_order_id })`, but `confirm_sales_order` and accompanying sales order lifecycle RPCs were not deployed to PostgreSQL because legacy migration `20260713130000_sales_order_rpcs` contained references to a non-existent `post_inventory_movement` function and obsolete column names (`auth_user_id`).
- **Error Message**:
  ```json
  {
    "success": false,
    "message": "Could not find the function public.confirm_sales_order(p_order_id) in the schema cache",
    "error": {
      "message": "Could not find the function public.confirm_sales_order(p_order_id) in the schema cache"
    }
  }
  ```
- **Fix Applied**:
  1. Created migration `prisma/migrations/20260917190000_sales_order_lifecycle_rpcs/migration.sql` with modern multi-tenant PL/pgSQL implementations of `confirm_sales_order`, `set_sales_order_status`, `cancel_sales_order`, `fulfill_sales_order`, and `invoice_sales_order`.
  2. Implemented atomic stock reservation logic in `confirm_sales_order`: locks sales order, resolves effective warehouse, checks `allow_negative_stock`, updates `stock_balances` (`qty_reserved`, `qty_available`), creates `stock_reservations` records, records audit entries in `inventory_movements`, and transitions order to `'confirmed'`.
  3. Applied migration to Supabase PostgreSQL database, granted permissions to authenticated, service_role, and anon, and triggered PostgREST schema cache reload (`NOTIFY pgrst, 'reload schema'`).
  4. Enhanced `rpcError` in `src/server/utils/api-error.ts` to surface detailed error messages and map `ORDER_NOT_FOUND` and `ORDER_INVALID_TRANSITION`.
  5. Added comprehensive test coverage in `src/__tests__/sales-order-confirm.test.ts` (5/5 tests passing).
- **Prevention**: Whenever defining server functions that call Supabase RPCs, ensure corresponding database functions are deployed, granted, and covered by unit/integration tests that mock or verify schema contracts.
- **Status**: Fixed

---

## [2026-09-12 03:45] - React Hook Order Violation in PriceListViewDialog (Early Return Before useMemo)

- **Type**: Runtime
- **Severity**: High
- **File**: `src/features/price-list/components/price-list-view-dialog.tsx:49`
- **Agent**: @frontend-specialist
- **Root Cause**: `PriceListViewDialog` contained an early return `if (!currentRow) return null` placed after `useState` but before three `useMemo` hooks (`distinctProductCount`, `priceRange`, `filteredItems`). When the dialog was closed (`currentRow === null`), only 15 hooks ran before returning null. When a user clicked "View", `currentRow` was set, causing React on the next render to execute beyond the early return into hook 16 (`useMemo`), violating the Rules of Hooks: "Rendered more hooks than during the previous render".
- **Error Message**: 
  ```
  React has detected a change in the order of Hooks called by PriceListViewDialog.
  Error: Rendered more hooks than during the previous render.
      at PriceListViewDialog (price-list-view-dialog.tsx:69:32)
  ```
- **Fix Applied**: Extracted the dialog presentation and data computation into an inner component `PriceListViewDialogContent`. The outer `PriceListViewDialog` only calls `usePriceListContext` unconditionally and renders `<Dialog open={isOpen}>` with `<PriceListViewDialogContent>` conditionally mounted only when `isOpen && currentRow`. This guarantees that hooks inside the content component run only while mounted and in an invariant order.
- **Prevention**: Never place early returns before hook declarations in React components. For complex dialogs/sheets with conditional data, encapsulate the content into a dedicated subcomponent that mounts conditionally inside the dialog container.
- **Status**: Fixed

---

## [2026-09-12 03:35] - TypeError: t is not a function in OrderCreateDialog (Local Variable Shadowing)

- **Type**: Logic
- **Severity**: Critical
- **File**: `src/features/sales-orders/components/create-dialog.tsx:474`
- **Agent**: antigravity-ide
- **Root Cause**: Inside `items.map((item, index) => { ... })`, the line calculation extracted `taxAmount` as `const t = Number(item.taxAmount) || 0`. This local variable shadowed the outer `t` function returned by `useTranslation()`. When JSX rendered translation keys like `{t('salesOrders.form.product', 'Product')}`, JavaScript attempted to invoke the numeric variable `t` (value `0`) as a function, throwing `TypeError: t is not a function`.
- **Error Message**: 
  ```
  TypeError: t is not a function
      at create-dialog.tsx:486:32
      at Array.map (<anonymous>)
      at OrderCreateDialog (create-dialog.tsx:466:26)
  ```
- **Fix Applied**: 
  1. Renamed local variable `t` to `tax` in line 474 and line 207 of `src/features/sales-orders/components/create-dialog.tsx`.
  2. Verified across the entire repository that no other file uses `const t =` or shadows the translation function.
  3. Ran test suite to confirm 49/49 test files passed.
- **Prevention**: Never use single-letter variable `t` for mathematical variables or calculations in React components that consume `useTranslation()`. Use descriptive names such as `tax` or `taxAmt`.
- **Status**: Fixed

---

## [2026-09-12 03:30] - SyntaxError: The requested module '/src/config/i18n.ts' does not provide an export named 'useTranslation'

- **Type**: Agent
- **Severity**: High
- **File**: `src/config/i18n.ts:38`
- **Agent**: antigravity-ide
- **Root Cause**: `useTranslation` was re-exported from `src/config/i18n.ts` and imported as `import { useTranslation } from '@/config/i18n'`. Vite dev server's ESM dependency optimizer treats pre-bundled packages and local files differently during HMR, causing Vite to fail resolving named exports of pre-bundled hooks from a local file, causing `SyntaxError` and leaving `t` as `undefined` (`TypeError: t is not a function`).
- **Error Message**: 
  ```
  SyntaxError: The requested module '/src/config/i18n.ts' does not provide an export named 'useTranslation'
  TypeError: t is not a function
      at src/features/sales-orders/components/create-dialog.tsx
  ```
- **Fix Applied**: 
  1. Standardized all 33 files across `sales-orders`, `purchase-orders`, `purchase-requisitions`, `reorder-rules`, and `replenishment` to import directly from canonical package: `import { useTranslation } from 'react-i18next'`.
  2. Removed named re-exports from `src/config/i18n.ts`.
  3. Verified all 49 test suites (278 tests) pass cleanly.
- **Prevention**: Always import React hooks directly from their respective npm packages (e.g., `'react-i18next'`) instead of re-exporting them through local utility or config files.
- **Status**: Fixed

---

## [2026-09-12 03:05] - TanStack Table Faceted Filter TypeError (Cannot read properties of undefined reading 'length')

- **Type**: Runtime
- **Severity**: High
- **File**: `src/features/inventory/components/inventory-columns.tsx:281`
- **Agent**: antigravity-ide
- **Root Cause**: The `status` column in `inventory-columns.tsx` was configured with only `id: 'status'` but lacked an `accessorFn` or `accessorKey`. When `DataTableFacetedFilter` invoked `column.getFacetedUniqueValues()`, TanStack Table called `row.getUniqueValues('status')`, which returned `undefined` because `column.accessorFn` was not defined. In `@tanstack/react-table`, `for (let j = 0; j < values.length; j++)` failed trying to read `.length` on `undefined`, triggering React's route ErrorBoundary on `/inventory`.
- **Error Message**: 
  ```
  TypeError: Cannot read properties of undefined (reading 'length')
      at @tanstack_react-table.js:2807:34
      at Object._getFacetedUniqueValues (@tanstack_react-table.js:76:14)
      at column.getFacetedUniqueValues (@tanstack_react-table.js:492:21)
      at DataTableFacetedFilter (faceted-filter.tsx:14:28)
  ```
- **Fix Applied**: 
  1. Added `accessorFn: (row) => getInventoryStatus(row)` and `filterFn` to column `id: 'status'` in `inventory-columns.tsx`.
  2. Updated `warehouse` and `product_name` columns in `inventory-columns.tsx` to provide safe string returns and multi-select `filterFn`.
  3. Aligned `statusFilterOptions` and KPI card filter state in `inventory-table.tsx` with standardized machine keys (`'in_stock'`, `'low_stock'`, `'out_of_stock'`, `'overstocked'`).
  4. Wrapped `column?.getFacetedUniqueValues()` with defensive `try/catch` in `src/components/data-table/faceted-filter.tsx` to prevent cascading app crashes if any future table column ever lacks an accessor.
- **Prevention**: Every table column supplied to `DataTableToolbar`'s `filters` prop MUST have a concrete `accessorFn` or `accessorKey` and a multi-select `filterFn`.
- **Status**: Fixed

---

- **Type**: Runtime
- **Severity**: Low
- **File**: `src/features/stock-balances/components/stock-movement-drawer.tsx:71`
- **Agent**: antigravity-ide
- **Root Cause**: `SheetDescription` (via Radix `DialogPrimitive.Description`) renders a `<p>` tag by default. Nested `<div>` elements inside `SheetDescription` (used for the SKU and facility metadata flex row) violated HTML5 nesting rules, triggering React's `validateDOMNesting` warning (`In HTML, <div> cannot be a descendant of <p>`) and risking hydration mismatches.
- **Error Message**: 
  ```
  In HTML, <div> cannot be a descendant of <p>.
  This will cause a hydration error.
  <p id="radix-_r_15_" data-slot="sheet-description" className="text-muted-foreground space-y-1 text-sm">
    <span>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
  ```
- **Fix Applied**: Added `asChild` prop to `<SheetDescription>` in [stock-movement-drawer.tsx](file:///e:/web-projects/web-mobile-work-apps/inventory_marketplace/react-ecommerce-restuarant/src/features/stock-balances/components/stock-movement-drawer.tsx) so that it forwards attributes to an outer container `<div>` instead of rendering an enclosing `<p>` tag.
- **Prevention**: Always pass `asChild` to `<DialogDescription>` or `<SheetDescription>` when wrapping structured block elements, metadata bars, or flex layouts.
- **Status**: Fixed

---

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

## [2026-09-09 01:55] - ProductVariantBrief Property 'price' and 'cost_price' Missing

- **Type**: Syntax / Integration
- **Severity**: Medium
- **File**: `src/features/price-list/components/price-list-action-dialog.tsx:157`
- **Agent**: antigravity-ide (@frontend-specialist)
- **Root Cause**: Following the decoupling of the pricing and inventory modules, `price` and `cost_price` were removed from `product_variants` and transferred to `price_list_items`. The TypeScript interface `ProductVariantBrief` in `src/features/price-list/data/schema.ts` was correctly updated to exclude them, but `PriceListActionDialog` (and `PriceListViewDialog`) still accessed `v.price`, `v.cost_price`, `existing?.product_variants?.price`, and `item.product_variants?.cost_price`.
- **Error Message**: 
  ```
  Property 'price' does not exist on type 'ProductVariantBrief'.
  Property 'cost_price' does not exist on type 'ProductVariantBrief'.
  ```
- **Fix Applied**: 
  1. Updated `PriceListActionDialog` to read prices and costs directly from existing `price_list_items` (`existing?.price`, `existing?.cost_price`, `item.price`, `item.cost_price`) with fallback to `currentRow.price` and `0`.
  2. Fixed `cost_price` to default to `0` instead of `null` to align with `priceListItemFormSchema`.
  3. Added `value={field.value ?? ''}` to the default price `<Input />` field to satisfy React `<Input />` value typing.
  4. Updated `PriceListViewDialog` to read `item.cost_price` directly and display the cost price column appropriately.
- **Prevention**: When removing fields during schema decoupling, run typechecks across all feature dialogs and consumer components that map joined relations to ensure no orphaned field accesses remain.
- **Status**: Fixed

---

## [2026-09-12 02:00] - Invalid i18n Import Path Causing 500 Error in Stock Counts Module

- **Type**: Integration
- **Severity**: High
- **File**: `src/features/stock-counts/components/columns.tsx:3`
- **Agent**: antigravity-ide (@frontend-specialist)
- **Root Cause**: `columns.tsx` in `stock-counts` (and `stock-by-location`) attempted to import `i18n` from `@/i18n`. The i18n instance is configured at `@/config/i18n`. Because `@/i18n` does not exist, Vite failed to resolve the import with a 500 Internal Server Error when TanStack Router loaded the `/stock-counts` lazy route component.
- **Error Message**: 
  ```
  Failed to resolve import "@/i18n" from "src/features/stock-counts/components/columns.tsx". Does the file exist?
  GET http://localhost:5191/src/features/stock-counts/components/columns.tsx net::ERR_ABORTED 500 (Internal Server Error)
  TypeError: Failed to fetch dynamically imported module: http://localhost:5191/src/routes/_authenticated/stock-counts/index.tsx?tsr-split=component
  ```
- **Fix Applied**: 
  1. Updated import in `src/features/stock-counts/components/columns.tsx` from `@/i18n` to `@/config/i18n`.
  2. Proactively updated identical import in `src/features/stock-by-location/components/columns.tsx` from `@/i18n` to `@/config/i18n`.
  3. Verified both endpoints return HTTP 200 OK through the Vite dev server.
- **Prevention**: Enforce import path standards for the i18n singleton (`@/config/i18n`) across all feature column definitions.
- **Status**: Fixed

---
