# Feature Specification: Reorder Rules UI/UX Enhancement, Virtualized SKU Selector & Server-Side Pagination

**Feature Branch**: `027-enhance-reorder-rules`  
**Created**: 2026-09-25  
**Status**: Draft  
**Input**: User description: "act as software engineer and enhnace ui/ux and translate static text in this module and load product vaiant from data page and use @tanstack/react-virtual package with pagination and use server side for saerch and pagination in reorder rules"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paginated Reorder Rules Browsing with Server-Side Search & Filtering (Priority: P1)

As an inventory controller, procurement specialist, or store manager, I need to browse and audit replenishment reorder rules using responsive server-side pagination, searching, and filtering so that the table renders quickly, accurate page counts are displayed, and browser performance remains seamless even when managing large inventories across multiple store locations.

**Why this priority**: Currently, reorder rules are fetched all at once on the client without server-side filtering or pagination. As store locations and product variants multiply into thousands, this causes high payload sizes, slower network responses, and degraded table responsiveness. Server-side pagination and search are fundamental to scalable replenishment operations.

**Independent Test**: Can be tested independently by loading the Reorder Rules page in a tenant with a large number of rules, executing text searches (by product SKU, product title, or store name), navigating across pages (next, previous, jump to page), changing page sizes (10, 20, 50, 100), sorting columns, and verifying that each interaction fetches only the targeted page slice with correct item counts and zero client-side lag.

**Acceptance Scenarios**:

1. **Given** a tenant with 5,000 configured reorder rules, **When** the user accesses the Reorder Rules page, **Then** only the first page slice (default 20 records) is loaded from the server, displaying total summary indicators (e.g., "Showing 1-20 of 5,000 rules") and pagination controls reflecting the true total page count.
2. **Given** the user is viewing the reorder rules table, **When** the user inputs a search keyword in the table toolbar (e.g., "Espresso" or "SKU-992"), **Then** the query is debounced, executed against the server across product name, SKU, and store name, and the table resets to page 1 displaying matching records and updated counts.
3. **Given** the user wants to inspect more rules simultaneously, **When** the user changes the page size selector from 20 to 50 or 100 rows per page, **Then** the table fetches and displays the expanded slice from the server and recalculates pagination indicators.
4. **Given** the user clicks on sortable column headers (such as Reorder Point, Safety Stock, or Created Date), **When** clicked, **Then** the ordering preference is dispatched to the server to return deterministically sorted records for the current page slice.
5. **Given** the user selects a store filter or an active/inactive status filter, **When** selected, **Then** the server returns only rules matching those criteria, updating the view and pagination indicators.

---

### User Story 2 - On-Demand Paginated & Virtualized Product Variant Selection (Priority: P1)

As an inventory planner creating or updating a reorder rule, I need the Product Variant selector in the rule dialog to search, paginate, and virtualize catalog items on demand rather than loading all catalog variants upfront into memory, so that the dialog opens instantly and variant selection remains lightning-fast regardless of catalog size.

**Why this priority**: Pre-loading full product catalogs into dropdowns causes significant modal opening freezes, unnecessary memory usage, and crashes on large inventories. A virtualized, paginated server-search selector ensures instant dialog rendering and buttery-smooth scrolling.

**Independent Test**: Can be tested independently by opening the "New Reorder Rule" dialog in an enterprise catalog with 50,000 variants, observing that the modal opens instantly without pre-fetching all variants, typing search keywords to receive debounced server results, and scrolling through high volumes of search results with smooth 60fps rendering without DOM bloat.

**Acceptance Scenarios**:

1. **Given** a user opens the "New Reorder Rule" dialog, **When** the dialog renders, **Then** it appears immediately without downloading the entire product catalog upfront.
2. **Given** the user clicks on the Product Variant selector, **When** the selector opens, **Then** initial variant options are loaded in paginated batches and rendered using list virtualization to minimize DOM elements.
3. **Given** the user enters a search term in the variant picker (e.g., SKU code, barcode, or product name), **When** typing pauses, **Then** a debounced request searches variants on the server and returns paginated matching items with clear visual loading feedback.
4. **Given** the user scrolls through dozens or hundreds of matching variants in the selector list, **When** scrolling, **Then** virtualized rendering maintains high responsiveness without scroll jank or memory leakage.
5. **Given** the user edits an existing reorder rule, **When** the dialog opens, **Then** the currently associated variant is preserved and displayed accurately even if it is not in the first search page slice.

