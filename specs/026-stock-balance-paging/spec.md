# Feature Specification: Stock Balance Server-Side Lazy Pagination & Dynamic SKU Search

**Feature Branch**: `026-stock-balance-paging`  
**Created**: 2026-09-25  
**Status**: Draft  
**Input**: User description: "enhance stock balance table and make it paging to load data lazy and when add new stock balance (New Stock Adjustment), in product variant sku load data lazy and make it server side search to not load data from product at once, make the code effeciant and clean"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paginated Stock Balance Ledger Browsing & Lazy Loading (Priority: P1)

As an inventory controller or warehouse manager, I need to browse through multi-facility stock balances with on-demand server-side pagination so that the ledger loads quickly, pagination controls reflect true total counts, and the application does not consume excessive memory or freeze when managing thousands of product SKUs.

**Why this priority**: Without server-side pagination, loading unbounded stock balances degrades browser responsiveness, causes network overhead, and fails when product catalogs scale. This is the fundamental requirement for scalable inventory tracking.

**Independent Test**: Can be fully tested by accessing the stock balances page in an environment with over 10,000 inventory balance records, navigating across pages (next, previous, jump to page), changing page sizes (10, 20, 50, 100), and observing rapid page responses with accurate total item counts, correct page indicators, and zero browser memory bloat.

**Acceptance Scenarios**:

1. **Given** an inventory catalog containing 8,000 balance records across warehouses and stores, **When** the user opens the Stock Balances page, **Then** only the first page slice (e.g. 20 records) is loaded initially, displaying accurate total counts such as "Showing 1-20 of 8,000 records" along with correct summary metrics.
2. **Given** the user is viewing page 1 of the balances ledger, **When** the user clicks "Next Page" or selects page 4, **Then** only the requested page slice is fetched lazily and displayed with non-disruptive loading feedback, while the page index updates accordingly.
3. **Given** the user wants to see more rows at once, **When** the user selects "50 per page" from the page size dropdown, **Then** the ledger re-fetches with 50 rows per page and recalculates total pages accordingly.
4. **Given** the user enters a search term in the table filter, **When** typing pauses, **Then** the search query is executed on the server, the table resets to page 1, and the pagination indicators reflect the matching filtered count.

---

### User Story 2 - Server-Side SKU Search & Lazy Loading in Stock Adjustment (Priority: P1)

As an inventory clerk or stock auditor creating a new stock adjustment or entering opening stock, I need the Product Variant SKU selector to search and fetch matching items lazily from the server rather than downloading the entire product catalog upfront, so that the adjustment modal opens instantly and SKU selection remains fast and clean regardless of catalog size.

**Why this priority**: Pre-fetching all products and variants upfront into a dropdown causes long modal opening delays, heavy bandwidth usage, and browser crashes on large catalogs. Server-side lazy search makes adjustment creation instantaneous and lightweight.

**Independent Test**: Can be fully tested by clicking "New Stock Adjustment" in an enterprise tenant with 50,000 product variants, verifying that the modal opens immediately without preloading products, and typing 3 characters in the SKU selector returns matching items within milliseconds with debounced server queries.

**Acceptance Scenarios**:

1. **Given** a user opens the "New Stock Adjustment" dialog, **When** the dialog renders, **Then** it opens immediately without loading or waiting for all catalog products or variants in the background.
2. **Given** the user clicks on the Product Variant SKU selector, **When** the user types "BEV-00" into the search field, **Then** the query is debounced, a lazy server search retrieves only matching variants (up to a reasonable limit such as 20 items), and results display the SKU, product name, and barcode.
3. **Given** the user selects a search result from the variant list, **When** chosen, **Then** the variant SKU and product name are cleanly populated, the standard unit cost is auto-filled if available, and the input retains the selected item without triggering redundant catalog downloads.
4. **Given** the user adjusts stock directly from an existing row in the stock balance table, **When** the adjustment dialog opens, **Then** the specific variant is pre-loaded and displayed immediately without requiring a full catalog search.

---

### User Story 3 - Facility & Stock Health Filtering with Synchronized Pagination (Priority: P2)

As a warehouse supervisor or inventory manager, I need to filter stock balances by facility type (All, Alerts, Warehouses, Stores) and inventory condition, with server-side pagination synchronizing automatically with active filters, so that I can audit specific locations without incorrect page boundaries or stale counts.

**Why this priority**: Users frequently need to isolate warehouse inventory from retail store inventory, or review critical low-stock alerts. Filtering must be processed on the server to return accurate slice counts.

**Independent Test**: Can be fully tested by selecting the "Warehouses" tab or the "Alerts" tab, verifying that the server returns only matching records for that category, resets to page 1, and displays accurate counts and metrics for the filtered view.

**Acceptance Scenarios**:

1. **Given** the user is viewing the "All" tab on page 5, **When** the user switches to the "Alerts" (Low/Out of Stock) tab, **Then** the server queries only records matching alert thresholds, the active page resets to page 1, and total records reflect the alert count.
2. **Given** the user selects the "Warehouses" tab, **When** the ledger renders, **Then** only stock balances associated with warehouses are displayed, excluding store balances.
3. **Given** multiple active filters are applied, **When** the user resets or changes filters, **Then** the table maintains consistent sorting, pagination boundaries, and clear empty states if no items match.

---

### User Story 4 - Live Facility Balance & Cost Inspection in Adjustment (Priority: P2)

As a stock auditor, after selecting a facility and a product variant in the adjustment dialog, I need immediate visibility of the current on-hand quantity at that facility and real-time computation of the projected new balance based on the adjustment type (set vs offset), so that I can prevent unintentional negative stock or balance errors.

