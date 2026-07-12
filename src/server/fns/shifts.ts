// Shift management server functions (specs/026-shift-management-enhancement).
// All privileged shift writes go through here: routes in src/routes/api/respos
// call requireAuth first and pass the AuthorizedUser in. Money math happens in
// Postgres (res_close_shift / res_shift_expected_cash); this layer only
// transports decimal strings.
import { supabaseAdmin } from '@/server/supabase'
import { ApiError } from '@/server/utils/api-error'
import type { AuthorizedUser } from '@/server/utils/auth'
import prisma from '@/lib/prisma'
import type {
  AddCashMovementInput,
  CashMovementDto,
  CloseShiftInput,
  CorrectShiftInput,
  ForceCloseShiftInput,
  ListShiftsQuery,
  OpenShiftInput,
  ShiftAuditEntry,
  ShiftDto,
  ShiftExpectedDto,
  ShiftSettingsDto,
  UpdateShiftSettingsInput,
} from '@/features/respos/data/shift-schemas'
import { hasAnyPermission } from '@/features/users/data/rbac'

const DEFAULT_STALE_HOURS = 12
const DEFAULT_VARIANCE_THRESHOLD = '10.00'

const SHIFT_RPC_ERROR_MAP: Record<string, { message: string; status: number }> =
  {
    shift_not_open: { message: 'This shift is not open.', status: 409 },
    variance_comment_required: {
      message: 'A comment is required when the variance exceeds the threshold.',
      status: 422,
    },
  }

function shiftRpcError(error: { message?: string | null }): ApiError {
  const raw = error.message ?? 'Shift operation failed.'
  const match = Object.keys(SHIFT_RPC_ERROR_MAP).find((code) =>
    raw.includes(code)
  )
  if (match) {
    const mapped = SHIFT_RPC_ERROR_MAP[match]
    return new ApiError(mapped.message, mapped.status)
  }
  return new ApiError(raw, 400)
}

// ── Value coercion helpers ───────────────────────────────────────────────────

function moneyToString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const asNumber = Number(value)
  if (Number.isNaN(asNumber)) return null
  return asNumber.toFixed(2)
}

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

interface ShiftRow {
  id: string
  auth_user_id: string | null
  opened_by: string | null
  closed_by: string | null
  restaurant_id: string | null
  branch_id: string | null
  status: string | null
  opening_cash: unknown
  closing_cash: unknown
  expected_cash: unknown
  variance: unknown
  cash_sales_total: unknown
  movements_in_total: unknown
  movements_out_total: unknown
  original_closing_cash: unknown
  original_variance: unknown
  variance_comment: string | null
  close_reason: string | null
  closed_by_user_id: string | null
  needs_review: boolean | null
  is_corrected: boolean | null
  reviewed_by: string | null
  reviewed_at: unknown
  stale_notified_at: unknown
  opened_at: unknown
  closed_at: unknown
  notes: string | null
  branches?: { name: string | null } | null
}

function computeIsStale(row: ShiftRow, staleHours: number): boolean {
  if (row.status !== 'open') return false
  const openedAt = toIso(row.opened_at)
  if (!openedAt) return false
  const ageMs = Date.now() - new Date(openedAt).getTime()
  return ageMs > staleHours * 60 * 60 * 1000
}

function toShiftDto(row: ShiftRow, staleHours = DEFAULT_STALE_HOURS): ShiftDto {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    openedBy: row.opened_by,
    employeeName: row.opened_by,
    restaurantId: row.restaurant_id,
    branchId: row.branch_id,
    branchName: row.branches?.name ?? null,
    status: (row.status ?? 'open') as ShiftDto['status'],
    openingCash: moneyToString(row.opening_cash) ?? '0.00',
    closingCash: moneyToString(row.closing_cash),
    expectedCash: moneyToString(row.expected_cash),
    variance: moneyToString(row.variance),
    cashSalesTotal: moneyToString(row.cash_sales_total),
    movementsInTotal: moneyToString(row.movements_in_total),
    movementsOutTotal: moneyToString(row.movements_out_total),
    originalClosingCash: moneyToString(row.original_closing_cash),
    originalVariance: moneyToString(row.original_variance),
    varianceComment: row.variance_comment,
    closeReason: row.close_reason,
    closedBy: row.closed_by,
    closedByUserId: row.closed_by_user_id,
    needsReview: row.needs_review ?? false,
    isCorrected: row.is_corrected ?? false,
    isStale: computeIsStale(row, staleHours),
    reviewedBy: row.reviewed_by,
    reviewedAt: toIso(row.reviewed_at),
    openedAt: toIso(row.opened_at) ?? new Date(0).toISOString(),
    closedAt: toIso(row.closed_at),
    notes: row.notes,
  }
}

