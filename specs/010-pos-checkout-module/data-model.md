# Data Model: POS Checkout Entities

## Sales Invoices (`sales_invoices`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | YES | Primary key, auto-generated |
| invoice_no | String | YES | Unique invoice number |
| invoice_date | DateTime | YES | Date and time when the sale occurred |
| clerk_user_id | String | YES | Clerk user ID of the salesperson |
| branch_id | UUID | YES | Link to the branch |
| store_id | UUID | NO | Link to the store |
| customer_id | Int | NO | Link to a customer record |
| pos_terminal_id | UUID | NO | Link to the POS terminal used |
| status | Enum | YES | `draft`, `posted`, `paid`, etc. |
| total_amount | Decimal | YES | Total amount including taxes and discounts |
| tax_amount | Decimal | NO | Total tax calculated |
| discount_amount | Decimal | NO | Total discount applied |

### Relationships
- `sales_invoice_items`: One-to-many relationship.
- `branches`: Belongs to a branch.
- `customers`: Optional link to customer.

---

## Sales Invoice Items (`sales_invoice_items`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | YES | Primary key |
| sales_invoice_id | UUID | YES | Link to `sales_invoices` |
| product_variant_id | UUID | YES | Link to `product_variants` |
| quantity | Decimal | YES | Number of units sold |
| unit_price | Decimal | YES | Price per unit at time of sale |
| line_total | Decimal | YES | Calculated `quantity * unit_price` minus item discounts |

### Validation
- `quantity` must be greater than 0.
- `unit_price` must not be negative.

---

## Transactions (`transactions`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | YES | Primary key |
| transaction_number | String | YES | Matches `invoice_no` for POS sales |
| transaction_type | String | YES | `sale` |
| status | String | YES | `completed`, `pending`, etc. |
| total_amount | Decimal | YES | Total amount from the sale |
| metadata | Json | NO | Payments details (e.g., payment method) |

### Rationale
Financial record for accounting and payment tracking.

---

## Transaction Details (`transaction_details`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | YES | Primary key |
| transaction_id | UUID | YES | Link to `transactions` |
| product_id | Int | YES | Link to `products` |
| quantity | Decimal | YES | Corresponding quantity from `sales_invoice_items` |
| unit_price | Decimal | YES | Corresponding unit price |
| subtotal | Decimal | YES | Line subtotal |

---

## Inventory Movements (`inventory_movements`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | YES | Primary key |
| product_variant_id | UUID | YES | Affected variant |
| movement_type | Enum | YES | `sale` |
| qty_out | Decimal | YES | Quantity sold |
| branch_id | UUID | YES | Branch where movement occurred |
| reference_id | UUID | YES | Link to `sales_invoice_id` |
| reference_type | String | YES | `sales_invoice` |
