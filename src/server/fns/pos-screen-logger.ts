'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type PosLogLevel = 'info' | 'warn' | 'error' | 'critical'

export type PosLogAction =
  | 'PIN_ASSIGNED'
  | 'PIN_VERIFY_SUCCESS'
  | 'PIN_VERIFY_FAILED'
  | 'PIN_LOCKED'
  | 'PIN_UNLOCKED'
  | 'PIN_STATUS_TOGGLED'
  | 'TERMINAL_USER_ASSIGNED'
  | 'TERMINAL_USER_REMOVED'
  | 'REFUND_ATTEMPT'
  | 'REFUND_PROCESSED'
  | 'REFUND_REJECTED'
  | 'SALE_CHECKOUT'
  | 'CART_CLEAR'
  | 'CART_HOLD'
  | 'CART_RESUME'
  | 'DISCOUNT_APPLIED'
  | 'DRAWER_OPEN'
  | 'CASH_MOVEMENT'
  | 'SESSION_OPEN'
  | 'SESSION_CLOSE'
  | 'MANAGER_OVERRIDE'
  | (string & {})

export interface LogPosScreenEventParams {
  tenantId: string
  terminalId?: string | null
  sessionId?: string | null
  userId?: string | null
  action: PosLogAction
  level?: PosLogLevel
  message: string
  details?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Persist an event log from the POS screen into pos_screen_logs.
 * Designed to be fail-safe: failures during logging are safely caught and warned,
 * ensuring business flows (sales, refunds, assignments) are never blocked.
 */
export async function logPosScreenEvent(params: LogPosScreenEventParams) {
  try {
    if (!params.tenantId) {
      console.warn('[POS Screen Logger] Skipped logging: tenantId is missing')
      return null
    }

    // Sanitize any sensitive details (e.g. raw PINs)
    const sanitizedDetails: Record<string, unknown> = params.details
      ? { ...params.details }
      : {}
    if ('pin' in sanitizedDetails) {
      delete sanitizedDetails.pin
    }
    if ('password' in sanitizedDetails) {
      delete sanitizedDetails.password
    }
    if ('pin_hash' in sanitizedDetails) {
      delete sanitizedDetails.pin_hash
    }

    return await (prisma as any).pos_screen_logs.create({
      data: {
        tenant_id: params.tenantId,
        terminal_id: params.terminalId || null,
        session_id: params.sessionId || null,
        user_id: params.userId || null,
        action: params.action,
        level: params.level || 'info',
        message: params.message.slice(0, 500),
        details: sanitizedDetails as Prisma.InputJsonValue,
        ip_address: params.ipAddress ? params.ipAddress.slice(0, 45) : null,
        user_agent: params.userAgent || null,
      },
    })
  } catch (error) {
    console.error('[POS Screen Logger Error]', error)
    return null
  }
}