// ── Ownership / lookup helpers ───────────────────────────────────────────────

async function getShiftOrThrow(shiftId: string): Promise<ShiftRow> {
  const shift = (await prisma.res_shifts.findUnique({
    where: { id: shiftId },
    include: { branches: { select: { name: true } } },
  })) as ShiftRow | null
  if (!shift) {
    throw new ApiError('Shift not found.', 404)
  }
  return shift
}

/** Employees may act on their own shift; anyone else needs shifts.manage. */
function assertOwnershipOrManage(shift: ShiftRow, actor: AuthorizedUser): void {
  if (shift.auth_user_id === actor.userId) return
  if (hasAnyPermission(actor.permissionNames, ['shifts.manage'])) return
  throw new ApiError('Forbidden: You can only act on your own shift.', 403)
}

async function getEffectiveSettingsRow(
  restaurantId: string | null,
  branchId: string | null
) {
  const rows = (await prisma.res_shift_settings.findMany({
    where: {
      restaurant_id: restaurantId ?? '',
      OR: [{ branch_id: branchId }, { branch_id: null }],
    },
  })) as Array<{
    branch_id: string | null
    variance_threshold: unknown
    require_comment_over_threshold: boolean
    stale_shift_hours: number
    auto_close_hours: number
  }>

  const branchRow = branchId
    ? rows.find((row) => row.branch_id === branchId)
    : undefined
  return branchRow ?? rows.find((row) => row.branch_id === null) ?? null
}

async function getEffectiveStaleHours(
  restaurantId: string | null,
  branchId: string | null
): Promise<number> {
  const settings = await getEffectiveSettingsRow(restaurantId, branchId)
  return settings?.stale_shift_hours ?? DEFAULT_STALE_HOURS
}

