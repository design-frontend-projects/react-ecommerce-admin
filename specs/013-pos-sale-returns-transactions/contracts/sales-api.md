# API Contract: POS Sales and Returns

**Feature**: POS Sales, returns and transaction references
**Status**: Draft
**Spec**: [spec.md](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/013-pos-sale-returns-transactions/spec.md)

## Interface: POS Sales Action

### `createSaleAction(payload: CreateSalePayload)`

- **Type**: Next.js Server Action
- **Input**:
    ```typescript
    type CreateSalePayload = {
      tenant_id: string
      clerk_user_id: string
      branch_id: string
      store_id?: string
      customer_id?: number
      invoice_no: string
      items: Array<{
        product_variant_id: string
        quantity: number
        unit_price: number
        discount_amount: number
        tax_rate_id: number
      }>
      payment_method: string
      total_amount: number
    }
    ```
- **Output**:
    ```typescript
    type CreateSaleResponse = {
      success: boolean
      invoice_id?: string
      transaction_id?: string
      error?: string
    }
    ```

## Interface: Sales Return Action

### `createReturnAction(payload: CreateReturnPayload)`

- **Type**: Next.js Server Action
- **Input**:
    ```typescript
    type CreateReturnPayload = {
      sales_invoice_id: string
      return_no: string
      items: Array<{
        sales_invoice_item_id: string
        product_variant_id: string
        return_quantity: number
        reason?: string
      }>
      notes?: string
    }
    ```
- **Output**:
    ```typescript
    type CreateReturnResponse = {
      success: boolean
      return_id?: string
      transaction_id?: string
      error?: string
    }
    ```

## Internal Data Flow

1.  **POS -> Server Action (Sale)**: Validates totals and structure.
2.  **Server Action -> Prisma**: Atomic insert to 4 tables.
3.  **Server Action -> UI**: Returns success/error with IDs.
4.  **UI -> POS**: Navigates to invoice/receipt or shows error.
