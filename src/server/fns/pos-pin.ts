'use server'

import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { resolveTenantId } from '@/server/utils/tenant'
import { getDatabasePermissionNames } from '@/server/utils/auth'
import { logPosScreenEvent } from './pos-screen-logger'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const PIN_SALT_ROUNDS = 10

export interface PinVerificationResult {
  valid: boolean
  error?: string
  locked?: boolean
  tenantUserId?: string
  userName?: string
}

export interface SetUserPinOptions {
  isActive?: boolean
  terminalId?: string
  resetAttempts?: boolean
  clearLock?: boolean
}

export interface UserPinListItem {
  id: string
  name: string
  email: string
  phone: string
  avatarUrl: string | null
  role: string
  isUserActive: boolean
  hasPin: boolean
  pinId: string | null
  isPinActive: boolean
  failedAttempts: number
  lockedUntil: string | null
  isLocked: boolean
  pinCreatedAt: string | null
  pinUpdatedAt: string | null
  assignedTerminals: Array<{
    id: string
    name: string
    code: string
    isActive: boolean
  }>
}

/**
 * Hash a plain numeric PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
    throw new Error('PIN must be between 4 and 8 digits')
  }
  return bcrypt.hash(pin, PIN_SALT_ROUNDS)
}

/**
 * Set or update a user's POS PIN with full model configuration
 */
export async function setUserPin(
  authUserId: string,
  targetTenantUserId: string,
  pin: string,
  options?: SetUserPinOptions
): Promise<{ success: boolean; message: string }> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unauthorized: Tenant context not found')
  }

  // Check caller authorization: either setting own PIN or caller has permissions.manage / users.manage
  const callerUser = await prisma.tenant_users.findFirst({
    where: { auth_user_id: authUserId, tenant_id: tenantId },
    select: { id: true },
  })

  if (!callerUser) {
    throw new Error('Unauthorized: User record not found')
  }

  const isSelf = callerUser.id === targetTenantUserId
  if (!isSelf) {
    const { permissionNames } = await getDatabasePermissionNames(authUserId)
    const canManageUsers =
      permissionNames.includes('*') ||
      permissionNames.includes('access_control.users.manage') ||
      permissionNames.includes('pos.terminals.manage') ||
      permissionNames.includes('general.settings.manage')

    if (!canManageUsers) {
      throw new Error('Unauthorized: Only administrators or managers can set other users\' PINs')
    }
  }

  const hashedPin = await hashPin(pin)
  const isActive = options?.isActive ?? true

  await prisma.$transaction(async (tx) => {
    await tx.pos_user_pins.upsert({
      where: {
        tenant_user_id: targetTenantUserId,
      },
      update: {
        pin_hash: hashedPin,
        is_active: isActive,
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date(),
      },
      create: {
        tenant_id: tenantId,
        tenant_user_id: targetTenantUserId,
        pin_hash: hashedPin,
        is_active: isActive,
        failed_attempts: 0,
        locked_until: null,
      },
    })

    // Sync to tenant_users.refund_pin_code for backward compatibility
    await tx.tenant_users.update({
      where: { id: targetTenantUserId },
      data: { refund_pin_code: hashedPin },
    })
  })

  // Log PIN assignment to POS screen logs
  await logPosScreenEvent({
    tenantId,
    userId: targetTenantUserId,
    terminalId: options?.terminalId,
    action: 'PIN_ASSIGNED',
    level: 'info',
    message: `PIN set/updated for user ${targetTenantUserId}`,
    details: {
      assignedByAuthId: authUserId,
      targetUserId: targetTenantUserId,
      terminalId: options?.terminalId,
      isActive,
    },
  })

  return { success: true, message: 'POS PIN configured successfully' }
}

/**
 * List all users in the tenant along with their POS PIN and terminal assignment statuses
 */