async function insertAudit(entry: {
  shiftId: string
  actorUserId: string | null
  action: string
  oldValues?: unknown
  newValues?: unknown
  reason?: string | null
}) {
  await prisma.res_shift_audit.create({
    data: {
      shift_id: entry.shiftId,
      actor_user_id: entry.actorUserId,
      action: entry.action,
      old_values: entry.oldValues ?? undefined,
      new_values: entry.newValues ?? undefined,
      reason: entry.reason ?? null,
    },
  })
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

export async function openShift(
  input: OpenShiftInput,
  actor: AuthorizedUser
): Promise<ShiftDto> {
  let created: ShiftRow
  try {
    created = (await prisma.res_shifts.create({
      data: {
        auth_user_id: actor.userId,
        opened_by: input.openedBy,
        opening_cash: input.openingCash,
        status: 'open',
        branch_id: input.branchId ?? null,
        restaurant_id: input.restaurantId ?? null,
        notes: input.notes ?? null,
      },
      include: { branches: { select: { name: true } } },
    })) as ShiftRow
  } catch (error: unknown) {
    const code = (error as { code?: string }).code
    if (code === 'P2002') {
      throw new ApiError('active_shift_exists', 409)
    }
    throw error
  }

  await insertAudit({
    shiftId: created.id,
    actorUserId: actor.userId,
    action: 'opened',
    newValues: {
      opening_cash: input.openingCash,
      branch_id: input.branchId ?? null,
    },
  })

  return toShiftDto(created)
}

async function closeShiftViaRpc(params: {
  shiftId: string
  actorUserId: string | null
  countedCash: string | null
  comment: string | null
  mode: 'closed' | 'force_closed' | 'auto_closed'
  reason: string | null
}): Promise<ShiftRow> {
  const { data, error } = await supabaseAdmin.rpc('res_close_shift', {
    p_shift_id: params.shiftId,
    p_actor: params.actorUserId,
    p_counted: params.countedCash,
    p_comment: params.comment,
    p_mode: params.mode,
    p_reason: params.reason,
  })
  if (error) {
    throw shiftRpcError(error)
  }
  return data as ShiftRow
}

export async function closeShift(
  input: CloseShiftInput,
  actor: AuthorizedUser
): Promise<ShiftDto> {
  const shift = await getShiftOrThrow(input.shiftId)
  assertOwnershipOrManage(shift, actor)

  const closed = await closeShiftViaRpc({
    shiftId: input.shiftId,
    actorUserId: actor.userId,
    countedCash: input.countedCash,
    comment: input.comment ?? null,
    mode: 'closed',
    reason: null,
  })

  if (input.closedBy) {
    await prisma.res_shifts.update({
      where: { id: input.shiftId },
      data: { closed_by: input.closedBy },
    })
  }

  return toShiftDto({ ...shift, ...closed })
}

export async function forceCloseShift(
  input: ForceCloseShiftInput,
  actor: AuthorizedUser
): Promise<ShiftDto> {
  const shift = await getShiftOrThrow(input.shiftId)

  const closed = await closeShiftViaRpc({
    shiftId: input.shiftId,
    actorUserId: actor.userId,
    countedCash: input.countedCash ?? null,
    comment: null,
    mode: 'force_closed',
    reason: input.reason,
  })

  if (shift.auth_user_id) {
    await prisma.res_notifications.create({
      data: {
        recipient_id: shift.auth_user_id,
        type: 'shift_force_closed',
        title: 'Your shift was closed by an administrator',
        message: input.reason,
        data: { shift_id: input.shiftId },
      },
    })
  }

  return toShiftDto({ ...shift, ...closed })
}

export async function correctShift(
  input: CorrectShiftInput,
  actor: AuthorizedUser
): Promise<{ shift: ShiftDto; auditId: string }> {
  const shift = await getShiftOrThrow(input.shiftId)
  if (shift.status === 'open') {
    throw new ApiError('shift_still_open', 409)
  }

  const oldOpening = moneyToString(shift.opening_cash) ?? '0.00'
  const oldClosing = moneyToString(shift.closing_cash)
  const oldExpected = moneyToString(shift.expected_cash)

  const newOpening = input.openingCash ?? oldOpening
  const newClosing = input.closingCash ?? oldClosing

  // The close-time expected snapshot is the reconciliation baseline; when the
  // opening float is corrected the expected total shifts by the same delta.
  // All values are 2dp decimal strings, so cent-integer math avoids FP drift.
  const toCents = (value: string) => Math.round(Number(value) * 100)
  const fromCents = (cents: number) => (cents / 100).toFixed(2)

  const newExpected =
    oldExpected === null
      ? null
      : fromCents(
          toCents(oldExpected) - toCents(oldOpening) + toCents(newOpening)
        )
  const newVariance =
    newClosing === null || newExpected === null
      ? null
      : fromCents(toCents(newClosing) - toCents(newExpected))

  const [updated, audit] = (await prisma.$transaction([
    prisma.res_shifts.update({
      where: { id: input.shiftId },
      data: {
        opening_cash: newOpening,
        closing_cash: newClosing,
        expected_cash: newExpected,
        variance: newVariance,
        is_corrected: true,
      },
      include: { branches: { select: { name: true } } },
    }),
    prisma.res_shift_audit.create({
      data: {
        shift_id: input.shiftId,
        actor_user_id: actor.userId,
        action: 'corrected',
        old_values: {
          opening_cash: oldOpening,
          closing_cash: oldClosing,
          expected_cash: oldExpected,
          variance: moneyToString(shift.variance),
        },
        new_values: {
          opening_cash: newOpening,
          closing_cash: newClosing,
          expected_cash: newExpected,
          variance: newVariance,
        },
        reason: input.reason,
      },
    }),
  ])) as [ShiftRow, { id: string }]

  return { shift: toShiftDto(updated), auditId: audit.id }
}

export async function reviewShift(
  shiftId: string,
  actor: AuthorizedUser
): Promise<ShiftDto> {
  const shift = await getShiftOrThrow(shiftId)
  if (!shift.needs_review) {
    return toShiftDto(shift)
  }

  const updated = (await prisma.res_shifts.update({
    where: { id: shiftId },
    data: {
      needs_review: false,
      reviewed_by: actor.userId,
      reviewed_at: new Date(),
    },
    include: { branches: { select: { name: true } } },
  })) as ShiftRow

  await insertAudit({
    shiftId,
    actorUserId: actor.userId,
    action: 'reviewed',
  })

  return toShiftDto(updated)
}

// ── Cash movements ───────────────────────────────────────────────────────────

interface MovementRow {
  id: string
  shift_id: string
  movement_type: string
  reason: string
  amount: unknown
  note: string | null
  created_by: string | null
  created_at: unknown
}

function toMovementDto(row: MovementRow): CashMovementDto {
  return {
    id: row.id,
    shiftId: row.shift_id,
    movementType: row.movement_type as CashMovementDto['movementType'],
    reason: row.reason,
    amount: moneyToString(row.amount) ?? '0.00',
    note: row.note,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at) ?? new Date(0).toISOString(),
  }
}

