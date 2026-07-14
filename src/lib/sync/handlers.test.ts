import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOutboxHandler, isOutboxType } from './handlers'

const createPosTransaction = vi.fn()
const createResOrder = vi.fn()

vi.mock('@/features/pos/data/api', () => ({ createPosTransaction }))
vi.mock('@/features/respos/api/api', () => ({ createResOrder }))

describe('outbox handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resOrder handler actually pushes via createResOrder (regression for the silent-drop bug)', async () => {
    createResOrder.mockResolvedValue({ id: 'o1' })
    await getOutboxHandler('resOrder')({ items: [] })
    expect(createResOrder).toHaveBeenCalledTimes(1)
  })

  it('posTransaction handler throws when the server result is unsuccessful', async () => {
    createPosTransaction.mockResolvedValue({
      success: false,
      error: { message: 'boom' },
    })
    await expect(getOutboxHandler('posTransaction')({})).rejects.toThrow('boom')
  })

  it('posTransaction handler resolves on success', async () => {
    createPosTransaction.mockResolvedValue({ success: true, invoiceId: 'i1' })
    await expect(
      getOutboxHandler('posTransaction')({})
    ).resolves.toBeUndefined()
  })

  it('an unregistered type has NO handler and throws (never silently completes)', () => {
    // 'CREATE' was the legacy type that got silently marked complete.
    expect(isOutboxType('CREATE')).toBe(false)
    expect(() => getOutboxHandler('CREATE')).toThrow(/No outbox handler/)
  })
})
