# Data Model: POS Sales and Returns

**Feature**: POS Sales, returns and transaction references
**Status**: Draft
**Spec**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/013-pos-sale-returns-transactions/spec.md)

## Entities & Relationships

### `sales_invoices` (Existing, Extended)
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: 
    - `branch_id` -> `branches`
    - `customer_id` -> `customers`
- **Fields**: `invoice_no`, `status` (draft, posted, partially_returned, returned), `total_amount`, etc.

### `sales_invoice_items` (Existing)
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `sales_invoice_id` -> `sales_invoices`
- **Fields**: `quantity`, `unit_price`, `line_total`, etc.

### `transactions` (Extended)
Proposed additions to the existing model:
- `sales_invoice_id` (UUID, Optional): Reference to the POS sale invoice.
- `sales_return_id` (UUID, Optional): Reference to the sales return document.

### `transaction_details` (Extended)
Proposed additions to the existing model:
- `sales_invoice_item_id` (UUID, Optional): Link to specific invoice line.
- `sales_return_item_id` (UUID, Optional): Link to specific return line.

### `sales_returns` (Existing)
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `sales_invoice_id` -> `sales_invoices` (Original invoice being returned).

### `sales_return_items` (Existing)
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `sales_invoice_item_id` -> `sales_invoice_items` (Original item being returned).

## Validation Rules

1. **Sale Creation**:
    - `total_amount` must equal `sum(line_total)`.
    - `paid_amount` must equal `total_amount` (for POS sales).
2. **Return Validation**:
    - `return_quantity` for a specific `sales_invoice_item_id` must be `<= (original_quantity - sum(previously_returned_quantity))`.
    - `total_return_amount` must be calculated based on returned quantities and original prices + taxes.

## State Transitions

- **Invoice Status**: `draft` -> `posted` -> `partially_returned` -> `returned`.
- **Return Status**: `draft` -> `completed`.
- **Transaction Status**: `pending` -> `completed` (financial record).