**Why this priority**: Clear balance verification prevents accounting variances and operational errors during manual count reconciliations.

**Independent Test**: Can be fully tested by selecting a warehouse and a SKU, confirming that the current on-hand quantity appears instantly, and toggling between "set" (replace) and "offset" (+/- delta) displays accurate projected balances.

**Acceptance Scenarios**:

1. **Given** a selected warehouse and product variant in the New Stock Adjustment dialog, **When** both fields are chosen, **Then** the system displays the current recorded on-hand quantity for that specific facility.
2. **Given** current on-hand quantity is 10 and the adjustment type is "offset" with quantity +5, **When** entered, **Then** the projected new balance indicator immediately displays 15.
3. **Given** an adjustment type is "set" with quantity 8, **When** entered, **Then** the projected new balance displays 8 with an indicated delta of -2.

---

### Edge Cases

- **Zero Matching SKU Search**: When a user searches for a SKU or barcode that does not exist, the dropdown displays a clean, user-friendly empty state: "No matching product variants found" with advice to verify the search query.
- **Debounced Keystrokes**: Fast typing in the SKU search field debounces network requests (e.g. 300ms) so intermediate keystrokes do not flood the server.
- **Page Overflow after Filtering**: If a user is on page 10 and applies a filter or search that produces only 2 pages of results, the system automatically resets the active page index to 1.
- **Concurrent Ledger Updates**: If stock balances change while browsing, deterministic server ordering (by last movement or updated timestamp descending) ensures consistent row ordering across page slices.
- **Pre-selected Variant on Row Action**: Opening the adjustment dialog for an existing row retains the variant, facility, and current on-hand balance without triggering an unneeded search query.
- **Network Disconnection / Timeout**: If a page request or SKU search fails due to connectivity issues, an inline error state with a retry option is presented without corrupting active form or filter inputs.
- **Right-to-Left (RTL) & Internationalization**: All pagination controls, dropdown items, search inputs, badges, and feedback cards render correctly in RTL (Arabic) and LTR (English) locales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement server-side pagination for the stock balances ledger, fetching only the requested page slice from the server based on page index and page size.
- **FR-002**: The system MUST support configurable page sizes of 10, 20, 50, and 100 items per page, defaulting to 20 items per page.
- **FR-003**: The system MUST compute and return the accurate total count of matching stock balance records on the server so pagination navigation (previous, next, page numbers, first, last) operates accurately.
- **FR-004**: The system MUST support server-side text searching across product SKU, barcode, and product title for the stock balances table.
- **FR-005**: The system MUST support server-side filtering by facility type (all, warehouses only, stores only) and stock health status (all, low stock, out of stock).
- **FR-006**: The system MUST automatically reset pagination to page 1 whenever search terms, facility tabs, or status filters change.
- **FR-007**: The system MUST implement lazy loading and server-side search for product variant SKUs in the stock adjustment workflow, removing upfront bulk loading of all products and variants.
- **FR-008**: The system MUST debounce user search inputs for the product variant SKU selector before issuing server requests.
- **FR-009**: The SKU selector MUST display matching results showing SKU code, product title, and barcode, with clear loading indicators while querying.
- **FR-010**: When a product variant is selected in the adjustment dialog, the system MUST retrieve and display the live on-hand quantity for the selected facility (warehouse or store) and auto-populate the standard unit cost.
- **FR-011**: When opening the adjustment dialog from an existing stock balance row, the system MUST directly pre-populate and display the row's variant without executing a catalog search.
- **FR-012**: The system MUST display non-blocking skeleton loaders during table page transitions and SKU searching to prevent layout shifts.
- **FR-013**: The system MUST provide clean empty states when no stock balance records match the query or when no variants match the SKU search.
- **FR-014**: All pagination controls, table headers, dialog components, and SKU search elements MUST support full internationalization (English and Arabic) with bidirectional RTL layout support.

### Key Entities *(include if feature involves data)*

- **Stock Balance**: Represents the physical and available inventory position of a specific product variant at a specific warehouse location or store. Attributes include on-hand quantity, reserved quantity, available quantity, average unit cost, total valuation, and last movement timestamp.
- **Product Variant**: A unique SKU/barcode combination belonging to a parent product. Attributes include SKU, barcode, variant name, parent product title, selling price, and standard cost price.
- **Stock Adjustment**: A transactional modification record recording manual balance corrections, physical count audits, damage write-offs, or initial stock entries. Attributes include target facility, product variant, condition, adjustment type (set vs offset), quantity, unit cost, reason code, and audit remarks.
- **Facility**: Physical site holding stock balances, categorized as either a Warehouse (with optional zone/bin locations) or a Retail Store.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Initial loading time of the stock balance ledger remains under 1.2 seconds regardless of whether the database contains 1,000 or 100,000 inventory records.
- **SC-002**: Opening the "New Stock Adjustment" dialog is instantaneous (under 200ms) with zero upfront bulk catalog downloads.
- **SC-003**: Product variant SKU search results display within 400ms after user pauses typing in the search input.
- **SC-004**: Browser memory consumption during stock balance browsing is reduced by over 70% compared to client-side data handling.
- **SC-005**: 100% of pagination counts, page indicators, and summary metrics match backend database totals for active filter parameters.
- **SC-006**: Page transitions between paginated balance ledger slices execute in under 500ms under standard network conditions.

## Assumptions

- Users accessing the stock balance ledger and adjustment dialog have appropriate tenant authorization and inventory permissions.
- Product variants have unique SKUs within each tenant organization.
- Standard 300ms debounce interval provides an optimal experience balancing server load and typing responsiveness.
- Default page size of 20 items aligns with the existing user interface standards across the application.
