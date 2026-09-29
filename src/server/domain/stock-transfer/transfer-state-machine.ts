import { ApiError } from '@/server/utils/api-error'
import type { transfer_status_enum } from '@/generated/prisma/client'

export type TransferStatus = transfer_status_enum

/**
 * Valid state transition graph for Stock Transfers.
 * Enforces production-grade enterprise inventory workflow rules.
 */
export const VALID_TRANSITIONS: Record<TransferStatus, readonly TransferStatus[]> = {
  // Initial draft stage: can be submitted for approval or cancelled
  draft: ['pending_approval', 'approved', 'cancelled'],

  // Awaiting management approval: can be approved, rejected, or cancelled
  pending_approval: ['approved', 'rejected', 'cancelled'],

  // Approved: ready to be picked/prepared or directly shipped, or cancelled
  approved: ['ready_to_ship', 'picked', 'partially_shipped', 'shipped', 'cancelled'],

  // Picking in progress / ready for carrier dispatch
  ready_to_ship: ['partially_shipped', 'shipped', 'cancelled'],
  picked: ['ready_to_ship', 'partially_shipped', 'shipped', 'cancelled'], // legacy alias

  // In-transit states
  partially_shipped: ['partially_shipped', 'shipped', 'partially_received', 'received'],
  shipped: ['partially_received', 'received', 'in_transit'],
  in_transit: ['partially_received', 'received', 'closed', 'completed'], // legacy alias

  // Receiving states
  partially_received: ['partially_received', 'received', 'closed'],
  received: ['closed', 'completed'],

  // Terminal states: cannot transition out
  closed: [],
  completed: [], // legacy alias
  rejected: [],
  cancelled: [],
}

/**
 * Checks whether a transition between two statuses is allowed.
 */
export function canTransition(current: TransferStatus, target: TransferStatus): boolean {
  if (current === target) return true
  const allowed = VALID_TRANSITIONS[current]
  return Boolean(allowed && allowed.includes(target))
}

/**
 * Asserts that a state transition is valid or throws an ApiError (HTTP 409 Conflict).
 */
export function assertValidTransition(
  current: TransferStatus,
  target: TransferStatus,
  entityId?: string
): void {
  if (!canTransition(current, target)) {
    const idMsg = entityId ? ` for transfer '${entityId}'` : ''
    throw new ApiError(
      `Invalid transfer status transition${idMsg}: cannot transition from '${current}' to '${target}'. Allowed transitions: [${(VALID_TRANSITIONS[current] || []).join(', ')}]`,
      409
    )
  }
}

/**
 * Checks if status is terminal (no further modifications or transitions).
 */
export function isTerminalStatus(status: TransferStatus): boolean {
  return ['closed', 'completed', 'rejected', 'cancelled'].includes(status)
}

/**
 * Checks if transfer can be edited (items, references, notes).
 */
export function canEditDraft(status: TransferStatus): boolean {
  return status === 'draft'
}

/**
 * Checks if transfer can be cancelled.
 * Once goods have been physically dispatched (shipped or received), the transfer cannot be cancelled.
 */
export function canCancelTransfer(status: TransferStatus): boolean {
  return ['draft', 'pending_approval', 'approved', 'ready_to_ship', 'picked'].includes(status)
}

/**
 * Checks if transfer can accept shipment dispatches.
 */
export function canShipTransfer(status: TransferStatus): boolean {
  return ['approved', 'ready_to_ship', 'picked', 'partially_shipped'].includes(status)
}

/**
 * Checks if transfer can accept receipts.
 */
export function canReceiveTransfer(status: TransferStatus): boolean {
  return ['shipped', 'in_transit', 'partially_shipped', 'partially_received'].includes(status)
}

/**
 * Checks if transfer can be closed.
 */
export function canCloseTransfer(status: TransferStatus): boolean {
  return ['received', 'partially_received', 'in_transit'].includes(status)
}
