# API Contract: POS Checkout Service

## Endpoint: `POST /api/pos/checkout`

Completes a point-of-sale checkout and records all relevant data (invoice, transaction, inventory).

### Authentication
- **Method**: Bearer Token (Clerk)
- **Role**: `CASHIER`, `MANAGER`, `ADMIN`

### Request Body (JSON)

```typescript
interface CheckoutRequest {
  branchId: string; // UUID
  storeId?: string; // UUID
  customerId?: number; // Int (Optional)
  paymentMethod: 'cash' | 'card' | 'mixed';
  items: Array<{
    productId: number; // Int (for transaction_details)
    productVariantId: string; // UUID (for sales_invoice_items)
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxAmount?: number;
  }>;
  subtotal: number;
  totalAmount: number;
  discountTotal?: number;
  taxTotal?: number;
  notes?: string;
}
```

### Response (201 Created)

```typescript
interface CheckoutResponse {
  success: true;
  invoiceNo: string;
  invoiceId: string;
  transactionId: string;
  timestamp: string;
}
```

### Response (400 Bad Request)

- `error.code`: `INSUFFICIENT_STOCK` (if inventory checks fail)
- `error.code`: `INVALID_TOTAL` (if totals don't match sum of items)

---

## Service Layer: `SalesManagementService`

### `getInvoices(options: FetchOptions)`
- **Filters**: `startDate`, `endDate`, `status`, `branchId`, `searchQuery` (Invoice No, Customer Name)
- **Sorting**: `invoice_date` DESC (default), `total_amount`
- **Output**: Paginated list of `sales_invoices` with basic item summaries.

### `getInvoiceById(id: string)`
- **Output**: Complete `sales_invoice` record with all `sales_invoice_items`, linked `transactions`, and `customers`.
