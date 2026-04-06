# Research: POS Checkout and Sales Management

## Findings

### Prisma 7 Transaction Patterns
Prisma 7 supports interactive transactions which are ideal for our multi-table insert requirement. 
- **Method**: `prisma.$transaction(async (tx) => { ... })`
- **Rationale**: Ensures that if any insert fails (e.g., `inventory_movements` due to stock constraints), all other inserts (`sales_invoices`, `transactions`, etc.) are rolled back.

### Product vs. Variant Mapping
- `sales_invoice_items` → `product_variant_id` (UUID)
- `transaction_details` → `product_id` (Int)
- **Decision**: The POS state must hold both `product_id` and `product_variant_id` for each basket item to populate both tables correctly.

### Reference Synchronization
- `sales_invoices.invoice_no` must match `transactions.transaction_number`.
- **Decision**: Generate a single unique ID (e.g., `SAL-YYYYMMDD-XXXX`) in the backend and use it for both fields.

### Inventory Updates
- **Decision**: Inserting into `inventory_movements` will be handle stock change records. We should also decide if we need to update `stock_balances` manually in the same transaction or if a trigger is preferred. Given current project patterns, an explicit update in the Prisma transaction is more transparent for testing.

### POS Module Architecture (Sales Management)
- **Component**: TanStack Table v8.
- **Features**: 
  - Server-side sorting/filtering to handle volume.
  - Integration with `sales_invoices` include `sales_invoice_items` and `customers`.
- **Rationale**: Meets the < 500ms performance goal by minimizing client-side heavy lifting.

## Technology Decisions

| Choice | Decision | Rationale |
|--------|----------|-----------|
| Transaction Tool | `Prisma Client Interactive Transactions` | Guaranteed atomicity across 5 tables. |
| UI Table | `TanStack Table v8` + `shadcn/ui` | Standard for the project, highly performant. |
| Fetching | `TanStack Query` | Robust caching and loading state management. |
| Reference Generation | `Server-side (API)` | Prevents client-side collisions and ensures uniqueness. |