export async function addCashMovement(
  input: AddCashMovementInput,
  actor: AuthorizedUser
): Promise<CashMovementDto> {
  const shift = await getShiftOrThrow(input.shiftId)
  assertOwnershipOrManage(shift, actor)

  let created: MovementRow
  try {
    created = (await prisma.res_cash_movements.create({
      data: {
        shift_id: input.shiftId,
        branch_id: shift.branch_id,
        movement_type: input.type,
        reason: input.reason,
        amount: input.amount,
        note: input.note ?? null,
        created_by: actor.userId,
        auth_user_id: shift.auth_user_id,
      },
    })) as MovementRow
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('shift_not_open')) {
      throw new ApiError('This shift is not open.', 409)
    }
    throw error
  }

  await insertAudit({
    shiftId: input.shiftId,
    actorUserId: actor.userId,
    action: 'movement_added',
    newValues: {
      movement_id: created.id,
      type: input.type,
      reason: input.reason,
      amount: input.amount,
    },
  })

  return toMovementDto(created)
}

export async function listCashMovements(
  shiftId: string,
  actor: AuthorizedUser
): Promise<CashMovementDto[]> {
  const shift = await getShiftOrThrow(shiftId)
  assertOwnershipOrManage(shift, actor)

  const rows = (await prisma.res_cash_movements.findMany({
    where: { shift_id: shiftId },
    orderBy: { created_at: 'asc' },
  })) as MovementRow[]

  return rows.map(toMovementDto)
}

// ── Expected cash ────────────────────────────────────────────────────────────

export async function getExpectedCash(
  shiftId: string,
  actor: AuthorizedUser
): Promise<ShiftExpectedDto> {
  const shift = await getShiftOrThrow(shiftId)
  assertOwnershipOrManage(shift, actor)

  const { data, error } = await supabaseAdmin.rpc('res_shift_expected_cash', {
    p_shift_id: shiftId,
  })
  if (error) {
    throw shiftRpcError(error)
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        expected: unknown
        cash_sales: unknown
        mov_in: unknown
        mov_out: unknown
      }
    | undefined
  if (!row) {
    throw new ApiError('Shift not found.', 404)
  }

  return {
    expected: moneyToString(row.expected) ?? '0.00',
    cashSales: moneyToString(row.cash_sales) ?? '0.00',
    movementsIn: moneyToString(row.mov_in) ?? '0.00',
    movementsOut: moneyToString(row.mov_out) ?? '0.00',
    openingCash: moneyToString(shift.opening_cash) ?? '0.00',
  }
}

// ── Audit ────────────────────────────────────────────────────────────────────

export async function getShiftAudit(
  shiftId: string
): Promise<ShiftAuditEntry[]> {
  await getShiftOrThrow(shiftId)

  const rows = (await prisma.res_shift_audit.findMany({
    where: { shift_id: shiftId },
    orderBy: { created_at: 'asc' },
  })) as Array<{
    id: string
    shift_id: string
    actor_user_id: string | null
    action: string
    old_values: unknown
    new_values: unknown
    reason: string | null
    created_at: unknown
  }>

  return rows.map((row) => ({
    id: row.id,
    shiftId: row.shift_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    oldValues: row.old_values ?? null,
    newValues: row.new_values ?? null,
    reason: row.reason,
    createdAt: toIso(row.created_at) ?? new Date(0).toISOString(),
  }))
}