export async function listUserPins(
  authUserId: string,
  filters?: {
    terminalId?: string
    search?: string
    status?: 'all' | 'active' | 'inactive' | 'locked'
  }
): Promise<{ success: boolean; data: UserPinListItem[] }> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unauthorized: Tenant context not found')
  }

  const users = await prisma.tenant_users.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      avatar_url: true,
      default_role: true,
      is_active: true,
      pos_user_pins: {
        select: {
          id: true,
          is_active: true,
          failed_attempts: true,
          locked_until: true,
          created_at: true,
          updated_at: true,
        },
      },
      pos_terminal_users: {
        select: {
          is_active: true,
          terminal: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [{ first_name: 'asc' }, { email: 'asc' }],
  })

  const now = new Date()

  let list: UserPinListItem[] = users.map((u) => {
    const pin = u.pos_user_pins
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Cashier'
    const isLocked = Boolean(pin?.locked_until && pin.locked_until > now)

    return {
      id: u.id,
      name: fullName,
      email: u.email || '',
      phone: u.phone || '',
      avatarUrl: u.avatar_url,
      role: u.default_role || 'cashier',
      isUserActive: u.is_active ?? true,
      hasPin: Boolean(pin),
      pinId: pin?.id || null,
      isPinActive: pin?.is_active ?? false,
      failedAttempts: pin?.failed_attempts ?? 0,
      lockedUntil: pin?.locked_until ? pin.locked_until.toISOString() : null,
      isLocked,
      pinCreatedAt: pin?.created_at ? pin.created_at.toISOString() : null,
      pinUpdatedAt: pin?.updated_at ? pin.updated_at.toISOString() : null,
      assignedTerminals: u.pos_terminal_users.map((tu) => ({
        id: tu.terminal.id,
        name: tu.terminal.name,
        code: tu.terminal.code,
        isActive: tu.is_active,
      })),
    }
  })

  // Apply filters
  if (filters?.terminalId && filters.terminalId !== 'all') {
    list = list.filter((item) =>
      item.assignedTerminals.some((t) => t.id === filters.terminalId)
    )
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q)
    )
  }

  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'locked') {
      list = list.filter((item) => item.isLocked)
    } else if (filters.status === 'active') {
      list = list.filter((item) => item.hasPin && item.isPinActive && !item.isLocked)
    } else if (filters.status === 'inactive') {
      list = list.filter((item) => !item.hasPin || !item.isPinActive)
    }
  }

  return { success: true, data: list }
}

/**
 * Toggle active status of a user's POS PIN
 */
export async function toggleUserPinStatus(
  authUserId: string,
  targetTenantUserId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unauthorized: Tenant context not found')
  }

  const { permissionNames } = await getDatabasePermissionNames(authUserId)
  const canManage =
    permissionNames.includes('*') ||
    permissionNames.includes('access_control.users.manage') ||
    permissionNames.includes('pos.terminals.manage')

  if (!canManage) {
    throw new Error('Unauthorized: Insufficient permissions to change PIN status')
  }

  await prisma.pos_user_pins.updateMany({
    where: {
      tenant_id: tenantId,
      tenant_user_id: targetTenantUserId,
    },
    data: {
      is_active: isActive,
      updated_at: new Date(),
    },
  })

  await logPosScreenEvent({
    tenantId,
    userId: targetTenantUserId,
    action: 'PIN_STATUS_TOGGLED',
    level: 'info',
    message: `POS PIN for user ${targetTenantUserId} set to ${isActive ? 'active' : 'inactive'}`,
    details: { isActive, changedByAuthId: authUserId },
  })

  return { success: true, message: `PIN status updated to ${isActive ? 'active' : 'inactive'}` }
}

/**
 * Reset failed attempts counter for a user's POS PIN
 */
export async function resetUserPinAttempts(
  authUserId: string,
  targetTenantUserId: string
): Promise<{ success: boolean; message: string }> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unauthorized: Tenant context not found')
  }

  await prisma.pos_user_pins.updateMany({
    where: {
      tenant_id: tenantId,
      tenant_user_id: targetTenantUserId,
    },
    data: {
      failed_attempts: 0,
      updated_at: new Date(),
    },
  })

  return { success: true, message: 'Failed PIN attempts reset successfully' }
}

/**
 * Verify a user's POS PIN with lockout and rate-limiting
 */
