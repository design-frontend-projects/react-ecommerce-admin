import { db, type OutboxEntry } from '@/lib/db/indexed-db'
import { getOutboxHandler, type OutboxType } from './handlers'

/**
 * Durable, handler-based offline write queue.
 *
 * Writes that happen while offline are enqueued here (IndexedDB via Dexie) and
 * replayed by `drainOutbox()` on reconnect. Each entry names a handler
 * (`src/lib/sync/handlers.ts`); an entry whose type has no handler fails loudly
 * rather than being silently marked complete (the legacy data-loss bug).
 *
 * Design notes:
 *  - Idempotency: `idempotencyKey` is the primary key, so re-enqueueing the same
 *    logical order is a no-op and replays cannot create duplicates.
 *  - Backoff: exponential, 1min → 24h cap, given up after MAX_RETRIES.
 *  - Single-flight: a module-level promise guards against concurrent drains.
 */

export const MAX_RETRIES = 10
const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** Exponential backoff: 1, 2, 4, 8 … minutes, capped at 24h. */
export function computeBackoffMs(retryCount: number): number {
  if (retryCount <= 0) return 0
  return Math.min(Math.pow(2, retryCount - 1) * MINUTE_MS, DAY_MS)
}

export interface EnqueueInput {
  type: OutboxType
  payload: unknown
  /** Stable id for this logical write; dedupes retries/replays. */
  idempotencyKey: string
}

async function mirrorInsert(entry: OutboxEntry): Promise<void> {
  try {
    const { pendingOrdersCollection } = await import(
      '@/lib/db/collections/pending-orders'
    )
    if (!pendingOrdersCollection.has(entry.idempotencyKey)) {
      pendingOrdersCollection.insert({
        idempotencyKey: entry.idempotencyKey,
        type: entry.type,
        createdAt: entry.createdAt,
        status: entry.status,
      })
    }
  } catch {
    // Reactive mirror is best-effort; never block the durable money path.
  }
}

async function mirrorRemove(idempotencyKey: string): Promise<void> {
  try {
    const { pendingOrdersCollection } = await import(
      '@/lib/db/collections/pending-orders'
    )
    if (pendingOrdersCollection.has(idempotencyKey)) {
      pendingOrdersCollection.delete(idempotencyKey)
    }
  } catch {
    // best-effort
  }
}

/** Add a write to the durable outbox. Returns the stored entry. */
export async function enqueue(input: EnqueueInput): Promise<OutboxEntry> {
  const now = Date.now()
  const existing = await db.outbox.get(input.idempotencyKey)
  if (existing) return existing

  const entry: OutboxEntry = {
    idempotencyKey: input.idempotencyKey,
    type: input.type,
    payload: input.payload,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    nextAttemptAt: now,
  }
  await db.outbox.put(entry)
  await mirrorInsert(entry)
  return entry
}

/** All entries not yet successfully synced (pending or failed-but-retryable). */
export async function getPendingOutbox(): Promise<OutboxEntry[]> {
  return db.outbox
    .where('status')
    .anyOf('pending', 'failed', 'syncing')
    .toArray()
}

export async function outboxPendingCount(): Promise<number> {
  return db.outbox.where('status').anyOf('pending', 'failed', 'syncing').count()
}

/**
 * True if any entry has exhausted its retries (permanently failed). The
 * reconnect flow uses this to refuse the destructive local-data wipe.
 */
export async function outboxHasPermanentFailures(): Promise<boolean> {
  const failed = await db.outbox.where('status').equals('failed').toArray()
  return failed.some((e) => e.retryCount >= MAX_RETRIES)
}

/**
 * Make every not-yet-exhausted entry immediately eligible for the next drain.
 * Called on reconnect so we retry the whole queue at once rather than waiting
 * out each entry's backoff timer.
 */
export async function resetOutboxBackoff(): Promise<void> {
  const now = Date.now()
  const entries = await db.outbox
    .where('status')
    .anyOf('pending', 'failed', 'syncing')
    .toArray()
  await Promise.all(
    entries
      .filter((e) => e.retryCount < MAX_RETRIES)
      .map((e) => db.outbox.update(e.idempotencyKey, { nextAttemptAt: now }))
  )
}

export async function clearOutbox(): Promise<void> {
  await db.outbox.clear()
  try {
    const { pendingOrdersCollection } = await import(
      '@/lib/db/collections/pending-orders'
    )
    const keys = Array.from(pendingOrdersCollection.keys())
    for (const key of keys) {
      pendingOrdersCollection.delete(key)
    }
  } catch {
    // best-effort
  }
}

export interface DrainResult {
  processed: number
  succeeded: number
  failed: number
  /** Entries still pending after this drain (either not yet due, or failed). */
  remaining: number
}

let draining: Promise<DrainResult> | null = null

/**
 * Replay all currently-eligible outbox entries against the server.
 * Single-flight: concurrent callers share the in-progress drain.
 */
export function drainOutbox(): Promise<DrainResult> {
  if (draining) return draining
  draining = drainOnce().finally(() => {
    draining = null
  })
  return draining
}

async function drainOnce(): Promise<DrainResult> {
  const now = Date.now()
  const all = await getPendingOutbox()
  const eligible = all.filter(
    (e) => e.retryCount < MAX_RETRIES && e.nextAttemptAt <= now
  )

  let succeeded = 0
  let failed = 0

  for (const entry of eligible) {
    await db.outbox.update(entry.idempotencyKey, {
      status: 'syncing',
      lastAttemptAt: Date.now(),
    })
    try {
      const handler = getOutboxHandler(entry.type)
      await handler(entry.payload)
      await db.outbox.delete(entry.idempotencyKey)
      await mirrorRemove(entry.idempotencyKey)
      succeeded++
    } catch (error) {
      const retryCount = entry.retryCount + 1
      await db.outbox.update(entry.idempotencyKey, {
        status: 'failed',
        retryCount,
        nextAttemptAt: Date.now() + computeBackoffMs(retryCount),
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
      failed++
    }
  }

  const remaining = await outboxPendingCount()
  return { processed: eligible.length, succeeded, failed, remaining }
}

/**
 * Rehydrate the reactive pending-orders collection from the durable outbox.
 * Call once on startup so a reload shows queued orders immediately.
 */
export async function rehydratePendingOrders(): Promise<void> {
  const entries = await getPendingOutbox()
  await Promise.all(entries.map((e) => mirrorInsert(e)))
}
