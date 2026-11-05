import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logPosScreenEvent } from '@/server/fns/pos-screen-logger'

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      pos_screen_logs: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'log-uuid', ...data })),
      },
    },
  }
})

import prisma from '@/lib/prisma'

describe('POS Screen Logger - logPosScreenEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records an event in pos_screen_logs with tenant and action metadata', async () => {
    const result = await logPosScreenEvent({
      tenantId: 'tenant-123',
      terminalId: 'term-456',
      sessionId: 'sess-789',
      userId: 'user-001',
      action: 'SALE_CHECKOUT',
      level: 'info',
      message: 'Completed sale #INV-1002',
      details: { totalAmount: 49.99, itemCount: 3 },
      ipAddress: '192.168.1.50',
      userAgent: 'POS-Terminal-Electron/1.0',
    })

    expect(result).toBeDefined()
    expect(result?.id).toBe('log-uuid')
    expect(prisma.pos_screen_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: 'tenant-123',
        terminal_id: 'term-456',
        session_id: 'sess-789',
        user_id: 'user-001',
        action: 'SALE_CHECKOUT',
        level: 'info',
        message: 'Completed sale #INV-1002',
        details: { totalAmount: 49.99, itemCount: 3 },
        ip_address: '192.168.1.50',
        user_agent: 'POS-Terminal-Electron/1.0',
      }),
    })
  })

  it('sanitizes sensitive credentials (pin, password, pin_hash) from details payload', async () => {
    await logPosScreenEvent({
      tenantId: 'tenant-123',
      action: 'PIN_ASSIGNED',
      message: 'User PIN assigned',
      details: {
        userId: 'user-001',
        pin: '1234',
        password: 'SecretPassword123',
        pin_hash: '$2b$10$hashed',
        safeProperty: 'KeepMe',
      },
    })

    expect(prisma.pos_screen_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: {
          userId: 'user-001',
          safeProperty: 'KeepMe',
        },
      }),
    })
  })

  it('truncates messages exceeding 500 characters', async () => {
    const longMessage = 'A'.repeat(600)
    await logPosScreenEvent({
      tenantId: 'tenant-123',
      action: 'CART_CLEAR',
      message: longMessage,
    })

    expect(prisma.pos_screen_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        message: 'A'.repeat(500),
      }),
    })
  })

  it('safely handles missing tenantId without throwing exceptions', async () => {
    const result = await logPosScreenEvent({
      tenantId: '',
      action: 'CART_CLEAR',
      message: 'Test message',
    })

    expect(result).toBeNull()
    expect(prisma.pos_screen_logs.create).not.toHaveBeenCalled()
  })

  it('is fail-safe: does not throw when database creation fails', async () => {
    vi.mocked(prisma.pos_screen_logs.create).mockRejectedValueOnce(new Error('DB Connection Timeout'))

    const result = await logPosScreenEvent({
      tenantId: 'tenant-123',
      action: 'DRAWER_OPEN',
      message: 'Cash drawer opened',
    })

    expect(result).toBeNull()
  })
})
