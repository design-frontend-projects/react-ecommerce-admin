import { z } from 'zod'

export const taxRateFormSchema = z
  .object({
    tax_type: z
      .string()
      .trim()
      .min(1, 'Tax type is required')
      .max(50, 'Tax type must not exceed 50 characters'),
    rate: z.coerce
      .number({ invalid_type_error: 'Rate must be a valid number' })
      .min(0, 'Rate cannot be negative')
      .max(100, 'Rate cannot exceed 100%'),
    country_id: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    effective_from: z.string().min(1, 'Effective from date is required'),
    effective_to: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    is_inclusive: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.effective_from && data.effective_to) {
      const fromDate = new Date(data.effective_from)
      const toDate = new Date(data.effective_to)
      if (toDate < fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Effective to date must be on or after the effective from date',
          path: ['effective_to'],
        })
      }
    }
  })

export type TaxRateFormValues = z.infer<typeof taxRateFormSchema>

export const taxCalculatorSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  rate: z.coerce.number().min(0, 'Rate must be positive').max(100, 'Rate cannot exceed 100%'),
  is_inclusive: z.boolean().default(false),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  discountAmount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
})

export type TaxCalculatorValues = z.infer<typeof taxCalculatorSchema>
