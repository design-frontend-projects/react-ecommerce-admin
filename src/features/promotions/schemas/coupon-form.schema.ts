import { z } from 'zod'

export const couponFormSchema = z.object({
  promotionId: z.string().min(1, 'Please select an associated promotion'),
  code: z
    .string()
    .min(3, 'Coupon code must be at least 3 characters')
    .max(50, 'Coupon code cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores are allowed'),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'expired', 'exhausted', 'disabled']).default('active'),
  maxUsages: z.coerce.number().int().min(1).optional().nullable(),
  maxUsagesPerCustomer: z.coerce.number().int().min(1).default(1).optional().nullable(),
  minOrderAmount: z.coerce.number().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  isSingleUse: z.boolean().default(false),
})

export type CouponFormValues = z.infer<typeof couponFormSchema>

export const bulkCouponGenerateSchema = z.object({
  promotionId: z.string().min(1, 'Please select an associated promotion'),
  prefix: z.string().min(2).max(10).default('PROMO'),
  count: z.coerce.number().int().min(1).max(500).default(10),
  maxUsages: z.coerce.number().int().min(1).default(1),
  maxUsagesPerCustomer: z.coerce.number().int().min(1).default(1),
  minOrderAmount: z.coerce.number().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isSingleUse: z.boolean().default(true),
})

export type BulkCouponGenerateValues = z.infer<typeof bulkCouponGenerateSchema>
