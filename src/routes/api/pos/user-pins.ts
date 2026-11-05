import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { requireTenantId } from '@/server/utils/tenant'
import {
  listUserPins,
  setUserPin,
  toggleUserPinStatus,
  unlockUserPin,
  resetUserPinAttempts,
  verifyUserPin,
  verifyManagerPin,
} from '@/server/fns/pos-pin'

// ── GET: List User PINs and terminal assignments ──
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const url = new URL(request.url)
    const terminalId = url.searchParams.get('terminalId') || undefined
    const search = url.searchParams.get('search') || undefined
    const statusParam = url.searchParams.get('status')
    const status =
      statusParam === 'active' || statusParam === 'inactive' || statusParam === 'locked'
        ? statusParam
        : 'all'

    const result = await listUserPins(auth.userId, {
      terminalId,
      search,
      status,
    })

    return Response.json(result)
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to list POS user PINs')
  }
})

// ── POST: Manage / Verify User PINs ──
const setPinSchema = z.object({
  action: z.literal('set-pin'),
  userId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,8}$/, 'PIN must be between 4 and 8 digits'),
  isActive: z.boolean().optional().default(true),
  terminalId: z.string().uuid().optional(),
})

const toggleStatusSchema = z.object({
  action: z.literal('toggle-status'),
  userId: z.string().uuid(),
  isActive: z.boolean(),
})

const unlockSchema = z.object({
  action: z.literal('unlock'),
  userId: z.string().uuid(),
})

const resetAttemptsSchema = z.object({
  action: z.literal('reset-attempts'),
  userId: z.string().uuid(),
})

const verifyPinSchema = z.object({
  action: z.literal('verify'),
  userId: z.string().uuid(),
  pin: z.string().min(1, 'PIN is required'),
  terminalId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
})

const verifyManagerSchema = z.object({
  action: z.literal('verify-manager'),
  managerUserId: z.string().uuid(),
  pin: z.string().min(1, 'PIN is required'),
  requiredPermission: z.string().optional().default('pos.refund.approve'),
  terminalId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
})

const postSchema = z.discriminatedUnion('action', [
  setPinSchema,
  toggleStatusSchema,
  unlockSchema,
  resetAttemptsSchema,
  verifyPinSchema,
  verifyManagerSchema,
])

const POST = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: 'INVALID_REQUEST', details: parsed.error.format() } },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.action === 'set-pin') {
      const result = await setUserPin(auth.userId, data.userId, data.pin, {
        isActive: data.isActive,
        terminalId: data.terminalId,
      })
      return Response.json(result)
    }

    if (data.action === 'toggle-status') {
      const result = await toggleUserPinStatus(auth.userId, data.userId, data.isActive)
      return Response.json(result)
    }

    if (data.action === 'unlock') {
      const result = await unlockUserPin(auth.userId, data.userId)
      return Response.json(result)
    }

    if (data.action === 'reset-attempts') {
      const result = await resetUserPinAttempts(auth.userId, data.userId)
      return Response.json(result)
    }

    if (data.action === 'verify') {
      const result = await verifyUserPin(tenantId, data.userId, data.pin, {
        terminalId: data.terminalId,
        sessionId: data.sessionId,
      })
      return Response.json(result)
    }

    if (data.action === 'verify-manager') {
      const result = await verifyManagerPin(
        tenantId,
        data.managerUserId,
        data.pin,
        data.requiredPermission,
        {
          terminalId: data.terminalId,
          sessionId: data.sessionId,
        }
      )
      return Response.json(result)
    }

    return Response.json({ success: false, error: { message: 'Invalid action' } }, { status: 400 })
  } catch (error: unknown) {
    return handleRouteError(error, 'PIN operation failed')
  }
})

export const Route = createFileRoute('/api/pos/user-pins')({
  server: {
    handlers: { GET, POST },
  },
})
