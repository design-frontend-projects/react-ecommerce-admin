import { z } from 'zod'

// ============================================================================
// ENUMS
// ============================================================================

export const financialTransactionTypeEnum = z.enum([
  'sale',
  'purchase',
  'payment_in',
  'payment_out',
  'refund',
  'expense',
  'income',
  'opening_balance',
  'adjustment',
])

export type FinancialTransactionType = z.infer<typeof financialTransactionTypeEnum>

export const financialTransactionStatusEnum = z.enum([
  'pending',
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
  'voided',
])

export type FinancialTransactionStatus = z.infer<typeof financialTransactionStatusEnum>

// ============================================================================
// LINE ITEMS SCHEMAS
// ============================================================================

export const financialTransactionItemInputSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  variant_id: z.string().nullable().optional(),
  quantity: z.number().min(0.0001, 'Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price must be at least 0'),
  discount_amount: z.number().min(0),
  tax_amount: z.number().min(0),
  sales_invoice_item_id: z.string().nullable().optional(),
  sales_return_item_id: z.string().nullable().optional(),
})

export type FinancialTransactionItemInput = z.infer<
  typeof financialTransactionItemInputSchema
>

export const financialTransactionDetailItemSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  variant_id: z.string().nullable().optional(),
  product_name: z.string(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  quantity: z.number(),
  unit_price: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  subtotal: z.number(),
  sales_invoice_item_id: z.string().nullable().optional(),
  sales_return_item_id: z.string().nullable().optional(),
})

export type FinancialTransactionDetailItem = z.infer<
  typeof financialTransactionDetailItemSchema
>

// ============================================================================
// FORM CREATION SCHEMAS
// ============================================================================

export const createFinancialTransactionFormSchema = z.object({
  transaction_type: financialTransactionTypeEnum,
  currency: z.string().min(1, 'Currency is required'),
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional().nullable(),
  sales_invoice_id: z.string().optional().nullable(),
  sales_return_id: z.string().optional().nullable(),
  reference_transaction_id: z.string().optional().nullable(),
  subtotal: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  items: z.array(financialTransactionItemInputSchema),
})

export type CreateFinancialTransactionFormValues = z.infer<
  typeof createFinancialTransactionFormSchema
>

export const refundFinancialTransactionFormSchema = z.object({
  originalTransactionId: z.string().min(1, 'Original transaction ID is required'),
  reason: z.string().min(3, 'Please provide a reason for the refund'),
  amount: z.number().positive('Refund amount must be greater than 0').optional(),
  items: z.array(financialTransactionItemInputSchema).optional(),
})

export type RefundFinancialTransactionFormValues = z.infer<
  typeof refundFinancialTransactionFormSchema
>

// ============================================================================
// ROW / LIST ITEM SCHEMA (TANSTACK TABLE)
// ============================================================================

export const financialTransactionRowSchema = z.object({
  id: z.string(),
  tenant_id: z.string().optional(),
  transaction_number: z.string(),
  transaction_type: financialTransactionTypeEnum.or(z.string()),
  status: z.string(),
  currency: z.string(),
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  reference_transaction_id: z.string().nullable().optional(),
  sales_invoice_id: z.string().nullable().optional(),
  sales_return_id: z.string().nullable().optional(),
  created_by_name: z.string().nullable().optional(),
  items_count: z.number().default(0),
})

export type FinancialTransactionRow = z.infer<typeof financialTransactionRowSchema>

// Alias for backward-compatibility if any
export type TransactionRow = FinancialTransactionRow

// ============================================================================
// FULL DETAIL SCHEMA
// ============================================================================

export const financialTransactionDetailSchema = financialTransactionRowSchema.extend({
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  updated_at: z.string().nullable().optional(),
  updated_by_name: z.string().nullable().optional(),
  details: z.array(financialTransactionDetailItemSchema),
  reference_transaction: z
    .object({
      id: z.string(),
      transaction_number: z.string(),
      transaction_type: z.string(),
      total_amount: z.number(),
      currency: z.string(),
    })
    .nullable()
    .optional(),
  child_refunds: z
    .array(
      z.object({
        id: z.string(),
        transaction_number: z.string(),
        transaction_type: z.string(),
        status: z.string(),
        total_amount: z.number(),
        currency: z.string(),
        created_at: z.string().nullable().optional(),
      })
    )
    .default([]),
  linked_invoice: z
    .object({
      id: z.string(),
      invoice_no: z.string(),
      status: z.string(),
    })
    .nullable()
    .optional(),
  linked_return: z
    .object({
      id: z.string(),
      return_no: z.string(),
      status: z.string(),
    })
    .nullable()
    .optional(),
})

export type FinancialTransactionDetail = z.infer<
  typeof financialTransactionDetailSchema
>

// ============================================================================
// STATS / METRICS SCHEMA
// ============================================================================

export const financialTransactionStatsSchema = z.object({
  totalVolume: z.number().default(0),
  totalInflow: z.number().default(0),
  totalOutflow: z.number().default(0),
  totalRefunds: z.number().default(0),
  pendingCount: z.number().default(0),
  totalCount: z.number().default(0),
})

export type FinancialTransactionStats = z.infer<
  typeof financialTransactionStatsSchema
>
