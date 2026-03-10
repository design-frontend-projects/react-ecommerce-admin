import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validatePromoCode } from './promotion-validator'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
          single: vi.fn(),
        })),
        eq_mock: vi.fn(), // Helper for multiple eq calls
      })),
    })),
  },
}))

describe('validatePromoCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return invalid for empty code', async () => {
    const result = await validatePromoCode('', 100)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Enter a promo code')
  })

  it('should return invalid for non-existent code', async () => {
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    } as any)

    const result = await validatePromoCode('INVALID', 100)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid promo code')
  })

  it('should return invalid for expired code', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          promotion_id: 1,
          code: 'EXPIRED',
          discount_type: 'percent',
          discount_value: 10,
          end_date: yesterday.toISOString(),
          is_active: true,
        },
        error: null,
      }),
    } as any)

    const result = await validatePromoCode('EXPIRED', 100)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Promo code has expired')
  })

  it('should return invalid for usage limit reached', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const mockFrom = vi.mocked(supabase.from)
    
    // First call for promotions table
    // Second call for promotion_usage table
    mockFrom.mockImplementation((table: string) => {
      if (table === 'promotions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              promotion_id: 1,
              code: 'LIMIT',
              discount_type: 'percent',
              discount_value: 10,
              end_date: tomorrow.toISOString(),
              usage_limit: 5,
              is_active: true,
            },
            error: null,
          }),
        } as any
      }
      if (table === 'promotion_usage') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 5 }),
        } as any
      }
      return {} as any
    })

    const result = await validatePromoCode('LIMIT', 100)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Promo code usage limit reached')
  })

  it('should return invalid if minimum purchase not met', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          promotion_id: 1,
          code: 'MINIMUM',
          discount_type: 'fixed',
          discount_value: 10,
          minimum_purchase: 150,
          end_date: tomorrow.toISOString(),
          is_active: true,
        },
        error: null,
      }),
    } as any)

    const result = await validatePromoCode('MINIMUM', 100)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Minimum order amount is $150.00')
  })

  it('should return valid and calculate percentage discount', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          promotion_id: 1,
          code: 'PERCENT10',
          discount_type: 'percent',
          discount_value: 10,
          end_date: tomorrow.toISOString(),
          is_active: true,
        },
        error: null,
      }),
    } as any)

    const result = await validatePromoCode('PERCENT10', 200)
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(20)
  })

  it('should return valid and calculate fixed amount discount', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          promotion_id: 1,
          code: 'FIXED50',
          discount_type: 'fixed',
          discount_value: 50,
          end_date: tomorrow.toISOString(),
          is_active: true,
        },
        error: null,
      }),
    } as any)

    const result = await validatePromoCode('FIXED50', 200)
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(50)
  })
})
