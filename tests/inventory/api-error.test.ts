import { describe, it, expect } from 'vitest'
import { ApiError, rpcError, handleRouteError } from '@/server/utils/api-error'

async function statusOf(response: Response): Promise<{
  status: number
  body: { success: boolean; message?: string; error?: { message?: string } }
}> {
  return { status: response.status, body: await response.json() }
}

describe('rpcError', () => {
  it('maps INSUFFICIENT_STOCK to 409', () => {
    const e = rpcError({ message: 'INSUFFICIENT_STOCK|abc' })
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(409)
  })

  it('maps TRANSFER_SAME_STORE to 422', () => {
    expect(rpcError({ message: 'TRANSFER_SAME_STORE|x' }).status).toBe(422)
  })

  it('maps *_NOT_FOUND to 404', () => {
    expect(rpcError({ message: 'ADJUSTMENT_NOT_FOUND|x' }).status).toBe(404)
    expect(rpcError({ message: 'TRANSFER_NOT_FOUND|x' }).status).toBe(404)
  })

  it('maps already-applied to 409', () => {
    expect(rpcError({ message: 'ADJUSTMENT_ALREADY_APPLIED|approved' }).status).toBe(409)
    expect(rpcError({ message: 'TRANSFER_ALREADY_APPLIED|received' }).status).toBe(409)
  })

  it('falls back to 400 for unknown codes', () => {
    expect(rpcError({ message: 'something odd' }).status).toBe(400)
  })
})

describe('handleRouteError', () => {
  it('uses the ApiError status', async () => {
    const { status, body } = await statusOf(
      handleRouteError(new ApiError('nope', 409), 'fallback')
    )
    expect(status).toBe(409)
    expect(body.success).toBe(false)
    expect(body.message).toBe('nope')
  })

  it('maps Unauthorized errors to 401', async () => {
    const { status } = await statusOf(
      handleRouteError(new Error('Unauthorized: Missing bearer token'), 'x')
    )
    expect(status).toBe(401)
  })

  it('maps Forbidden errors to 403', async () => {
    const { status } = await statusOf(
      handleRouteError(new Error('Forbidden: Insufficient permissions'), 'x')
    )
    expect(status).toBe(403)
  })

  it('defaults other errors to 400', async () => {
    const { status } = await statusOf(
      handleRouteError(new Error('boom'), 'fallback')
    )
    expect(status).toBe(400)
  })
})
