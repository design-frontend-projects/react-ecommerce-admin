import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import {
  hashPin,
  verifyUserPin,
  unlockUserPin,
  toggleUserPinStatus,
  resetUserPinAttempts,
} from '@/server/fns/pos-pin'

// Mock prisma and auth dependencies
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    tenant_users: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    pos_user_pins: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    pos_screen_logs: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
    $transaction: vi.fn((fn) => fn(mockPrisma)),
  }
  return { default: mockPrisma }
})

vi.mock('@/server/utils/tenant', () => ({
  resolveTenantId: vi.fn().mockResolvedValue('tenant-1'),
  requireTenantId: vi.fn().mockResolvedValue('tenant-1'),
  resolveTenantUserId: vi.fn().mockResolvedValue('user-admin'),
}))

vi.mock('@/server/utils/auth', () => ({
  getDatabasePermissionNames: vi.fn().mockResolvedValue({
    permissionNames: ['*'],
  }),
}))

vi.mock('@/server/fns/pos-screen-logger', () => ({
  logPosScreenEvent: vi.fn().mockResolvedValue({ id: 'log-mock' }),
}))

import prisma from '@/lib/prisma'

describe('POS User PINs - hashPin', () => {
  it('successfully hashes valid 4-8 digit numeric PINs', async () => {
    const hashed4 = await hashPin('1234')
    expect(hashed4).toBeDefined()
    expect(await bcrypt.compare('1234', hashed4)).toBe(true)

    const hashed8 = await hashPin('98765432')
    expect(hashed8).toBeDefined()
    expect(await bcrypt.compare('98765432', hashed8)).toBe(true)
  })

  it('rejects PINs shorter than 4 digits', async () => {
    await expect(hashPin('123')).rejects.toThrow('PIN must be between 4 and 8 digits')
    await expect(hashPin('')).rejects.toThrow('PIN must be between 4 and 8 digits')
  })

  it('rejects PINs longer than 8 digits', async () => {
    await expect(hashPin('123456789')).rejects.toThrow('PIN must be between 4 and 8 digits')
  })

  it('rejects non-numeric PINs', async () => {
    await expect(hashPin('12a4')).rejects.toThrow('PIN must be between 4 and 8 digits')
    await expect(hashPin('abcd')).rejects.toThrow('PIN must be between 4 and 8 digits')
  })
})

describe('POS User PINs - verifyUserPin', () => {
  const tenantId = 'tenant-1'
  const userId = 'user-cashier-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully verifies a valid PIN and resets failed attempts', async () => {
    const validHash = await bcrypt.hash('4321', 10)

    vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
      id: userId,
      first_name: 'Alice',
      last_name: 'Cashier',
      refund_pin_code: validHash,
      pos_user_pins: {
        id: 'pin-1',
        pin_hash: validHash,
        is_active: true,
        failed_attempts: 2,
        locked_until: null,
      },
    } as any)

    const result = await verifyUserPin(tenantId, userId, '4321')
    expect(result.valid).toBe(true)
    expect(result.userName).toBe('Alice Cashier')
    expect(result.tenantUserId).toBe(userId)

    // Verify reset of failed attempts
    expect(prisma.pos_user_pins.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pin-1' },
        data: expect.objectContaining({
          failed_attempts: 0,
          locked_until: null,
        }),
      })
    )
  })

  it('increments failed attempts when an invalid PIN is entered', async () => {
    const validHash = await bcrypt.hash('4321', 10)

    vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
      id: userId,
      first_name: 'Alice',
      last_name: 'Cashier',
      refund_pin_code: validHash,
      pos_user_pins: {
        id: 'pin-1',
        pin_hash: validHash,
        is_active: true,
        failed_attempts: 1,
        locked_until: null,
      },
    } as any)

    const result = await verifyUserPin(tenantId, userId, '9999')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('3 attempt(s) remaining')

    expect(prisma.pos_user_pins.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pin-1' },
        data: expect.objectContaining({
          failed_attempts: 2,
          locked_until: null,
        }),
      })
    )
  })

  it('locks the account when reaching 5 consecutive failed attempts', async () => {
    const validHash = await bcrypt.hash('4321', 10)

    vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
      id: userId,
      first_name: 'Alice',
      last_name: 'Cashier',
      refund_pin_code: validHash,
      pos_user_pins: {
        id: 'pin-1',
        pin_hash: validHash,
        is_active: true,
        failed_attempts: 4,
        locked_until: null,
      },
    } as any)

    const result = await verifyUserPin(tenantId, userId, '0000')
    expect(result.valid).toBe(false)
    expect(result.locked).toBe(true)
    expect(result.error).toContain('PIN locked for 15 minutes due to 5 consecutive failed attempts')

    expect(prisma.pos_user_pins.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pin-1' },
        data: expect.objectContaining({
          failed_attempts: 5,
          locked_until: expect.any(Date),
        }),
      })
    )
  })

  it('blocks verification while an account is actively locked', async () => {
    const validHash = await bcrypt.hash('4321', 10)
    const futureLock = new Date(Date.now() + 10 * 60 * 1000)

    vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
      id: userId,
      first_name: 'Alice',
      last_name: 'Cashier',
      refund_pin_code: validHash,
      pos_user_pins: {
        id: 'pin-1',
        pin_hash: validHash,
        is_active: true,
        failed_attempts: 5,
        locked_until: futureLock,
      },
    } as any)

    const result = await verifyUserPin(tenantId, userId, '4321')
    expect(result.valid).toBe(false)
    expect(result.locked).toBe(true)
    expect(result.error).toContain('PIN is locked due to too many failed attempts')
  })

  it('rejects verification if POS PIN is marked inactive', async () => {
    const validHash = await bcrypt.hash('4321', 10)

    vi.mocked(prisma.tenant_users.findFirst).mockResolvedValueOnce({
      id: userId,
      first_name: 'Alice',
      last_name: 'Cashier',
      refund_pin_code: validHash,
      pos_user_pins: {
        id: 'pin-1',
        pin_hash: validHash,
        is_active: false,
        failed_attempts: 0,
        locked_until: null,
      },
    } as any)

    const result = await verifyUserPin(tenantId, userId, '4321')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('POS PIN is inactive')
  })
})

describe('POS User PINs - Administrative Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unlocks a locked user PIN', async () => {
    const res = await unlockUserPin('admin-auth-id', 'target-user-1')
    expect(res.success).toBe(true)
    expect(prisma.pos_user_pins.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: 'tenant-1', tenant_user_id: 'target-user-1' },
        data: expect.objectContaining({
          failed_attempts: 0,
          locked_until: null,
        }),
      })
    )
  })

  it('toggles PIN active status', async () => {
    const res = await toggleUserPinStatus('admin-auth-id', 'target-user-1', false)
    expect(res.success).toBe(true)
    expect(prisma.pos_user_pins.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: 'tenant-1', tenant_user_id: 'target-user-1' },
        data: expect.objectContaining({
          is_active: false,
        }),
      })
    )
  })

  it('resets failed attempts', async () => {
    const res = await resetUserPinAttempts('admin-auth-id', 'target-user-1')
    expect(res.success).toBe(true)
    expect(prisma.pos_user_pins.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: 'tenant-1', tenant_user_id: 'target-user-1' },
        data: expect.objectContaining({
          failed_attempts: 0,
        }),
      })
    )
  })
})
