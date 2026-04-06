# Quickstart: POS Checkout & Sales Management

## Overview

A guide to completing a checkout in the POS system and managing the sales invoices via the management module.

## Workflow: Completing a Sale

1.  **Selection**: The cashier adds items to the POS basket.
2.  **Checkout**: Clicking "Pay" triggers an API call (POST `/api/pos/checkout`).
3.  **Backend Process**:
    - Generates a unique Invoice Number: `SAL-YYYYMMDD-XXXX`.
    - Initiates a Prisma Transaction.
    - Creates records in:
        1. `sales_invoices` (parent).
        2. `sales_invoice_items` (children).
        3. `transactions` (financial record).
        4. `transaction_details` (financial detail line).
        5. `inventory_movements` (stock reduction).
4.  **Completion**: If all inserts succeed, the transaction is committed, and a success response is returned to the frontend.

## Workflow: Managing Sales

1.  Navigate to the **Sales Management** module (e.g., `Admin -> Sales Invoices`).
2.  The module uses **TanStack Table** with server-side pagination, sorting, and filtering.
3.  **Search**: Use the top bar to find invoices by `invoice_no` or `customer_name`.
4.  **Filter**: Toggle status (draft, posted, paid) or filter by branch/date range.

## Development Tasks

- **POST `/api/pos/checkout`**: Implement the transactional create logic in the backend.
- **`SalesInvoiceModule`**: Build the UI for the Sales management dashboard including the table and filters.
- **Detail View**: Create a side-panel or modal to view full invoice line items and transaction history.
