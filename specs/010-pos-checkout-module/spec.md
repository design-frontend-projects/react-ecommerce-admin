# Feature Specification: POS Checkout and Sales Management

**Feature Branch**: `010-pos-checkout-module`
**Created**: 2026-04-05
**Status**: Draft
**Input**: User description: "plan to save src/features/pos in sales_invoices and sales_invoice_items based on the definition of them and use the transaction table to commit and capture the transaction details only and create module for sales_invoice and sales_invoice_items with sorting and filter and search"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Completing a POS Sale (Priority: P1)

As a cashier, I want to complete a checkout in the POS system so that the sale is legally recorded as an invoice, the financial transaction is captured, and inventory levels are adjusted.

**Why this priority**: Core business functionality. Without this, POS sales are not persisted in the new standardized sales tables and stock is not tracked.

**Independent Test**: Perform a checkout with multiple items in the POS. Verify that new records appear in `sales_invoices`, `sales_invoice_items`, `transactions`, `transaction_details`, and `inventory_movements` with matching totals, item counts, and stock reductions.

**Acceptance Scenarios**:

1. **Given** a basket with 3 items, **When** the cashier clicks "Checkout" and selects "Cash", **Then** one `sales_invoices` record, three `sales_invoice_items` records, one `transactions` record, three `transaction_details` records, and three `inventory_movements` records (type: sale) are created.
2. **Given** a successful checkout, **When** I check all tables, **Then** all values must match the POS basket (totals, quantities, prices).

---

### User Story 2 - Sales Management Dashboard (Priority: P1)

As a manager, I want to view a list of all sales invoices so that I can monitor daily operations and review individual sale details.

**Why this priority**: Essential for audit and oversight.

**Independent Test**: Navigate to the new Sales module. Confirm that a table displays recent sales invoices with sorting, filtering, and search functionality working as expected.

**Acceptance Scenarios**:

1. **Given** 20 existing invoices, **When** I open the Sales Invoice module, **Then** I see the list with at least Invoice No, Customer, Date, and Total Amount.
2. **Given** the invoice list, **When** I click on an invoice, **Then** I see the full details including all line items.

---

### User Story 3 - Searching and Filtering Invoices (Priority: P2)

As a staff member, I want to find a specific invoice or set of invoices by criteria so that I can handle customer returns or report on specific periods.

**Why this priority**: Necessary for operational efficiency.

**Independent Test**: Enter an invoice number in the search bar. Verify only that invoice is shown. Apply a date filter and verify only invoices within that range are displayed.

**Acceptance Scenarios**:

1. **Given** multiple invoices, **When** I search for "INV-001", **Then** the list filters to show only the matching invoice.
2. **Given** a list of invoices, **When** I filter by "Draft" status, **Then** only draft invoices are displayed.

---

### Edge Cases

- **Partial Payment**: How does the system handle a sale where only part of the amount is paid? (Assumed: POS currently handles full payments only, or `status` will be `partially_paid`).
- **Atomic Failure**: If creating `sales_invoice_items` fails but `sales_invoices` succeeds, how is consistency maintained? (Requirement: MUST use a database transaction).
- **Inventory Mismatch**: What if an item in the basket is no longer in stock at the time of commit?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a `sales_invoices` record upon successful POS checkout using the schema definition.
- **FR-002**: System MUST create `sales_invoice_items` records for every item in the POS basket, linked to the new invoice.
- **FR-003**: System MUST create a financial `transactions` record for each POS checkout to capture payment metadata.
- **FR-004**: System MUST create `transaction_details` records mirroring the basket items to satisfy the `transactions` schema relationships.
- **FR-005**: All database operations for a single checkout MUST be executed within an atomic block (Prisma transaction) to ensure data integrity.
- **FR-006**: System MUST provide a new management UI module for `Sales Invoices`.
- **FR-007**: The Sales module MUST support sorting by date and total amount.
- **FR-008**: The Sales module MUST support filtering by status, branch, and date range.
- **FR-009**: The Sales module MUST support full-text search on Invoice Number and Customer Name.
- **FR-010**: System MUST link `sales_invoices` and `transactions` via a shared reference number (`sales_invoices.invoice_no` matches `transactions.transaction_number`).
- **FR-011**: System MUST create `inventory_movements` records for each item in the transaction with `movement_type = sale` and `qty_out` matching the sold quantity.

### Key Entities *(include if feature involves data)*

- **Sales Invoice**: Represents the document of sale. Contains `invoice_no`, `total_amount`, `clerk_user_id`, etc.
- **Sales Invoice Item**: Represents a specific line in the invoice. Links to `product_variants`.
- **Transaction**: Represents the movement of money or credit. Contains `transaction_number`, `transaction_type`, `status`.
- **Transaction Detail**: Line items for the financial transaction. Links to `products`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful POS checkouts result in complete and consistent records across all four target tables.
- **SC-002**: Sales table lists 1000+ invoices with < 500ms response time for search and filter operations.
- **SC-003**: Zero "orphaned" invoice items or transaction details (all items must belong to a parent record).
- **SC-004**: Audit trail: Every invoice can be traced back to its corresponding financial transaction record.

## Assumptions

- **Tax Calculations**: POS frontend already calculates tax correctly; backend will persist these passed values.
- **Branch/Store ID**: The active branch and store are derived from the terminal/session settings.
- **Product vs Variant**: `sales_invoice_items` will use `product_variant_id` while `transaction_details` will use `product_id` as per schema definitions (despite the inconsistency).
- **Permissions**: Only users with appropriate roles (e.g., Manager, Admin) can view the Sales management module.
