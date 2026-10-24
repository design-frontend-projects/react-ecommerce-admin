import { z } from 'zod'

export const RefundItemFormSchema = z.object({
  salesInvoiceItemId: z.string().uuid(),
  productVariantId: z.string().uuid(),
  refundQuantity: z.coerce.number().positive('Quantity must be greater than 0'),
  disposition: z.enum([
    'resalable',
    'damaged',
    'quarantine',
    'defective',
    'expired',
    'scrap',
  ]).default('resalable'),
  reason: z.string().optional(),
})

export const CreateRefundFormSchema = z.object({
  salesInvoiceId: z.string().uuid(),
  items: z.array(RefundItemFormSchema).min(1, 'Select at least one item to refund'),
  refundMethod: z.enum([
    'cash',
    'card',
    'original_payment_method',
    'store_credit',
    'customer_wallet',
    'bank_transfer',
    'other',
  ]),
  refundReference: z.string().max(255).optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().optional(),
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(8, 'PIN cannot exceed 8 digits').optional(),
  managerPin: z.string().optional(),
  managerTenantUserId: z.string().uuid().optional(),
  inventoryReturnRequired: z.boolean().default(true),
  idempotencyKey: z.string().optional(),
})

export type CreateRefundFormData = z.infer<typeof CreateRefundFormSchema>

export const PinPromptSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(8, 'PIN cannot exceed 8 digits'),
})

export type PinPromptFormData = z.infer<typeof PinPromptSchema>

export const RejectRefundSchema = z.object({
  rejectionReason: z.string().min(3, 'Please provide a clear rejection reason').max(500),
})

export type RejectRefundFormData = z.infer<typeof RejectRefundSchema>

export const CancelRefundSchema = z.object({
  cancellationReason: z.string().min(3, 'Please provide a cancellation reason').max(500),
})

export type CancelRefundFormData = z.infer<typeof CancelRefundSchema>
