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

    const sessionWithMovements = await prisma.pos_sessions.findFirst({
      where: { id: session.id, tenant_id: tenantId },
      include: {
        pos_cash_movements: { orderBy: { created_at: 'asc' } },
      },
    })

    const metrics = await calculateSessionFinancialMetrics(
      tenantId,
      sessionWithMovements || session
    )

    const expectedCash = new Prisma.Decimal(metrics.expectedCash)
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
          amount: actualCash.abs(),
          notes: input.notes ?? 'Session closing reconciliation',
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

    const formattedSessions = sessions.map((s) => ({
      ...s,
      discrepancy: s.cash_difference,
    }))

    return {
      data: formattedSessions,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
  })
}

/**
 * Helper to compute financial metrics for a POS session by inspecting
 * sales orders, invoices, payments, and cash movements compared to the shift timeframe.
 */
async function calculateSessionFinancialMetrics(
  tenantId: string,
  session: {
    id: string
    terminal_id: string
    opening_cash: Prisma.Decimal | number | string
    actual_cash?: Prisma.Decimal | number | string | null
    cash_difference?: Prisma.Decimal | number | string | null
    opened_at: Date
    closed_at?: Date | null
    pos_cash_movements?: Array<{
      id: string
      type: string
      reason: string
      amount: Prisma.Decimal | number | string
      created_at: Date
    }>
  }
) {
  const shiftOpenedAt = new Date(session.opened_at)
  const shiftClosedAt = session.closed_at ? new Date(session.closed_at) : new Date()

  // 1. Query sales orders created during this shift on this terminal or directly linked to this session
  const salesOrders = await prisma.sales_orders.findMany({
    where: {
      tenant_id: tenantId,
      status: { in: ['completed', 'confirmed'] },
      OR: [
        { pos_session_id: session.id },
        {
          pos_terminal_id: session.terminal_id,
          created_at: {
            gte: shiftOpenedAt,
            ...(session.closed_at ? { lte: session.closed_at } : {}),
          },
        },
      ],
    },
    select: {
      id: true,
      order_number: true,
      total_amount: true,
      discount_amount: true,
      tax_amount: true,
      payment_status: true,
      created_at: true,
      sales_order_payments: {
        select: {
          id: true,
          payment_method: true,
          amount: true,
          status: true,
          created_at: true,
        },
      },
    },
  })

  // 2. Query corresponding sales invoices generated during this shift
  const orderIds = salesOrders.map((o) => o.id)
  const salesInvoices = await prisma.sales_invoices.findMany({
    where: {
      tenant_id: tenantId,
      status: { not: 'cancelled' },
      OR: [
        ...(orderIds.length > 0 ? [{ source_id: { in: orderIds } }] : []),
        {
          pos_terminal_id: session.terminal_id,
          created_at: {
            gte: shiftOpenedAt,
            ...(session.closed_at ? { lte: session.closed_at } : {}),
          },
        },
      ],
    },
    select: {
      id: true,
      invoice_no: true,
      total_amount: true,
      paid_amount: true,
      status: true,
      payment_status: true,
      created_at: true,
    },
  })

  // 3. Query direct payments assigned to this session id
  const directPayments = await prisma.sales_order_payments.findMany({
    where: {
      tenant_id: tenantId,
      session_id: session.id,
      status: { in: ['completed', 'refunded'] },
    },
    select: {
      id: true,
      payment_method: true,
      amount: true,
      status: true,
      created_at: true,
      sales_order_id: true,
    },
  })

  // 4. Merge & deduplicate payments
  const paymentMap = new Map<
    string,
    { id: string; method: string; amount: number; status: string }
  >()

  for (const order of salesOrders) {
    for (const p of order.sales_order_payments) {
      if (p.status === 'completed' || p.status === 'refunded') {
        paymentMap.set(p.id, {
          id: p.id,
          method: p.payment_method,
          amount: Number(p.amount),
          status: p.status,
        })
      }
    }
  }

  for (const p of directPayments) {
    paymentMap.set(p.id, {
      id: p.id,
      method: p.payment_method,
      amount: Number(p.amount),
      status: p.status,
    })
  }

  const allPayments = Array.from(paymentMap.values())

  // 5. Cash movements calculation
  const movements = session.pos_cash_movements ?? []
  const openingCash = Number(session.opening_cash || 0)

  let cashIn = 0
  let cashOut = 0
  let cashRefundsFromMovements = 0
  let cashSalesFromMovements = 0

  for (const mv of movements) {
    const amt = Number(mv.amount)
    if (mv.type === 'in') {
      if (mv.reason === 'sale') {
        cashSalesFromMovements += amt
      } else if (mv.reason !== 'opening') {
        cashIn += amt
      }
    } else if (mv.type === 'out') {
      if (mv.reason === 'customer_refund') {
        cashRefundsFromMovements += amt
      } else if (mv.reason !== 'closing') {
        cashOut += amt
      }
    }
  }

  // Payment method aggregates
  const completedPayments = allPayments.filter((p) => p.status === 'completed')
  const cashSalesFromPayments = completedPayments
    .filter((p) => p.method === 'cash')
    .reduce((sum, p) => sum + p.amount, 0)
  const cardSales = completedPayments
    .filter((p) => p.method === 'card')
    .reduce((sum, p) => sum + p.amount, 0)
  const otherSales = completedPayments
    .filter((p) => p.method !== 'cash' && p.method !== 'card')
    .reduce((sum, p) => sum + p.amount, 0)

  const refundedCashPayments = allPayments
    .filter((p) => p.method === 'cash' && (p.status === 'refunded' || p.amount < 0))
    .reduce((sum, p) => sum + Math.abs(p.amount), 0)

  const cashSales = Math.max(cashSalesFromPayments, cashSalesFromMovements)
  const cashRefunds = Math.max(refundedCashPayments, cashRefundsFromMovements)

  // Expected cash in drawer: Opening Float + Cash Sales + Cash In - Cash Out - Cash Refunds
  const expectedCash = openingCash + cashSales + cashIn - cashOut - cashRefunds

  let totalSales = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  if (totalSales === 0 && salesOrders.length > 0) {
    totalSales = salesOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  }

  // Payment Breakdown
  const methodGroup = new Map<string, { total: number; count: number }>()
  for (const p of completedPayments) {
    const existing = methodGroup.get(p.method) || { total: 0, count: 0 }
    existing.total += p.amount
    existing.count += 1
    methodGroup.set(p.method, existing)
  }
  if (!methodGroup.has('cash') && cashSales > 0) {
    methodGroup.set('cash', { total: cashSales, count: salesOrders.length || 1 })
  }
  const paymentBreakdown = Array.from(methodGroup.entries()).map(([method, val]) => ({
    method,
    total: val.total.toFixed(2),
    count: val.count,
  }))

  const actualCash =
    session.actual_cash != null ? Number(session.actual_cash) : expectedCash
  const discrepancy =
    session.cash_difference != null
      ? Number(session.cash_difference)
      : actualCash - expectedCash

  const shiftDurationMinutes = Math.max(
    0,
    Math.round((shiftClosedAt.getTime() - shiftOpenedAt.getTime()) / (1000 * 60))
  )

  return {
    openingCash,
    cashSales,
    cardSales,
    otherSales,
    totalSales,
    cashIn,
    cashOut,
    cashRefunds,
    expectedCash,
    actualCash,
    discrepancy,
    ordersCount: salesOrders.length,
    invoicesCount: salesInvoices.length,
    shiftTimeframe: {
      openedAt: shiftOpenedAt,
      closedAt: session.closed_at ?? null,
      isOpen: !session.closed_at,
      durationMinutes: shiftDurationMinutes,
    },
    sales: {
      totalSales: totalSales.toFixed(2),
      totalDiscounts: salesOrders
        .reduce((sum, o) => sum + Number(o.discount_amount || 0), 0)
        .toFixed(2),
      totalTax: salesOrders
        .reduce((sum, o) => sum + Number(o.tax_amount || 0), 0)
        .toFixed(2),
      orderCount: salesOrders.length,
      invoiceCount: salesInvoices.length,
    },
    paymentBreakdown,
    orders: salesOrders.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      total: Number(o.total_amount),
      paymentStatus: o.payment_status,
      createdAt: o.created_at,
    })),
    invoices: salesInvoices.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoice_no,
      total: Number(inv.total_amount),
      status: inv.status,
      paymentStatus: inv.payment_status,
      createdAt: inv.created_at,
    })),
  }
}

/**
 * Gets session summary for the Z-Report and shift reconciliation modal.
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

    const metrics = await calculateSessionFinancialMetrics(tenantId, session)

    return {
      session,
      ...metrics,
      cashMovements: session.pos_cash_movements,
    }
  })
}

