import { z } from 'zod'

export const stockAdjustmentReasonCodes = [
  'cycle_count',
  'physical_audit',
  'damaged',
  'expired',
  'theft_loss',
  'data_correction',
  'received_variance',
  'other',
] as const

export const adjustmentSchema = z
  .object({
    location_type: z.enum(['warehouse', 'store'], {
      required_error: 'Select location type (Warehouse or Store)',
    }),
    warehouse_id: z.string().optional().nullable(),
    location_id: z.string().optional().nullable(),
    store_id: z.string().optional().nullable(),
    product_variant_id: z
      .string({ required_error: 'Product variant is required' })
      .min(1, 'Product variant is required'),
    condition: z
      .enum(['good', 'damaged', 'refurbished', 'returned'])
      .default('good'),
    batch_id: z.string().optional().nullable(),
    serial_id: z.string().optional().nullable(),
    adjustment_type: z.enum(['set', 'offset'], {
      required_error: 'Select adjustment mode',
    }),
    quantity: z.coerce
      .number({
        required_error: 'Quantity is required',
        invalid_type_error: 'Quantity must be a valid number',
      })
      .finite('Quantity must be finite'),
    unit_cost: z.coerce
      .number({ invalid_type_error: 'Unit cost must be a valid number' })
      .min(0, 'Unit cost cannot be negative')
      .optional()
      .default(0),
    reason_code: z.enum(stockAdjustmentReasonCodes, {
      required_error: 'Please select a reason code',
    }),
    reason: z
      .string()
      .min(3, 'Reason must be at least 3 characters')
      .max(500, 'Reason cannot exceed 500 characters'),
  })
  .superRefine((data, ctx) => {
    if (data.location_type === 'warehouse' && (!data.warehouse_id || !data.warehouse_id.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Warehouse is required when warehouse location is selected',
        path: ['warehouse_id'],
      })
    }
    if (data.location_type === 'store' && (!data.store_id || !data.store_id.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Store is required when store location is selected',
        path: ['store_id'],
      })
    }
    if (data.adjustment_type === 'set' && data.quantity < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target quantity cannot be negative when setting absolute stock',
        path: ['quantity'],
      })
    }
    if (data.adjustment_type === 'offset' && data.quantity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Offset quantity cannot be zero',
        path: ['quantity'],
      })
    }
  })

export type AdjustmentFormData = z.infer<typeof adjustmentSchema>
