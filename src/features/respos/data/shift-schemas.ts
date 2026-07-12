// Shift management Zod contracts — shared by client actions and the /api
// route handlers (specs/026-shift-management-enhancement).
// Money travels as decimal strings, never floats.
import { z } from 'zod'
import type { ResShift } from '../types'

export const moneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Must be a decimal amount with up to 2 places')

export type MoneyString = z.infer<typeof moneyStringSchema>

export function toMoneyString(value: number): MoneyString {
  return value.toFixed(2)
}

export const shiftStatusSchema = z.enum([
  'open',
  'closed',
  'force_closed',
  'auto_closed',
])
export type ShiftDtoStatus = z.infer<typeof shiftStatusSchema>

export const cashMovementTypeSchema = z.enum(['in', 'out'])

/** Manual movement reasons — subset of cash_movement_reason_enum; the other
 * values (opening/closing/sale/…) are reserved for system-generated rows. */
export const cashMovementReasonSchema = z.enum([
  'income',
  'expense',
  'payout',
  'adjustment',
  'customer_payment',
  'supplier_payment',
])

const nullableMoney = moneyStringSchema.nullable()

export const shiftDtoSchema = z.object({
  id: z.string().uuid(),
  authUserId: z.string().nullable(),
  openedBy: z.string().nullable(),
  employeeName: z.string().nullable(),
  restaurantId: z.string().nullable(),
  branchId: z.string().nullable(),
  branchName: z.string().nullable(),
  status: shiftStatusSchema,
  openingCash: moneyStringSchema,
  closingCash: nullableMoney,
  expectedCash: nullableMoney,
  variance: nullableMoney,
  cashSalesTotal: nullableMoney,
  movementsInTotal: nullableMoney,
  movementsOutTotal: nullableMoney,
  originalClosingCash: nullableMoney,
  originalVariance: nullableMoney,
  varianceComment: z.string().nullable(),
  closeReason: z.string().nullable(),
  closedBy: z.string().nullable(),
  closedByUserId: z.string().nullable(),
  needsReview: z.boolean(),
  isCorrected: z.boolean(),
  isStale: z.boolean(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
  notes: z.string().nullable(),
})
export type ShiftDto = z.infer<typeof shiftDtoSchema>

/** Adapt a server ShiftDto to the legacy snake_case row shape used by the
 * respos store and own-shift supabase reads. */
export function shiftDtoToResShift(dto: ShiftDto): ResShift {
  const toNumber = (value: string | null) =>
    value === null ? null : Number(value)

  return {
    id: dto.id,
    auth_user_id: dto.authUserId ?? undefined,
    restaurant_id: dto.restaurantId ?? undefined,
    opened_by: dto.openedBy ?? '',
    closed_by: dto.closedBy ?? undefined,
    opening_cash: Number(dto.openingCash),
    closing_cash:
      dto.closingCash === null ? undefined : Number(dto.closingCash),
    status: dto.status,
    opened_at: dto.openedAt,
    closed_at: dto.closedAt ?? undefined,
    notes: dto.notes ?? undefined,
    branch_id: dto.branchId,
    expected_cash: toNumber(dto.expectedCash),
    variance: toNumber(dto.variance),
    cash_sales_total: toNumber(dto.cashSalesTotal),
    movements_in_total: toNumber(dto.movementsInTotal),
    movements_out_total: toNumber(dto.movementsOutTotal),
    original_closing_cash: toNumber(dto.originalClosingCash),
    original_variance: toNumber(dto.originalVariance),
    variance_comment: dto.varianceComment,
    close_reason: dto.closeReason,
    closed_by_user_id: dto.closedByUserId,
    needs_review: dto.needsReview,
    is_corrected: dto.isCorrected,
    reviewed_by: dto.reviewedBy,
    reviewed_at: dto.reviewedAt,
  }
}

export const cashMovementDtoSchema = z.object({
  id: z.string().uuid(),
  shiftId: z.string().uuid(),
  movementType: cashMovementTypeSchema,
  reason: z.string(),
  amount: moneyStringSchema,
  note: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
})
export type CashMovementDto = z.infer<typeof cashMovementDtoSchema>

export const shiftAuditEntrySchema = z.object({
  id: z.string().uuid(),
  shiftId: z.string().uuid(),
  actorUserId: z.string().nullable(),
  action: z.string(),
  oldValues: z.unknown().nullable(),
  newValues: z.unknown().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
})
export type ShiftAuditEntry = z.infer<typeof shiftAuditEntrySchema>

export const shiftExpectedDtoSchema = z.object({
  expected: moneyStringSchema,
  cashSales: moneyStringSchema,
  movementsIn: moneyStringSchema,
  movementsOut: moneyStringSchema,
  openingCash: moneyStringSchema,
})
export type ShiftExpectedDto = z.infer<typeof shiftExpectedDtoSchema>

export const shiftSettingsDtoSchema = z.object({
  varianceThreshold: moneyStringSchema,
  requireCommentOverThreshold: z.boolean(),
  staleShiftHours: z.number().int(),
  autoCloseHours: z.number().int(),
  branchId: z.string().nullable(),
})
export type ShiftSettingsDto = z.infer<typeof shiftSettingsDtoSchema>

// ── Inputs ───────────────────────────────────────────────────────────────────

export const openShiftInputSchema = z.object({
  openingCash: moneyStringSchema,
  openedBy: z.string().min(1).max(255),
  branchId: z.string().uuid().nullish(),
  restaurantId: z.string().max(255).nullish(),
  notes: z.string().max(2000).nullish(),
})
export type OpenShiftInput = z.infer<typeof openShiftInputSchema>

export const closeShiftInputSchema = z.object({
  shiftId: z.string().uuid(),
  countedCash: moneyStringSchema,
  comment: z.string().max(2000).nullish(),
  closedBy: z.string().max(255).nullish(),
})
export type CloseShiftInput = z.infer<typeof closeShiftInputSchema>

export const forceCloseShiftInputSchema = z.object({
  shiftId: z.string().uuid(),
  countedCash: moneyStringSchema.nullish(),
  reason: z.string().min(5).max(2000),
})
export type ForceCloseShiftInput = z.infer<typeof forceCloseShiftInputSchema>

export const correctShiftInputSchema = z
  .object({
    shiftId: z.string().uuid(),
    openingCash: moneyStringSchema.nullish(),
    closingCash: moneyStringSchema.nullish(),
    reason: z.string().min(5).max(2000),
  })
  .refine(
    (input) => input.openingCash != null || input.closingCash != null,
    'At least one amount must be corrected'
  )
export type CorrectShiftInput = z.infer<typeof correctShiftInputSchema>

export const addCashMovementInputSchema = z.object({
  shiftId: z.string().uuid(),
  type: cashMovementTypeSchema,
  reason: cashMovementReasonSchema,
  amount: moneyStringSchema.refine(
    (amount) => Number(amount) > 0,
    'Amount must be greater than zero'
  ),
  note: z.string().max(2000).nullish(),
})
export type AddCashMovementInput = z.infer<typeof addCashMovementInputSchema>

export const reviewShiftInputSchema = z.object({
  shiftId: z.string().uuid(),
})
export type ReviewShiftInput = z.infer<typeof reviewShiftInputSchema>

export const updateShiftSettingsInputSchema = z
  .object({
    restaurantId: z.string().max(255).nullish(),
    branchId: z.string().uuid().nullish(),
    varianceThreshold: moneyStringSchema,
    requireCommentOverThreshold: z.boolean(),
    staleShiftHours: z.number().int().min(1).max(168),
    autoCloseHours: z.number().int().min(2).max(336),
  })
  .refine(
    (input) => input.autoCloseHours > input.staleShiftHours,
    'Auto-close must be later than the stale threshold'
  )
export type UpdateShiftSettingsInput = z.infer<
  typeof updateShiftSettingsInputSchema
>

export const listShiftsQuerySchema = z.object({
  status: shiftStatusSchema.optional(),
  userId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  needsReview: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>

// ── Response envelopes ───────────────────────────────────────────────────────

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({ success: z.literal(true), data })
}

export const shiftResponseSchema = envelope(shiftDtoSchema)
export const shiftListResponseSchema = envelope(
  z.object({
    shifts: z.array(shiftDtoSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
)
export const activeShiftsResponseSchema = envelope(
  z.object({
    shifts: z.array(shiftDtoSchema.extend({ elapsedMinutes: z.number() })),
  })
)
export const movementsResponseSchema = envelope(
  z.object({ movements: z.array(cashMovementDtoSchema) })
)
export const movementResponseSchema = envelope(cashMovementDtoSchema)
export const auditResponseSchema = envelope(
  z.object({ entries: z.array(shiftAuditEntrySchema) })
)
export const expectedResponseSchema = envelope(shiftExpectedDtoSchema)
export const settingsResponseSchema = envelope(shiftSettingsDtoSchema)
