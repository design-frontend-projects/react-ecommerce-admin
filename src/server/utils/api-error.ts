import { jsonError } from './http'

/** Error carrying an explicit HTTP status for the route-handler envelope. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RpcErrorLike {
  message?: string | null
}

const RPC_ERROR_MAP: Record<string, { message: string; status: number }> = {
  INSUFFICIENT_STOCK: {
    message: 'This would drive stock negative for one or more variants.',
    status: 409,
  },
  TRANSFER_ALREADY_APPLIED: {
    message: 'This transfer has already been applied.',
    status: 409,
  },
  ADJUSTMENT_ALREADY_APPLIED: {
    message: 'This adjustment has already been applied.',
    status: 409,
  },
  TRANSFER_SAME_STORE: {
    message: 'Source and destination store must differ.',
    status: 422,
  },
  TRANSFER_BRANCH_MISSING: {
    message: 'Source or destination store has no branch assigned.',
    status: 422,
  },
  ADJUSTMENT_BRANCH_MISSING: {
    message: 'The selected store has no branch assigned.',
    status: 422,
  },
  TRANSFER_NOT_FOUND: { message: 'Transfer not found.', status: 404 },
  ADJUSTMENT_NOT_FOUND: { message: 'Adjustment not found.', status: 404 },
}

/**
 * Translate a Postgres RPC error (raised as `CODE|detail`) into an ApiError with a
 * user-friendly message and appropriate HTTP status.
 */
export function rpcError(error: RpcErrorLike): ApiError {
  const raw = error.message ?? 'Failed to apply the inventory operation.'
  const code = raw.split('|')[0]?.trim()
  const mapped = code ? RPC_ERROR_MAP[code] : undefined
  if (mapped) {
    return new ApiError(mapped.message, mapped.status)
  }
  return new ApiError(raw, 400)
}

/** Standard route-handler error responder. */
export function handleRouteError(error: unknown, fallback: string): Response {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status)
  }
  const message = error instanceof Error ? error.message : fallback
  if (message.startsWith('Unauthorized')) {
    return jsonError(message, 401)
  }
  if (message.startsWith('Forbidden')) {
    return jsonError(message, 403)
  }
  return jsonError(message || fallback, 400)
}
