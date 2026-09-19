import { z } from 'zod'

export const recordPaymentSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'wallet', 'cheque']),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  paymentDate: z.string().optional(),
})

export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(3, 'Please provide a reason for cancellation (at least 3 characters)').max(500),
})

export type CancelInvoiceFormData = z.infer<typeof cancelInvoiceSchema>

export const voidInvoiceSchema = z.object({
  reason: z.string().min(5, 'Accounting void requires a clear explanation (at least 5 characters)').max(500),
})

export type VoidInvoiceFormData = z.infer<typeof voidInvoiceSchema>

export const creditNoteSchema = z.object({
  reason: z.string().min(3, 'Reason for credit note is required').max(500),
})

export type CreditNoteFormData = z.infer<typeof creditNoteSchema>

export const invoiceLineItemSchema = z.object({
  productVariantId: z.string().uuid('Please select a product variant'),
  productId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitPrice: z.coerce.number().nonnegative('Unit price must be positive'),
  unitCost: z.coerce.number().nonnegative().optional(),
  discountType: z.enum(['percentage', 'fixed']).optional().nullable(),
  discountValue: z.coerce.number().nonnegative().optional(),
  taxRate: z.coerce.number().nonnegative().optional(),
  taxRateId: z.string().uuid().optional().nullable(),
  batchId: z.string().uuid().optional().nullable(),
})

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  warehouseId: z.string().uuid().optional().nullable(),
  invoiceType: z.enum(['sale', 'credit_note', 'debit_note', 'proforma', 'service']).default('sale'),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  terms: z.string().max(1000).optional().nullable(),
  shippingAmount: z.coerce.number().nonnegative().optional().default(0),
  orderDiscountAmount: z.coerce.number().nonnegative().optional().default(0),
  items: z.array(invoiceLineItemSchema).min(1, 'Invoice must contain at least one line item'),
})

export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>
