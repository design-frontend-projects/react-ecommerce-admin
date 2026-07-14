import { toast } from 'sonner'
import { cleanupAllCatalog, refetchAllCatalog } from '@/lib/db/collections/client'
import { db } from '@/lib/db/indexed-db'
import { clearPersistedQueryCache } from '@/lib/db/persister'
import { queryClient } from '@/lib/query-client'
import {
  clearOutbox,
  drainOutbox,
  outboxHasPermanentFailures,
  outboxPendingCount,
  resetOutboxBackoff,
} from './outbox'

/**
 * The reconnect sequence: drain the outbox, and only if it drains cleanly, wipe
 * ALL local data and re-pull server state.
 *
 * The wipe is destructive by design (per product decision: "sync then clear
 * local data"). The mandatory safety valve is the GATE in step 2 — if any write
 * is still pending or has permanently failed, we DO NOT wipe, so unsynced orders
 * are never destroyed. This is exactly what the legacy flow lacked.
 *
 * Caveat: immediately after a wipe the local cache is empty; a subsequent
 * offline session with no online warm-up would show empty catalogs. Step 4
 * re-pulls right away so the cache re-warms while still online.
 */

export interface ReconnectResult {
  drained: number
  synced: number
  failed: number
  wiped: boolean
  remaining: number
}

let running: Promise<ReconnectResult> | null = null

export function runSyncThenWipe(): Promise<ReconnectResult> {
  if (running) return running
  running = runSyncThenWipeOnce().finally(() => {
    running = null
  })
  return running
}

async function runSyncThenWipeOnce(): Promise<ReconnectResult> {
  // Guard: nothing to do while offline.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { drained: 0, synced: 0, failed: 0, wiped: false, remaining: 0 }
  }

  const initialPending = await outboxPendingCount()

  // 1. Drain — make everything eligible, then replay.
  await resetOutboxBackoff()
  const result = await drainOutbox()

  if (result.processed > 0) {
    toast.info(`Đang đồng bộ ${result.processed} đơn hàng...`)
  }

  // 2. Gate — refuse the wipe if anything is still queued or permanently failed.
  const remaining = await outboxPendingCount()
  const hasPermanentFailures = await outboxHasPermanentFailures()

  if (remaining > 0 || hasPermanentFailures) {
    if (result.succeeded > 0) {
      toast.success(`Đã đồng bộ ${result.succeeded} đơn hàng`)
    }
    if (result.failed > 0) {
      toast.error(
        `${result.failed} đơn hàng chưa đồng bộ được. Dữ liệu cục bộ được giữ lại và sẽ thử lại.`
      )
    }
    return {
      drained: result.processed,
      synced: result.succeeded,
      failed: result.failed,
      wiped: false,
      remaining,
    }
  }

  // 3. Wipe ALL local data — outbox, cached catalog (Dexie), persisted query
  // cache, and TanStack DB collection rows.
  await clearOutbox()
  await cleanupAllCatalog()
  await clearPersistedQueryCache()
  await Promise.allSettled([
    db.categories.clear(),
    db.products.clear(),
    db.stores.clear(),
  ])

  // 4. Refresh server state so it is authoritative again (and re-warm the cache
  // for the next offline session).
  await refetchAllCatalog()
  await queryClient.invalidateQueries()

  if (initialPending > 0) {
    toast.success('Đã đồng bộ và làm mới dữ liệu')
  }

  return {
    drained: result.processed,
    synced: result.succeeded,
    failed: result.failed,
    wiped: true,
    remaining: 0,
  }
}
