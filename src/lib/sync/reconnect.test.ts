import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/lib/db/indexed-db'

const mocks = vi.hoisted(() => ({
  handler: vi.fn(),
  clearPersistedQueryCache: vi.fn().mockResolvedValue(undefined),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  refetchAllCatalog: vi.fn().mockResolvedValue(undefined),
  cleanupAllCatalog: vi.fn().mockResolvedValue(undefined),
}))

const {
  handler,
  clearPersistedQueryCache,
  invalidateQueries,
  refetchAllCatalog,
} = mocks

vi.mock('./handlers', () => ({
  getOutboxHandler: () => mocks.handler,
  isOutboxType: () => true,
}))
vi.mock('@/lib/db/persister', () => ({
  clearPersistedQueryCache: mocks.clearPersistedQueryCache,
}))
vi.mock('@/lib/query-client', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}))
vi.mock('@/lib/db/collections/client', () => ({
  refetchAllCatalog: mocks.refetchAllCatalog,
  cleanupAllCatalog: mocks.cleanupAllCatalog,
}))
vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

import { enqueue } from './outbox'
import { runSyncThenWipe } from './reconnect'

async function seedCatalog() {
  await db.products.put({
    id: 'p1',
    name: 'Test',
    slug: 'test',
    price: 1,
    track_inventory: true,
    category_id: 'c1',
    store_id: 's1',
    is_active: 1,
    created_at: 'now',
    updated_at: 'now',
  })
}

describe('runSyncThenWipe', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await db.close()
  })

  it('drains cleanly then wipes local data and refreshes server state', async () => {
    handler.mockResolvedValue(undefined)
    await enqueue({ type: 'resOrder', idempotencyKey: 'k1', payload: {} })
    await seedCatalog()

    const result = await runSyncThenWipe()

    expect(result.wiped).toBe(true)
    expect(result.synced).toBe(1)
    expect(result.remaining).toBe(0)
    expect(await db.products.count()).toBe(0) // catalog wiped
    expect(await db.outbox.count()).toBe(0) // outbox cleared
    expect(clearPersistedQueryCache).toHaveBeenCalled()
    expect(refetchAllCatalog).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('does NOT wipe when a write fails to sync (safety valve)', async () => {
    handler.mockRejectedValue(new Error('server 500'))
    await enqueue({ type: 'resOrder', idempotencyKey: 'k1', payload: {} })
    await seedCatalog()

    const result = await runSyncThenWipe()

    expect(result.wiped).toBe(false)
    expect(result.remaining).toBe(1)
    expect(await db.products.count()).toBe(1) // catalog preserved
    expect(await db.outbox.count()).toBe(1) // order preserved for retry
    expect(clearPersistedQueryCache).not.toHaveBeenCalled()
  })
})