---

### User Story 3 - Full Internationalization (i18n) & Arabic RTL Localization (Priority: P2)

As a multilingual retail operator or warehouse staff member using the system in English or Arabic, I need all text elements in the Reorder Rules module—including titles, descriptions, column headers, status badges, metric banners, dialog fields, placeholders, tooltips, validation alerts, empty states, and delete confirmation dialogs—to be fully translated and localized with proper right-to-left layout alignment so that users have a native language experience without hardcoded English text.

**Why this priority**: Missing translation keys or hardcoded English strings break the localized user experience, create confusion for non-English users, and disrupt enterprise multi-market compliance.

**Independent Test**: Can be tested independently by switching the interface language between English and Arabic, verifying that 100% of visible UI strings in the Reorder Rules module are localized into the selected language, numbers and badges display correctly, and RTL layout adjustments mirror seamlessly without visual clipping.

**Acceptance Scenarios**:

1. **Given** the user switches the application language to Arabic, **When** navigating to the Reorder Rules page, **Then** the page title, description, metric cards, table headers, filter placeholders, and pagination indicators display accurate Arabic translations with proper right-to-left alignment.
2. **Given** an Arabic-speaking user opens the New or Edit Reorder Rule dialog, **When** viewing form controls, **Then** all labels, field placeholders, help descriptions, supplier selectors, and buttons (Save, Cancel) display Arabic text.
3. **Given** a form validation error occurs (such as missing required fields or negative numbers), **When** triggered, **Then** error toasts and field validation messages render in the active language.
4. **Given** an item deletion is initiated, **When** the confirmation dialog appears, **Then** the dialog title, warning message, confirm button, and cancel button render in the active language.

---

### User Story 4 - Polished Replenishment Dashboard UI/UX & Metrics Overview (Priority: P2)

As an operations manager or inventory lead, I need a modern, visually coherent dashboard interface featuring replenishment KPI summaries (such as Total Rules, Active Rules, Inactive Rules, and Configured Stores), clear loading skeletons, refined filter controls, and contextual empty states so that I can quickly assess replenishment coverage and manage thresholds with high confidence.

**Why this priority**: A clear, visually engaging UI with KPI summaries and polished states elevates user efficiency, prevents cognitive overload, provides immediate status feedback, and aligns with the modern enterprise aesthetic standard of the application.

**Independent Test**: Can be tested independently by inspecting the Reorder Rules overview screen across desktop, tablet, and mobile viewport sizes, verifying that KPI metric cards accurately reflect current tenant statistics, skeleton loaders prevent layout shifts during page fetches, and empty states guide the user on next steps when no rules match search criteria.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Reorder Rules module, **When** the page renders, **Then** an overview KPI summary banner displays critical replenishment metrics: Total Rules, Active Rules, Inactive Rules, and Covered Stores.
2. **Given** the table or dialogs are fetching data, **When** loading is in progress, **Then** non-blocking skeleton placeholders preserve the layout and prevent visual jumping (zero cumulative layout shift).
3. **Given** a search or filter yields no matching results, **When** rendered, **Then** an informative empty state displays an icon, clear explanation, and a quick-action button to reset filters.
4. **Given** the user accesses the module from a tablet or mobile device, **When** viewed on smaller viewports, **Then** action buttons, filter inputs, dialogs, and tables adapt gracefully with horizontal scrolling and responsive controls.

---

### Edge Cases

