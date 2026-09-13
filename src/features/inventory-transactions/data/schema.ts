import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const transactionStatusSchema = z.enum([
  'draft',
  'pending',
  'posted',
  'cancelled',
  'reversed',
  'failed',
])
export type TransactionStatus = z.infer<typeof transactionStatusSchema>

export const transactionDirectionSchema = z.enum([
  'inbound',
  'outbound',
  'internal',
  'neutral',
])
export type TransactionDirection = z.infer<typeof transactionDirectionSchema>

export const transactionCategorySchema = z.enum([
  'purchase',
  'sale',
  'transfer',
  'adjustment',
  'reservation',
  'return_',
  'production',
  'opening',
  'other',
])
export type TransactionCategory = z.infer<typeof transactionCategorySchema>

export const transactionTypeRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  direction: transactionDirectionSchema,
  category: transactionCategorySchema,
})

export const transactionItemSchema = z.object({
  id: z.string(),
  product_variant_id: z.string(),
  quantity: z.union([z.number(), z.string()]),
  unit_cost: z.union([z.number(), z.string()]).optional(),
  total_cost: z.union([z.number(), z.string()]).optional(),
  sku_snapshot: z.string().nullable().optional(),
  product_name_snapshot: z.string().nullable().optional(),
  qty_before: z.union([z.number(), z.string()]).nullable().optional(),
  qty_after: z.union([z.number(), z.string()]).nullable().optional(),
  condition: z.string().optional(),
  notes: z.string().nullable().optional(),
  product_variants: z
    .object({
      sku: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      products: z.object({ name: z.string().nullable().optional() }).optional(),
    })
    .optional(),
})
export type TransactionItem = z.infer<typeof transactionItemSchema>

export const auditLogItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  old_values: z.any().nullable().optional(),
  new_values: z.any().nullable().optional(),
  created_at: z.string(),
  user_id: z.string().nullable().optional(),
})
export type AuditLogItem = z.infer<typeof auditLogItemSchema>

export const transactionListItemSchema = z.object({
  id: z.string(),
  transaction_number: z.string(),
  status: transactionStatusSchema,
  direction: transactionDirectionSchema,
  total_qty: z.union([z.number(), z.string()]),
  total_cost: z.union([z.number(), z.string()]),
  currency: z.string(),
  reference_type: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  posted_at: z.string().nullable().optional(),
  cancelled_at: z.string().nullable().optional(),
  transaction_type: transactionTypeRefSchema,
  items: z.array(transactionItemSchema).optional(),
})
export type TransactionListItem = z.infer<typeof transactionListItemSchema>

export const transactionDetailSchema = transactionListItemSchema.extend({
  source_warehouse_id: z.string().nullable().optional(),
  source_store_id: z.string().nullable().optional(),
  dest_warehouse_id: z.string().nullable().optional(),
  dest_store_id: z.string().nullable().optional(),
  idempotency_key: z.string().nullable().optional(),
  version: z.number().optional(),
  reversed_by_transaction_id: z.string().nullable().optional(),
  reversal_of_transaction_id: z.string().nullable().optional(),
  audit_logs: z.array(auditLogItemSchema).optional(),
})
export type TransactionDetail = z.infer<typeof transactionDetailSchema>

export const listTransactionsResponseSchema = successEnvelope(
  z.object({
    items: z.array(transactionListItemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  })
)

export const transactionDetailResponseSchema = successEnvelope(transactionDetailSchema)

export const transactionItemInputSchema = z.object({
  productVariantId: z.string().uuid(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitCost: z.coerce.number().min(0).optional(),
  lotNumber: z.string().optional().nullable(),
  condition: z.enum(['good', 'damaged', 'refurbished', 'expired']).optional(),
  notes: z.string().optional().nullable(),
})

export const createTransactionInputSchema = z.object({
  typeCode: z.string().min(1, 'Select a transaction type'),
  sourceWarehouseId: z.string().uuid().optional().nullable(),
  destWarehouseId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  autoPost: z.boolean().optional(),
  items: z.array(transactionItemInputSchema).min(1, 'Add at least one item'),
})

export type TransactionItemInput = z.infer<typeof transactionItemInputSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>