// ── Admin list / who's working ───────────────────────────────────────────────

export async function listShifts(query: ListShiftsQuery): Promise<{
  shifts: ShiftDto[]
  total: number
  page: number
  pageSize: number
}> {
  const where: Record<string, unknown> = {}
  if (query.status) where.status = query.status
  if (query.userId) where.auth_user_id = query.userId
  if (query.branchId) where.branch_id = query.branchId
  if (query.needsReview !== undefined) where.needs_review = query.needsReview
  if (query.from || query.to) {
    where.opened_at = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    }
  }

  const [rows, total] = (await Promise.all([
    prisma.res_shifts.findMany({
      where,
      orderBy: { opened_at: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { branches: { select: { name: true } } },
    }),
    prisma.res_shifts.count({ where }),
  ])) as [ShiftRow[], number]

  const staleHours = await getEffectiveStaleHours(
    rows[0]?.restaurant_id ?? null,
    null
  )

  return {
    shifts: rows.map((row) => toShiftDto(row, staleHours)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function listActiveShifts(
  branchId?: string
): Promise<Array<ShiftDto & { elapsedMinutes: number }>> {
  const rows = (await prisma.res_shifts.findMany({
    where: { status: 'open', ...(branchId ? { branch_id: branchId } : {}) },
    orderBy: { opened_at: 'asc' },
    include: { branches: { select: { name: true } } },
  })) as ShiftRow[]

  const staleHours = await getEffectiveStaleHours(
    rows[0]?.restaurant_id ?? null,
    branchId ?? null
  )

  return rows.map((row) => {
    const dto = toShiftDto(row, staleHours)
    const elapsedMs = Date.now() - new Date(dto.openedAt).getTime()
    return {
      ...dto,
      elapsedMinutes: Math.max(0, Math.floor(elapsedMs / 60000)),
    }
  })
}

/** Lazy fallback for environments without pg_cron; cheap enough to run on the
 * admin list read. Errors are swallowed — maintenance must never break reads. */
export async function runShiftMaintenance(): Promise<void> {
  const { error } = await supabaseAdmin.rpc('res_shift_maintenance')
  if (error) {
    // Non-fatal by design: the pg_cron schedule is the primary mechanism.
    return
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getShiftSettings(
  restaurantId: string | null,
  branchId: string | null
): Promise<ShiftSettingsDto> {
  const row = await getEffectiveSettingsRow(restaurantId, branchId)
  return {
    varianceThreshold:
      moneyToString(row?.variance_threshold) ?? DEFAULT_VARIANCE_THRESHOLD,
    requireCommentOverThreshold: row?.require_comment_over_threshold ?? true,
    staleShiftHours: row?.stale_shift_hours ?? DEFAULT_STALE_HOURS,
    autoCloseHours: row?.auto_close_hours ?? 24,
    branchId: row?.branch_id ?? null,
  }
}

export async function updateShiftSettings(
  input: UpdateShiftSettingsInput,
  actor: AuthorizedUser
): Promise<ShiftSettingsDto> {
  const restaurantId = input.restaurantId ?? ''
  const branchId = input.branchId ?? null

  // The (restaurant_id, COALESCE(branch_id, …)) uniqueness lives in an
  // expression index Prisma cannot target, so upsert manually.
  const existing = (await prisma.res_shift_settings.findFirst({
    where: { restaurant_id: restaurantId, branch_id: branchId },
    select: { id: true },
  })) as { id: string } | null

  const data = {
    variance_threshold: input.varianceThreshold,
    require_comment_over_threshold: input.requireCommentOverThreshold,
    stale_shift_hours: input.staleShiftHours,
    auto_close_hours: input.autoCloseHours,
    updated_by: actor.userId,
    updated_at: new Date(),
  }

  if (existing) {
    await prisma.res_shift_settings.update({
      where: { id: existing.id },
      data,
    })
  } else {
    await prisma.res_shift_settings.create({
      data: { ...data, restaurant_id: restaurantId, branch_id: branchId },
    })
  }

  return getShiftSettings(restaurantId, branchId)
}