- **Zero Matching SKU Search**: When a user searches for a SKU or product name that does not exist in the catalog, the variant picker displays an empty state ("No matching product variants found") with a suggestion to verify the SKU or search term.
- **Debounced Keystrokes**: Fast typing in both the table search bar and the variant picker debounces server calls (e.g., 300ms) to avoid server request spikes.
- **Page Index Overflow on Filter Application**: If a user is on page 8 and applies a filter that reduces total results to 2 pages, the system automatically resets the active page index to 1.
- **Duplicate Rule Prevention**: If a user attempts to create a reorder rule for a variant and store combination that already has an existing rule, the system displays a clear conflict notification ("A rule for this variant and store already exists").
- **Inactive Product Variant Handling**: When viewing rules where a product variant has been deactivated in the catalog, the table clearly indicates the variant status without crashing.
- **Null / Optional Quantities**: Fields such as Min Qty, Max Qty, Reorder Qty, EOQ, and Lead Time Days can be left blank (null) without causing NaN display errors or form submission failures.
- **Network Failure During Search or Pagination**: If a page request or variant search encounters a temporary network timeout, an inline error state with a retry option is presented without discarding user input.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement server-side pagination for the Reorder Rules list, retrieving only the requested page slice based on page index and page size.
- **FR-002**: The system MUST support standard configurable page sizes of 10, 20, 50, and 100 items per page, defaulting to 20 items per page.
- **FR-003**: The system MUST calculate and return the exact total count of matching reorder rules on the server so that pagination controls accurately display page numbers, item intervals, and total records.
- **FR-004**: The system MUST support server-side text searching across product SKU, product name, and store name for the reorder rules table.
- **FR-005**: The system MUST support server-side filtering by store location and by rule status (active vs inactive).
- **FR-006**: The system MUST support server-side sorting by key rule columns (e.g., reorder point, safety stock, lead time, created date).
- **FR-007**: The system MUST automatically reset the pagination index to page 1 whenever search terms or filter criteria are updated.
- **FR-008**: The product variant selector in the reorder rule creation and editing form MUST fetch variants on-demand from the server with debounced search input, eliminating upfront catalog dumps.
- **FR-009**: The product variant selector MUST utilize list virtualization to render variant options smoothly with minimal DOM nodes regardless of result volume.
- **FR-010**: The product variant selector MUST support paginated or batched loading of variant search results with clear visual loading feedback.
- **FR-011**: When opening the Edit dialog for an existing rule, the system MUST display the currently associated product variant and store immediately without requiring the user to search.
- **FR-012**: The system MUST provide an overview KPI summary banner on the Reorder Rules page displaying live metrics: Total Rules, Active Rules, Inactive Rules, and Covered Stores.
- **FR-013**: The system MUST display non-blocking skeleton loaders during table transitions and variant searches to avoid layout shifts.
- **FR-014**: The system MUST display dedicated, user-friendly empty states with clear iconography and a "Clear Filters" action when queries yield zero records.
- **FR-015**: 100% of user-facing static texts in the Reorder Rules module (page headers, descriptions, KPI cards, table headers, toolbar filters, dialog forms, labels, placeholders, buttons, tooltips, validation messages, and toast notifications) MUST be localized with complete language keys in both English and Arabic.
- **FR-016**: All layout elements, form dialogs, table columns, and popovers MUST adapt cleanly to Right-to-Left (RTL) reading direction when the Arabic locale is active.

### Key Entities *(include if feature involves data)*

- **Reorder Rule**: Defines replenishment thresholds for a specific product variant at a specific store location. Attributes include product variant ID, store ID, reorder point, min quantity, max quantity, safety stock, reorder quantity, economic order quantity (EOQ), lead time in days, preferred supplier ID, and active status flag.
- **Product Variant**: A distinct sellable/stockable SKU with associated barcode, name, and parent product relationship used to identify replenishment items.
- **Store / Location**: Physical retail outlet or fulfillment facility where inventory thresholds are established.
- **Preferred Supplier**: The designated vendor or distributor from whom replenishment stock is ordered when stock falls below reorder points.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Initial loading time of the Reorder Rules overview page remains under 1.2 seconds regardless of whether the tenant contains 100 or 50,000 rules in the database.
- **SC-002**: Opening the "New Reorder Rule" dialog takes less than 200ms with zero upfront catalog download latency.
- **SC-003**: Product variant search results within the rule modal display within 400ms after the user pauses typing in the search box.
- **SC-004**: The virtualized variant selector scrolls smoothly at 60fps with zero observable browser freeze or DOM node bloating.
- **SC-005**: 100% of visible static text strings in the Reorder Rules module are localized into both English and Arabic with zero hardcoded English fallbacks displayed in Arabic mode.
- **SC-006**: Pagination indicators and total counts match backend database query results exactly across all active search and filter combinations.
- **SC-007**: Page transitions between paginated rule slices complete in under 500ms under standard network conditions.

## Assumptions

- Users accessing the Reorder Rules module have valid tenant authorization and appropriate inventory permissions (`inventory.view` to inspect, `inventory.manage` to create/edit/delete).
- Product variants are uniquely identified within each tenant organization and have accessible SKUs and product names.
- A 300ms debounce interval for search inputs provides an optimal balance between server efficiency and user responsiveness.
- Configurable page sizes of 10, 20, 50, and 100 items adhere to established data table standards in the application.
- Server-side text search operates in a case-insensitive manner across supported fields.
