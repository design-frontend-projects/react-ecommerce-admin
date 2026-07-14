import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/lib/db/indexed-db'

const handler = vi.fn()
vi.mock('./handlers', () => ({
  getOutboxHandler: () => handler,
  isOutboxType: () => true,
}))

import {
  enqueue,
  drainOutbox,
  outboxPendingCount,
  outboxHasPermanentFailures,
  resetOutboxBackoff,
  computeBackoffMs,
  MAX_RETRIES,
} from './outbox'

describe('durable outbox', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    handler.mockReset()
  })

  afterEach(async () => {
    await db.close()
  })

  it('enqueues a pending entry and is idempotent by key', async () => {
    await enqueue({ type: 'resOrder', idempotencyKey: 'k1', payload: { a: 1 } })
    await enqueue({ type: 'resOrder', idempotencyKey: 'k1', payload: { a: 2 } })

    const rows = await db.outbox.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    // First write wins — the duplicate is ignored, not overwritten.
    expect((rows[0].payload as { a: number }).a).toBe(1)
  })

  it('drains successfully and removes the entry', async () => {
    handler.mockResolvedValue(undefined)
    await enqueue({ type: 'resOrder', idempotencyKey: 'k1', payload: {} })

    const result = await drainOutbox()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(result.succeeded).toBe(1)
    expect(await outboxPendingCount()).toBe(0)
  })

  it('marks failed with backoff on handler error and does not lose the entry', async () => {
    handler.mockRejectedValue(new Error('network down'))
    await enqueue({ type: 'posTransaction', idempotencyKey: 'k1', payload: {} })

    const result = await drainOutbox()

    expect(result.failed).toBe(1)
    const row = await db.outbox.get('k1')
    expect(row?.status).toBe('failed')
    expect(row?.retryCount).toBe(1)
    expect(row?.lastError).toContain('network down')
    expect(row?.nextAttemptAt).toBeGreaterThan(Date.now())
    expect(await outboxPendingCount()).toBe(1)
  })

  it('respects backoff: a just-failed entry is not retried until reset', async () => {
    handler.mockRejectedValue(new Error('down'))
    await enqueue({ type: 'resOrder', idempotencyKey: 'k1', payload: {} })
    await drainOutbox() // fails once, schedules future retry

    handler.mockClear()
    const second = await drainOutbox()
    expect(handler).not.toHaveBeenCalled() // still backing off
    expect(second.processed).toBe(0)

    await resetOutboxBackoff()
    handler.mockResolvedValue(undefined)
    const third = await drainOutbox()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(third.succeeded).toBe(1)
  })

  it('flags permanent failures once retries are exhausted', async () => {
    await enqueue({ type: 'resOrder', idempotencyKey: 'k1', payload: {} })
    await db.outbox.update('k1', {
      status: 'failed',
      retryCount: MAX_RETRIES,
      nextAttemptAt: 0,
    })

    expect(await outboxHasPermanentFailures()).toBe(true)

    // Exhausted entries are not eligible for further drains.
    handler.mockResolvedValue(undefined)
    const result = await drainOutbox()
    expect(result.processed).toBe(0)
    expect(handler).not.toHaveBeenCalled()
  })

  it('computes exponential backoff capped at 24h', () => {
    expect(computeBackoffMs(0)).toBe(0)
    expect(computeBackoffMs(1)).toBe(60_000) // 1 min
    expect(computeBackoffMs(2)).toBe(120_000) // 2 min
    expect(computeBackoffMs(3)).toBe(240_000) // 4 min
    expect(computeBackoffMs(50)).toBe(24 * 60 * 60 * 1000) // capped
  })
})
