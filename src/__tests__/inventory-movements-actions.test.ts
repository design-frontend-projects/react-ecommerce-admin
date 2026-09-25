import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchMovements } from '@/features/inventory-movements/data/actions'
import * as authorizedRequestModule from '@/lib/authorized-request'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          })),
        })),
      })),
    })),
  },
}))

describe('fetchMovements API action', () => {
  const mockTokenGetter = vi.fn().mockResolvedValue('test-token')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('correctly handles paginated envelope payload without type errors', async () => {
    const mockEnvelope = {
      success: true,
      data: {
        movements: [
          {
            id: 'mov-1',
            movement_type: 'adjustment_in',
            quantity_delta: 25,
            movement_date: '2026-09-25T12:00:00.000Z',
            product_variant_id: 'var-1',
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        summary: {
          totalMovements: 1,
          totalIn: 25,
          totalOut: 0,
          netDelta: 25,
        },
      },
    }

    vi.spyOn(authorizedRequestModule, 'authorizedRequest').mockResolvedValue(mockEnvelope)

    const result = await fetchMovements(mockTokenGetter, { page: 1, pageSize: 20 })

    expect(result.movements).toHaveLength(1)
    expect(result.movements[0].id).toBe('mov-1')
    expect(result.movements[0].qty_in).toBe(25)
    expect(result.totalCount).toBe(1)
    expect(result.summary.netDelta).toBe(25)
    // Array compatibility helper check
    expect(result.length).toBe(1)
    expect(Array.from(result)).toHaveLength(1)
  })

  it('correctly handles flat envelope array payload', async () => {
    const mockFlatEnvelope = {
      success: true,
      data: [
        {
          id: 'mov-2',
          movement_type: 'sale',
          quantity_delta: -10,
          movement_date: '2026-09-25T12:00:00.000Z',
          product_variant_id: 'var-2',
        },
      ],
    }

    vi.spyOn(authorizedRequestModule, 'authorizedRequest').mockResolvedValue(mockFlatEnvelope)

    const result = await fetchMovements(mockTokenGetter, {})

    expect(result.movements).toHaveLength(1)
    expect(result.movements[0].id).toBe('mov-2')
    expect(result.movements[0].qty_out).toBe(10)
    expect(result.totalCount).toBe(1)
    expect(result.summary.totalOut).toBe(10)
    expect(result.summary.netDelta).toBe(-10)
  })
})
