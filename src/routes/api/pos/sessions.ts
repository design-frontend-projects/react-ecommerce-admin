import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import {
  getTerminalStatus,
  openPosSession,
  closePosSession,
  addCashMovement,
  listSessions,
  getSessionSummary,
} from '@/server/fns/pos-session-engine'
import { z } from 'zod'

// ── GET: Session info (active session, session list, session summary) ──
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') ?? 'list'

    if (action === 'terminal-status') {
      const terminalId = url.searchParams.get('terminalId')
      if (!terminalId) {
        return Response.json({ success: false, error: { message: 'terminalId is required' } }, { status: 400 })
      }
      const result = await getTerminalStatus(auth.userId, terminalId)
      return Response.json({ success: true, data: result })
    }

    if (action === 'summary') {
      const sessionId = url.searchParams.get('sessionId')
      if (!sessionId) {
        return Response.json({ success: false, error: { message: 'sessionId is required' } }, { status: 400 })
      }
      const result = await getSessionSummary(auth.userId, sessionId)
      return Response.json({ success: true, data: result })
    }

    // Default: list sessions
    const result = await listSessions(auth.userId, {
      terminalId: url.searchParams.get('terminalId') ?? undefined,
      status: (url.searchParams.get('status') as 'open' | 'closed' | 'suspended') ?? undefined,
      cashierId: url.searchParams.get('cashierId') ?? undefined,
      page: Number(url.searchParams.get('page') ?? 1),
      pageSize: Number(url.searchParams.get('pageSize') ?? 20),
    })
    return Response.json({ success: true, data: result })
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to retrieve session info')
  }
})

// ── POST: Open session, Close session, Cash In/Out ──
const openSchema = z.object({
  action: z.literal('open'),
  terminalId: z.string().uuid(),
  openingCash: z.union([z.number().nonnegative(), z.string()]),
  notes: z.string().optional(),
})

const closeSchema = z.object({
  action: z.literal('close'),
  sessionId: z.string().uuid(),
  actualCash: z.union([z.number().nonnegative(), z.string()]),
  notes: z.string().optional(),
})

const cashMovementSchema = z.object({
  action: z.literal('cash-movement'),
  sessionId: z.string().uuid(),
  type: z.enum(['in', 'out']),
  reason: z.enum([
    'opening', 'closing', 'sale', 'purchase_refund', 'customer_refund',
    'supplier_payment', 'customer_payment', 'expense', 'income', 'payout', 'adjustment',
  ]),
  amount: z.union([z.number().positive(), z.string()]),
  notes: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
})

const postSchema = z.discriminatedUnion('action', [openSchema, closeSchema, cashMovementSchema])

const POST = withAuth(PERMISSIONS.POS_SESSION_MANAGE, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid request', details: parsed.error.format() } },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.action === 'open') {
      const result = await openPosSession(auth.userId, {
        terminalId: data.terminalId,
        openingCash: data.openingCash,
        notes: data.notes,
      })
      return Response.json({ success: true, data: result }, { status: 201 })
    }

    if (data.action === 'close') {
      const result = await closePosSession(auth.userId, {
        sessionId: data.sessionId,
        actualCash: data.actualCash,
        notes: data.notes,
      })
      return Response.json({ success: true, data: result })
    }

    if (data.action === 'cash-movement') {
      const result = await addCashMovement(auth.userId, {
        sessionId: data.sessionId,
        type: data.type,
        reason: data.reason,
        amount: data.amount,
        notes: data.notes,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      })
      return Response.json({ success: true, data: result }, { status: 201 })
    }

    return Response.json({ success: false, error: { message: 'Unknown action' } }, { status: 400 })
  } catch (error: unknown) {
    return handleRouteError(error, 'Session operation failed')
  }
})

export const Route = createFileRoute('/api/pos/sessions')({
  server: {
    handlers: { GET, POST },
  },
})
