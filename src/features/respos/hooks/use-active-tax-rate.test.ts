import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { fetchActiveTaxRate } from './use-active-tax-rate'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

function chain(result: unknown) {
  const obj: Record<string, unknown> = {}
  const self = () => obj
  obj.select = vi.fn(self)
  obj.eq = vi.fn(self)
  obj.lte = vi.fn(self)
  obj.or = vi.fn(self)
  obj.order = vi.fn(self)
  obj.limit = vi.fn(self)
  obj.maybeSingle = vi.fn().mockResolvedValue(result)
  return obj
}

describe('fetchActiveTaxRate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the active rate with coerced numeric rate and inclusive flag', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      chain({
        data: {
          tax_rate_id: 3,
          rate: '0.14', // PostgREST may return Real as string
          is_inclusive: true,
          effective_from: '2026-01-01',
        },
        error: null,
      }) as never
    )

    const result = await fetchActiveTaxRate()
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('tax_rates')
    expect(result).toEqual({ tax_rate_id: 3, rate: 0.14, is_inclusive: true })
  })

  it('returns null when no active rate is configured (caller falls back)', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      chain({ data: null, error: null }) as never
    )
    expect(await fetchActiveTaxRate()).toBeNull()
  })

  it('throws on query errors so TanStack Query can retry and fall back', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      chain({ data: null, error: new Error('boom') }) as never
    )
    await expect(fetchActiveTaxRate()).rejects.toThrow('boom')
  })

  it('defaults is_inclusive to false when null', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      chain({
        data: {
          tax_rate_id: 1,
          rate: 0.1,
          is_inclusive: null,
          effective_from: '2026-01-01',
        },
        error: null,
      }) as never
    )
    const result = await fetchActiveTaxRate()
    expect(result?.is_inclusive).toBe(false)
  })
})
