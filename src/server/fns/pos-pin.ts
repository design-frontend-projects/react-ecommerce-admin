'use server'

import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { resolveTenantId } from '@/server/utils/tenant'
import { getDatabasePermissionNames } from '@/server/utils/auth'

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
 * Set or update a user's POS PIN
 */
export async function setUserPin(
  authUserId: string,
  targetTenantUserId: string,
  pin: string
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
      permissionNames.includes('general.settings.manage')

    if (!canManageUsers) {
      throw new Error('Unauthorized: Only administrators or managers can set other users\' PINs')
    }
  }

  const hashedPin = await hashPin(pin)

  await prisma.$transaction(async (tx) => {
    await tx.pos_user_pins.upsert({
      where: {
        tenant_user_id: targetTenantUserId,
      },
      update: {
        pin_hash: hashedPin,
        is_active: true,
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date(),
      },
      create: {
        tenant_id: tenantId,
        tenant_user_id: targetTenantUserId,
        pin_hash: hashedPin,
        is_active: true,
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

  return { success: true, message: 'POS PIN set successfully' }
}

/**
 * Verify a user's POS PIN with lockout and rate-limiting
 */
export async function verifyUserPin(
  tenantId: string,
  tenantUserId: string,
  pin: string
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
      // Create new record to track failed attempts
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
    // Automatically migrate legacy plaintext PIN to bcrypt hash in pos_user_pins
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
  requiredPermission: string = 'pos.refund.approve'
): Promise<PinVerificationResult> {
  const pinResult = await verifyUserPin(tenantId, managerTenantUserId, pin)
  if (!pinResult.valid) {
    return pinResult
  }

  // Check if manager has the required permission
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
    permissionNames.includes('pos.refund.override')

  if (!isAuthorized) {
    return {
      valid: false,
      error: `User does not possess manager authorization (${requiredPermission})`,
    }
  }

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

  return { success: true, message: 'User PIN unlocked successfully' }
}