export async function verifyUserPin(
  tenantId: string,
  tenantUserId: string,
  pin: string,
  context?: { terminalId?: string; sessionId?: string }
): Promise<PinVerificationResult> {
  if (!pin) {
    return { valid: false, error: 'PIN is required' }
  }

  const user = await prisma.tenant_users.findFirst({
    where: { id: tenantUserId, tenant_id: tenantId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      refund_pin_code: true,
      pos_user_pins: {
        select: {
          id: true,
          pin_hash: true,
          is_active: true,
          failed_attempts: true,
          locked_until: true,
        },
      },
    },
  })

  if (!user) {
    return { valid: false, error: 'User not found in this tenant' }
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User'
  const pinRecord = user.pos_user_pins

  // Check lockout
  if (pinRecord?.locked_until && pinRecord.locked_until > new Date()) {
    const remainingMinutes = Math.ceil(
      (pinRecord.locked_until.getTime() - Date.now()) / (60 * 1000)
    )

    await logPosScreenEvent({
      tenantId,
      userId: tenantUserId,
      terminalId: context?.terminalId,
      sessionId: context?.sessionId,
      action: 'PIN_VERIFY_FAILED',
      level: 'warn',
      message: `PIN verification attempted while account locked (${remainingMinutes}m remaining)`,
      details: { locked: true, remainingMinutes },
    })

    return {
      valid: false,
      locked: true,
      error: `PIN is locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s) or contact an administrator.`,
    }
  }

  if (pinRecord && !pinRecord.is_active) {
    return { valid: false, error: 'POS PIN is inactive. Please reset your PIN.' }
  }

  let hashToCompare = pinRecord?.pin_hash
  let isLegacyPlaintext = false

  // Fallback to legacy tenant_users.refund_pin_code
  if (!hashToCompare && user.refund_pin_code) {
    hashToCompare = user.refund_pin_code
    if (!hashToCompare.startsWith('$2a$') && !hashToCompare.startsWith('$2b$')) {
      isLegacyPlaintext = true
    }
  }

  if (!hashToCompare) {
    return { valid: false, error: 'No POS PIN configured for this user. Please set up a PIN.' }
  }

  let isMatch = false
  if (isLegacyPlaintext) {
    isMatch = hashToCompare === pin
  } else {
    try {
      isMatch = await bcrypt.compare(pin, hashToCompare)
    } catch {
      isMatch = false
    }
  }

  if (!isMatch) {
    const currentFailed = (pinRecord?.failed_attempts ?? 0) + 1
    const shouldLock = currentFailed >= MAX_FAILED_ATTEMPTS
    const lockTime = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : null

    if (pinRecord) {
      await prisma.pos_user_pins.update({
        where: { id: pinRecord.id },
        data: {
          failed_attempts: currentFailed,
          locked_until: lockTime,
          updated_at: new Date(),
        },
      })
    } else {
      await prisma.pos_user_pins.create({
        data: {
          tenant_id: tenantId,
          tenant_user_id: tenantUserId,
          pin_hash: await hashPin(pin).catch(() => 'INVALID'),
          failed_attempts: currentFailed,
          locked_until: lockTime,
        },
      })
    }

    await logPosScreenEvent({
      tenantId,
      userId: tenantUserId,
      terminalId: context?.terminalId,
      sessionId: context?.sessionId,
      action: shouldLock ? 'PIN_LOCKED' : 'PIN_VERIFY_FAILED',
      level: shouldLock ? 'critical' : 'warn',
      message: shouldLock
        ? `User PIN locked after ${MAX_FAILED_ATTEMPTS} failed attempts`
        : `Invalid PIN attempt (${currentFailed}/${MAX_FAILED_ATTEMPTS})`,
      details: { failedAttempts: currentFailed, locked: shouldLock },
    })

    if (shouldLock) {
      return {
        valid: false,
        locked: true,
        error: `PIN locked for ${LOCKOUT_MINUTES} minutes due to ${MAX_FAILED_ATTEMPTS} consecutive failed attempts.`,
      }
    }

    const remaining = MAX_FAILED_ATTEMPTS - currentFailed
    return {
      valid: false,
      error: `Invalid PIN. ${remaining} attempt(s) remaining before lockout.`,
    }
  }

  // PIN is correct - reset failed attempts and lockout
  if (pinRecord) {
    await prisma.pos_user_pins.update({
      where: { id: pinRecord.id },
      data: {
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date(),
      },
    })
  } else if (isLegacyPlaintext) {
    const secureHash = await hashPin(pin)
    await prisma.pos_user_pins.create({
      data: {
        tenant_id: tenantId,
        tenant_user_id: tenantUserId,
        pin_hash: secureHash,
        failed_attempts: 0,
        locked_until: null,
      },
    })
    await prisma.tenant_users.update({
      where: { id: tenantUserId },
      data: { refund_pin_code: secureHash },
    })
  }

  await logPosScreenEvent({
    tenantId,
    userId: tenantUserId,
    terminalId: context?.terminalId,
    sessionId: context?.sessionId,
    action: 'PIN_VERIFY_SUCCESS',
    level: 'info',
    message: `PIN successfully verified for user ${fullName}`,
    details: { userName: fullName },
  })

  return {
    valid: true,
    tenantUserId,
    userName: fullName,
  }
}

/**
 * Verify a manager/supervisor PIN for override or approval
 */
export async function verifyManagerPin(
  tenantId: string,
  managerTenantUserId: string,
  pin: string,
  requiredPermission: string = 'pos.refund.approve',
  context?: { terminalId?: string; sessionId?: string }
): Promise<PinVerificationResult> {
  const pinResult = await verifyUserPin(tenantId, managerTenantUserId, pin, context)
  if (!pinResult.valid) {
    return pinResult
  }

  const managerUser = await prisma.tenant_users.findFirst({
    where: { id: managerTenantUserId, tenant_id: tenantId },
    select: { auth_user_id: true },
  })

  if (!managerUser?.auth_user_id) {
    return { valid: false, error: 'Manager account has no authentication identity' }
  }

  const { permissionNames } = await getDatabasePermissionNames(managerUser.auth_user_id)
  const isAuthorized =
    permissionNames.includes('*') ||
    permissionNames.includes(requiredPermission) ||
    permissionNames.includes('pos.refund.override') ||
    permissionNames.includes('pos.terminals.manage')

  if (!isAuthorized) {
    return {
      valid: false,
      error: `User does not possess manager authorization (${requiredPermission})`,
    }
  }

  await logPosScreenEvent({
    tenantId,
    userId: managerTenantUserId,
    terminalId: context?.terminalId,
    sessionId: context?.sessionId,
    action: 'MANAGER_OVERRIDE',
    level: 'info',
    message: `Manager override verified for ${pinResult.userName} with permission ${requiredPermission}`,
    details: { requiredPermission, managerUserId: managerTenantUserId },
  })

  return pinResult
}

/**
 * Unlock a locked PIN (Admin / Manager only)
 */
export async function unlockUserPin(
  authUserId: string,
  targetTenantUserId: string
): Promise<{ success: boolean; message: string }> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unauthorized: Tenant context not found')
  }

  const { permissionNames } = await getDatabasePermissionNames(authUserId)
  const canUnlock =
    permissionNames.includes('*') ||
    permissionNames.includes('access_control.users.manage') ||
    permissionNames.includes('pos.terminals.manage') ||
    permissionNames.includes('pos.refund.override')

  if (!canUnlock) {
    throw new Error('Unauthorized: Insufficient permissions to unlock user PIN')
  }

  await prisma.pos_user_pins.updateMany({
    where: { tenant_id: tenantId, tenant_user_id: targetTenantUserId },
    data: {
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date(),
    },
  })

  await logPosScreenEvent({
    tenantId,
    userId: targetTenantUserId,
    action: 'PIN_UNLOCKED',
    level: 'info',
    message: `PIN unlocked by administrator ${authUserId}`,
    details: { unlockedByAuthId: authUserId },
  })

  return { success: true, message: 'User PIN unlocked successfully' }
}
