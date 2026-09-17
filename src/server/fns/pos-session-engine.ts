'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type {
  session_status_enum,
  cash_movement_type_enum,
  cash_movement_reason_enum,
} from '@/generated/prisma/enums'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { ApiError } from '@/server/utils/api-error'

// ============================================================================
// TYPES
// ============================================================================

export interface OpenSessionInput {
  terminalId: string
  openingCash: number | string
  notes?: string
}

export interface CloseSessionInput {
  sessionId: string
  actualCash: number | string
  notes?: string
}

export interface CashMovementInput {
  sessionId: string
  type: cash_movement_type_enum
  reason: cash_movement_reason_enum
  amount: number | string
  notes?: string
  referenceType?: string
  referenceId?: string
}

export interface SessionFilters {
  terminalId?: string
  status?: session_status_enum
  cashierId?: string
  page?: number
  pageSize?: number
}

function toDecimal(val: number | string | Prisma.Decimal | null | undefined, defaultValue = 0): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(defaultValue)
  if (val instanceof Prisma.Decimal) return val
  return new Prisma.Decimal(val)
}

// ============================================================================
// SESSION ENGINE
// ============================================================================

/**
 * Checks terminal status and whether the current user is authorized as a cashier.
 */
export async function getTerminalStatus(authUserId: string, terminalId: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const terminal = await prisma.pos_terminals.findFirst({
      where: { id: terminalId, tenant_id: tenantId, deleted_at: null },
      include: {
        pos_sessions: {
          where: { status: 'open' },
          take: 1,
          orderBy: { opened_at: 'desc' },
        },
        pos_terminal_users: {
          where: { user_id: tenantUserId!, is_active: true },
          take: 1,
        },
      },
    })

    if (!terminal) {
      throw new ApiError('Terminal not found or inactive.', 404)
    }

    const activeSession = terminal.pos_sessions[0] ?? null
    const isAuthorized = terminal.pos_terminal_users.length > 0

    return {
      terminal: {
        id: terminal.id,
        name: terminal.name,
        code: terminal.code,
        storeId: terminal.store_id,
        branchId: terminal.branch_id,
        warehouseId: terminal.warehouse_id,
        defaultPriceListId: terminal.default_price_list_id,
        status: terminal.status,
      },
      activeSession: activeSession
        ? {
            id: activeSession.id,
            cashierId: activeSession.cashier_id,
            status: activeSession.status,
            openingCash: activeSession.opening_cash,
            openedAt: activeSession.opened_at,
          }
        : null,
      isAuthorized,
    }
  })
}

/**
 * Opens a new POS session on a terminal.
 * Validates: cashier authorization, no duplicate active sessions.
 */
