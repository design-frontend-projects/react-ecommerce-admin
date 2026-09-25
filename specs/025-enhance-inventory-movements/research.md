# Phase 0 Research & Technical Decisions: Inventory Movements UI/UX & Server-Side Pagination

**Branch**: `025-enhance-inventory-movements`  
**Feature**: Enhance Inventory Movements UI/UX & Server-Side Pagination  
**Status**: Completed  

---

## 1. Server-Side Pagination & Cursor vs. Offset Strategy

### Decision
Implement deterministic **Offset-based pagination** (`page`, `pageSize`, `totalCount`, `totalPages`) on the server with Prisma 7, indexed on `(tenant_id, movement_date DESC, id DESC)`.

### Rationale
- Offset pagination aligns directly with TanStack Table's standard pagination controls (jumping to page N, choosing 10/20/50/100 page sizes, and showing total page counts).
- In inventory auditing, operators frequently need to jump to specific pages, sort by date, and understand total volume ("Page 4 of 280").
- Deterministic secondary ordering by `id DESC` prevents record shifting across page boundaries when concurrent movements are ingested.

### Alternatives Considered
- *Keyset/Cursor-based pagination*: Offers slight performance gains at extreme offsets (e.g. page 10,000+), but loses random-access page navigation, total pages indicator, and requires complex bi-directional cursors that degrade table UX.
- *Client-side pagination*: Already proven inadequate because downloading thousands of raw ledger rows causes network lag, excessive memory footprint, and browser freezing.

---

## 2. Server-Side Aggregate KPI Ribbon Calculation

### Decision
Compute summary metrics (Total Movement Records, Total Inbound Quantity, Total Outbound Quantity, Net Stock Delta) using a lightweight SQL aggregate query on the server matching the exact filter criteria (`tenant_id` + date range + location + movement type).

### Rationale
- Users need an accurate executive overview of inventory velocity across the entire filtered period, not just the 20 rows currently visible on the active page.
- Executing an indexed aggregation (`_sum: { quantity_delta: true }`, `_count: { id: true }`) alongside the paginated query in a `Promise.all` executes in single-digit milliseconds without scanning unnecessary row details.

### Alternatives Considered
- *Summarizing visible page rows*: Inaccurate and misleading; showing "Inbound: +12" when the warehouse received 4,500 units across the full week confuses managers.
- *Separate background analytics service*: Over-engineered for real-time ledger filtering. A targeted Prisma aggregate query within the same tenant context is fast and consistent.

---

## 3. URL State Persistence & TanStack Router Search Params

### Decision
Store active pagination state (`page`, `pageSize`) and filter parameters (`q`, `type`, `locationId`, `from`, `to`) in the URL search parameters, synchronizing TanStack Table state with browser navigation.

### Rationale
- Allows warehouse staff and auditors to bookmark specific views, share filtered links directly with teammates, and use browser back/forward buttons without losing their place.
- Provides immediate state restoration upon page refresh.

### Alternatives Considered
- *Pure in-memory React state (`useState`)*: State is lost on every browser reload or tab change; URLs cannot be shared between staff members.
- *Local storage persistence*: Bleeds filters across different sessions and makes deep linking between modules (e.g. from a Stock Alert to movements) awkward.

---

## 4. UI Architecture: Atomic Components & Slide-out Audit Drawer

### Decision
Refactor `src/features/inventory-movements` into a clean atomic structure:
- `components/inventory-movements-columns.tsx`: Declarative TanStack Table column definitions with semantic badges.
- `components/inventory-movements-table.tsx`: The table engine with row selection, skeleton rows, and empty state.
- `components/inventory-movements-toolbar.tsx`: Search bar, faceted filter dropdowns, date picker, column toggle, and export.
- `components/inventory-movements-kpi-ribbon.tsx`: 4 high-density metric summary cards.
- `components/inventory-movements-drawer.tsx`: Slide-out Radix/shadcn `Sheet` revealing granular transaction metadata.
- `components/inventory-movements-export.ts`: Streaming CSV builder.

### Rationale
- Conforms to Antigravity Rule 16 (Atomic component structure) and Senior Frontend Architecture principles.
- The slide-out drawer provides comprehensive audit depth (batch IDs, serials, unit costs, stock before/after, operator notes) without cluttering the horizontal table view or forcing navigation away from the current page.

### Alternatives Considered
- *Expanding sub-rows inline*: Clutters the table grid, breaks horizontal alignment, and creates awkward vertical scrolling.
- *Navigating to a separate movement detail page*: High friction for operators who need to quickly inspect multiple sequential transactions.

---

## 5. CSV Dataset Export Implementation

### Decision
Implement a client-initiated server export flow that requests all records matching current active filters (with a safety threshold cap of 5,000 records) and streams the sanitized CSV file directly to the browser with UTF-8 BOM encoding.

### Rationale
- Ensures full accounting compliance and audit compatibility with Microsoft Excel (supports UTF-8 Arabic and English text without corrupted characters).
- Capping at 5,000 records protects server resources while fulfilling 99.9% of routine audit and monthly reconciliation needs.

### Alternatives Considered
- *Exporting only the visible page (20 rows)*: Frustrates users who expect an export to contain the full dataset they just filtered.
- *Asynchronous background job queue (BullMQ)*: Unnecessary overhead for sub-5,000 record exports that generate in under 300ms.
