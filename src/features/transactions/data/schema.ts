import { z } from 'zod'

export const transactionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  clerk_user_id: z.string(),
  transaction_number: z.string(),
  transaction_type: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotal: z.string().or(z.number()),
  tax_amount: z.string().or(z.number()).nullable(),
  discount_amount: z.string().or(z.number()).nullable(),
  total_amount: z.string().or(z.number()),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().or(z.date()).nullable(),
  updated_at: z.string().or(z.date()).nullable(),
})

export type Transaction = z.infer<typeof transactionSchema>

export const transactionRowSchema = z.object({
  id: z.string(),
  transaction_number: z.string(),
  type: z.string(),
  status: z.string(),
  total: z.string().or(z.number()),
  date: z.string().or(z.date()),
})

export type TransactionRow = z.infer<typeof transactionRowSchema>

export const transactionFormSchema = z.object({
  transaction_type: z.enum(['sale', 'purchase', 'return', 'adjustment']),
  currency: z.string(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.number().min(1, 'Product is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        unit_price: z.number().min(0, 'Unit price must be >= 0'),
        discount_amount: z.number().min(0),
        tax_amount: z.number().min(0),
      })
    )
    .min(1, 'At least one item is required'),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>