export async function openPosSession(authUserId: string, input: OpenSessionInput) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // 1. Validate terminal exists and is active
    const terminal = await prisma.pos_terminals.findFirst({
      where: { id: input.terminalId, tenant_id: tenantId, deleted_at: null, status: 'active' },
    })
    if (!terminal) {
      throw new ApiError('Terminal not found or inactive.', 404)
    }

    // 2. Validate cashier is authorized for this terminal
    const authorization = await prisma.pos_terminal_users.findFirst({
      where: {
        terminal_id: input.terminalId,
        user_id: tenantUserId!,
        is_active: true,
        tenant_id: tenantId,
      },
    })
    if (!authorization) {
      throw new ApiError('You are not authorized to operate this terminal.', 403)
    }

    // 3. Check no open session exists on this terminal
    const existingSession = await prisma.pos_sessions.findFirst({
      where: {
        terminal_id: input.terminalId,
        status: 'open',
        tenant_id: tenantId,
      },
    })
    if (existingSession) {
      throw new ApiError(
        `Terminal already has an active session opened at ${existingSession.opened_at.toISOString()}.`,
        409
      )
    }

    const openingCash = toDecimal(input.openingCash)

    // 4. Create session + opening cash movement in a single transaction
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.pos_sessions.create({
        data: {
          tenant_id: tenantId,
          terminal_id: input.terminalId,
          cashier_id: tenantUserId!,
          status: 'open',
          opening_cash: openingCash,
          expected_cash: openingCash,
          opened_at: new Date(),
          notes: input.notes ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // Record opening cash movement
      await tx.pos_cash_movements.create({
        data: {
          tenant_id: tenantId,
          session_id: newSession.id,
          type: 'in',
          reason: 'opening',
          amount: openingCash,
          notes: 'Opening float',
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      return newSession
    })

    return { session }
  })
}

/**
 * Closes a POS session with cash reconciliation.
 * Calculates expected cash from all movements, records difference.
 */
export async function closePosSession(authUserId: string, input: CloseSessionInput) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const session = await prisma.pos_sessions.findFirst({
      where: { id: input.sessionId, tenant_id: tenantId, status: 'open' },
    })
    if (!session) {
      throw new ApiError('Session not found or already closed.', 404)
    }

    // Verify the cashier owns this session or has session management permission
    if (session.cashier_id !== tenantUserId) {
      throw new ApiError('Only the session cashier can close this session.', 403)
    }

    // Calculate expected cash from movements
    const movements = await prisma.pos_cash_movements.findMany({
      where: { session_id: session.id, tenant_id: tenantId },
    })

    let expectedCash = new Prisma.Decimal(0)
    for (const mv of movements) {
      if (mv.type === 'in') {
        expectedCash = expectedCash.plus(mv.amount)
      } else {
        expectedCash = expectedCash.minus(mv.amount)
      }
    }

    const actualCash = toDecimal(input.actualCash)
    const cashDifference = actualCash.minus(expectedCash)

    // Close session atomically
    const closedSession = await prisma.$transaction(async (tx) => {
      // Record closing cash movement
      await tx.pos_cash_movements.create({
        data: {
          tenant_id: tenantId,
          session_id: session.id,
          type: 'out',
          reason: 'closing',
          amount: expectedCash.abs(),
          notes: input.notes ?? 'Session closing',
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      return tx.pos_sessions.update({
        where: { id: session.id },
        data: {
          status: 'closed',
          expected_cash: expectedCash,
          actual_cash: actualCash,
          cash_difference: cashDifference,
          closed_at: new Date(),
          notes: input.notes ?? session.notes,
          updated_by_user_id: tenantUserId,
        },
      })
    })

    return {
      session: closedSession,
      reconciliation: {
        expectedCash: expectedCash.toString(),
        actualCash: actualCash.toString(),
        difference: cashDifference.toString(),
        isOver: cashDifference.gt(0),
        isShort: cashDifference.lt(0),
        isBalanced: cashDifference.eq(0),
      },
    }
  })
}

/**
 * Records a cash drawer movement (Cash In, Cash Out, Petty Cash Expense).
 * Updates the session's expected_cash accordingly.
 */
export async function addCashMovement(authUserId: string, input: CashMovementInput) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const session = await prisma.pos_sessions.findFirst({
      where: { id: input.sessionId, tenant_id: tenantId, status: 'open' },
    })
    if (!session) {
      throw new ApiError('Session not found or not open.', 404)
    }

    const amount = toDecimal(input.amount)
    if (amount.lte(0)) {
      throw new ApiError('Cash movement amount must be greater than 0.', 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.pos_cash_movements.create({
        data: {
          tenant_id: tenantId,
          session_id: session.id,
          type: input.type,
          reason: input.reason,
          amount,
          reference_type: input.referenceType ?? null,
          reference_id: input.referenceId ?? null,
          notes: input.notes ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // Update expected_cash on the session
      const delta = input.type === 'in' ? amount : amount.neg()
      await tx.pos_sessions.update({
        where: { id: session.id },
        data: {
          expected_cash: { increment: delta },
          updated_by_user_id: tenantUserId,
        },
      })

      return movement
    })

    return { movement: result }
  })
}

/**
 * List sessions with pagination and filtering.
 */
export async function listSessions(authUserId: string, filters: SessionFilters = {}) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: Prisma.pos_sessionsWhereInput = {
      tenant_id: tenantId,
      ...(filters.terminalId && { terminal_id: filters.terminalId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.cashierId && { cashier_id: filters.cashierId }),
    }

    const [sessions, total] = await Promise.all([
      prisma.pos_sessions.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { opened_at: 'desc' },
        include: {
          terminal: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.pos_sessions.count({ where }),
    ])

    return {
      data: sessions,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
  })
}

/**
 * Gets session summary for the Z-Report (closing summary).
 */
export async function getSessionSummary(authUserId: string, sessionId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const session = await prisma.pos_sessions.findFirst({
      where: { id: sessionId, tenant_id: tenantId },
      include: {
        terminal: { select: { id: true, name: true, code: true } },
        pos_cash_movements: { orderBy: { created_at: 'asc' } },
      },
    })

    if (!session) {
      throw new ApiError('Session not found.', 404)
    }

    // Aggregate sales for this session
    const salesAgg = await prisma.sales_orders.aggregate({
      where: {
        pos_session_id: sessionId,
        tenant_id: tenantId,
        status: 'completed',
      },
      _sum: { total_amount: true, discount_amount: true, tax_amount: true },
      _count: { id: true },
    })

    // Aggregate payments by method
    const paymentsByMethod = await prisma.sales_order_payments.groupBy({
      by: ['payment_method'],
      where: {
        session_id: sessionId,
        tenant_id: tenantId,
        status: 'completed',
      },
      _sum: { amount: true },
      _count: { id: true },
    })

    return {
      session,
      sales: {
        totalSales: salesAgg._sum.total_amount?.toString() ?? '0',
        totalDiscounts: salesAgg._sum.discount_amount?.toString() ?? '0',
        totalTax: salesAgg._sum.tax_amount?.toString() ?? '0',
        orderCount: salesAgg._count.id,
      },
      paymentBreakdown: paymentsByMethod.map((pm) => ({
        method: pm.payment_method,
        total: pm._sum.amount?.toString() ?? '0',
        count: pm._count.id,
      })),
      cashMovements: session.pos_cash_movements,
    }
  })
}
