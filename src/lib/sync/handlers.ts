import type { CheckoutRequestType } from '@/features/pos/schemas/checkout'
import type { CreateResOrderPayload } from '@/features/respos/api/api'

/**
 * Named handlers for durable outbox entries.
 *
 * Every offline write is tagged with a `type` that maps to exactly one handler
 * here. This is the core fix for the legacy data-loss bug: previously offline
 * restaurant orders were written with `type: 'CREATE'` but the sync loop only
 * dispatched `SYNC_POS_TRANSACTION` / `CREATE_RES_ORDER`, so they were marked
 * completed without ever being pushed. Now an unknown type has NO handler and
 * `getOutboxHandler` throws — a hard, visible failure instead of a silent one.
 *
 * The SAME handler runs whether the write happens online (immediately) or is
 * replayed from the outbox on reconnect, so there is a single source of truth
 * per write kind.
 */
export type OutboxType = 'posTransaction' | 'resOrder'

export type OutboxHandler = (payload: unknown) => Promise<void>

const handlers: Record<OutboxType, OutboxHandler> = {
  async posTransaction(payload) {
    // Dynamic import breaks any module load-order cycle (feature code imports
    // the outbox to enqueue; the outbox imports handlers).
    const { createPosTransaction } = await import('@/features/pos/data/api')
    const result = await createPosTransaction(payload as CheckoutRequestType)
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'POS transaction failed during sync'
      )
    }
  },
  async resOrder(payload) {
    const { createResOrder } = await import('@/features/respos/api/api')
    await createResOrder(payload as CreateResOrderPayload)
  },
}

export function isOutboxType(type: string): type is OutboxType {
  return Object.prototype.hasOwnProperty.call(handlers, type)
}

/**
 * Resolve the handler for an outbox entry type.
 * @throws if the type has no registered handler (never silently succeed).
 */
export function getOutboxHandler(type: string): OutboxHandler {
  if (!isOutboxType(type)) {
    throw new Error(`No outbox handler registered for type "${type}"`)
  }
  return handlers[type]
}
