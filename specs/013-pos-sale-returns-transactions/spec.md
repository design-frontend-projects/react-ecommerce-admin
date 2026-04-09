# Feature Specification: POS Sales and Returns with Transaction Reference

**Feature Branch**: `013-pos-sale-returns-transactions`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: Save POS sale item to sales_invoices and sales_invoice_items and then create the transaction with the sales invoice id to use it as reference. Also handle sales returns (full/partial) using sales_returns and sales_return_items, creating transactions and item details.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Standard POS Checkout (Priority: P1)

As a cashier, I want to complete a sale so that the inventory is updated, an invoice is generated, and a financial transaction is recorded.

**Why this priority**: it's the core functionality of the POS system.

**Independent Test**: Can be tested by performing a simple sale. Verify that a record is created in `sales_invoices`, items in `sales_invoice_items`, a record in `transactions` linked to the invoice, and records in `transaction_details`.

**Acceptance Scenarios**:

1. **Given** a cart with items, **When** I process the payment, **Then** a `sales_invoice` is created with a unique `invoice_no`.
2. **Given** a `sales_invoice` is created, **When** items are saved, **Then** each item is recorded in `sales_invoice_items` with correct pricing and tax.
3. **Given** a completed sale, **When** a transaction is recorded, **Then** a `transactions` record is created with `transaction_type = 'sale'` and linked to the `sales_invoice`.
4. **Given** a `transactions` record, **When** details are saved, **Then** each item from the invoice is represented in `transaction_details`.

---

### User Story 2 - Full Sales Return (Priority: P2)

As a customer service representative, I want to process a full return of a sale so that the customer is refunded and the items are returned to stock.

**Why this priority**: Essential for handling customer errors or dissatisfaction.

**Independent Test**: Can be tested by selecting a previous invoice and returning all items. Verify that a `sales_returns` record is created, `sales_return_items` covers all items, and a refund transaction is recorded.

**Acceptance Scenarios**:

1. **Given** a previous `sales_invoice`, **When** I select "Return All", **Then** a `sales_returns` record is created linked to that invoice.
2. **Given** a full return, **When** items are saved, **Then** all items from the original invoice are added to `sales_return_items`.
3. **Given** a return is processed, **When** a transaction is recorded, **Then** a `transactions` record with `transaction_type = 'refund'` (or similar) is created and linked to the `sales_return`.

---

### User Story 3 - Partial Sales Return (Priority: P3)

As a customer service representative, I want to process a partial return of a sale so that only specific items or quantities are refunded.

**Why this priority**: Common scenario where a customer returns only part of their purchase.

**Independent Test**: Can be tested by selecting specific items/quantities for return. Verify that only those items are recorded and the refund amount matches the partial return.

**Acceptance Scenarios**:

1. **Given** a previous `sales_invoice`, **When** I select specific items and quantities for return, **Then** a `sales_returns` record is created.
2. **Given** a partial return, **When** items are saved, **Then** only the selected items and quantities are added to `sales_return_items`.
3. **Given** a partial return is processed, **When** a transaction is recorded, **Then** the refund amount in `transactions` matches the subtotal of the returned items.

---

### Edge Cases

- **Over-returning**: System must prevent returning more items than were originally purchased on the invoice.
- **Double Return**: System must prevent returning an item that has already been fully returned.
- **Cancelled Invoice**: System must handle logic if an invoice is cancelled after a partial return (if allowed).
- **Payment Method Mismatch**: Ensure the refund transaction follows the original payment method constraints if applicable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a `sales_invoices` record for every completed POS sale.
- **FR-002**: System MUST create `sales_invoice_items` for each item in the sale, linking them to the `sales_invoices` record.
- **FR-003**: System MUST create a `transactions` record for each completed sale, storing the `sales_invoice_id` as a reference.
- **FR-004**: System MUST create `transaction_details` for each item in the transaction, mirroring the invoice items.
- **FR-005**: System MUST allow users to initiate a return from an existing `sales_invoice`.
- **FR-006**: System MUST support full returns (all items on invoice) and partial returns (specific items and quantities).
- **FR-007**: System MUST create a `sales_returns` record linked to the original `sales_invoice`.
- **FR-008**: System MUST create `sales_return_items` for each returned item, linking to the `sales_invoice_item_id`.
- **FR-009**: System MUST create a `transactions` record for every return, linked to the `sales_return_id`.
- **FR-010**: System MUST validate that the total quantity returned for any item does not exceed the quantity originally purchased minues any previous returns.

### Key Entities *(include if feature involves data)*

- **Sales Invoice**: Represents the document issued to a customer for a sale.
- **Sales Invoice Item**: Individual lines within an invoice, specifying products, quantities, prices, and taxes.
- **Sales Return**: Represents a return of goods previously sold.
- **Sales Return Item**: Individual lines within a return, linking back to the original invoice item.
- **Transaction**: Central financial record of money moving in or out (sale or refund).
- **Transaction Detail**: Individual lines within a transaction for granular tracking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Checkout process (including record creation in 4+ tables) completes in under 2 seconds.
- **SC-002**: Return process (including validation and record creation) completes in under 3 seconds.
- **SC-003**: 100% of sales invoices have a corresponding linked transaction record.
- **SC-004**: 100% of sales returns have a corresponding linked refund transaction record.
- **SC-005**: Verification ensures no item can be returned more times than it was purchased.

## Assumptions

- **Existing Tables**: Tables `sales_invoices`, `sales_invoice_items`, `sales_returns`, `sales_return_items`, `transactions`, and `transaction_details` already exist in Prisma schema with necessary basic columns.
- **Clerk User ID**: The current user is authenticated via Clerk and their ID is used for `clerk_user_id` and `created_by` fields.
- **Tenant ID**: The current tenant is identifiable for `tenant_id` fields.
- **Transaction Number**: A unique number generation logic exists for `invoice_no`, `return_no`, and `transaction_number`.
- **Inventory Updates**: Handled separately or as part of the transaction hook (not the primary focus here but assumed).
