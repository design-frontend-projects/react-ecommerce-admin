import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { logPosScreenEvent } from '@/server/fns/pos-screen-logger'

// ── GET: Filtered POS Screen Logs ──
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const url = new URL(request.url)
    const terminalId = url.searchParams.get('terminalId') || undefined
    const sessionId = url.searchParams.get('sessionId') || undefined
    const userId = url.searchParams.get('userId') || undefined
    const action = url.searchParams.get('action') || undefined
    const level = url.searchParams.get('level') || undefined
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const search = url.searchParams.get('search') || undefined

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10)))
    const skip = (page - 1) * pageSize

    return await runWithTenantContext({ tenantId, userId: auth.userId }, async () => {
      const where: any = {
        tenant_id: tenantId,
        ...(terminalId && terminalId !== 'all' ? { terminal_id: terminalId } : {}),
        ...(sessionId && sessionId !== 'all' ? { session_id: sessionId } : {}),
        ...(userId && userId !== 'all' ? { user_id: userId } : {}),
        ...(action && action !== 'all' ? { action } : {}),
        ...(level && level !== 'all' ? { level } : {}),
      }

      if (startDate || endDate) {
        where.created_at = {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        }
      }

      if (search && search.trim()) {
        where.OR = [
          { message: { contains: search.trim(), mode: 'insensitive' } },
          { action: { contains: search.trim(), mode: 'insensitive' } },
        ]
      }

      const [total, logs] = await Promise.all([
        (prisma as any).pos_screen_logs.count({ where }),
        (prisma as any).pos_screen_logs.findMany({
          where,
          include: {
            pos_terminals: {
              select: { id: true, name: true, code: true },
            },
            pos_sessions: {
              select: { id: true, status: true, opened_at: true },
            },
            tenant_users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                avatar_url: true,
                default_role: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: pageSize,
        }),
      ])

      const mappedLogs = logs.map((l: any) => {
        const u = l.tenant_users
        const userName = u
          ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Cashier'
          : 'System'

        return {
          id: l.id,
          tenantId: l.tenant_id,
          terminalId: l.terminal_id,
          terminalName: l.pos_terminals?.name || null,
          terminalCode: l.pos_terminals?.code || null,
          sessionId: l.session_id,
          userId: l.user_id,
          userName,
          userEmail: u?.email || null,
          userAvatar: u?.avatar_url || null,
          userRole: u?.default_role || null,
          action: l.action,
          level: l.level,
          message: l.message,
          details: l.details,
          ipAddress: l.ip_address,
          userAgent: l.user_agent,
          createdAt: l.created_at.toISOString(),
        }
      })

      return Response.json({
        success: true,
        data: {
          logs: mappedLogs,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      })
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to fetch POS screen logs')
  }
})

// ── POST: Ingest Client Event Log ──
const clientLogSchema = z.object({
  action: z.string().min(1),
  level: z.enum(['info', 'warn', 'error', 'critical']).optional().default('info'),
  message: z.string().min(1).max(500),
  terminalId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  details: z.record(z.unknown()).optional(),
})

const POST = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const tenantUserId = await resolveTenantUserId(auth.userId)
    const body = await request.json()
    const parsed = clientLogSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: 'INVALID_REQUEST', details: parsed.error.format() } },
        { status: 400 }
      )
    }

    const data = parsed.data
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    const log = await logPosScreenEvent({
      tenantId,
      terminalId: data.terminalId,
      sessionId: data.sessionId,
      userId: tenantUserId,
      action: data.action,
      level: data.level,
      message: data.message,
      details: data.details,
      ipAddress: ip,
      userAgent,
    })

    return Response.json({ success: true, data: log }, { status: 201 })
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to record POS screen log')
  }
})

export const Route = createFileRoute('/api/pos/screen-logs')({
  server: {
    handlers: { GET, POST },
  },
})
