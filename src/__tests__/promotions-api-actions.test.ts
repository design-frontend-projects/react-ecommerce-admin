import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchPromotions,
  fetchPromotionById,
  fetchPromotionStats,
  fetchPromotionLookups,
  createPromotion,
  updatePromotion,
  changePromotionStatus,
  duplicatePromotion,
  deletePromotion,
  fetchCoupons,
  createCoupon,
  fetchDiscountApprovals,
  reviewDiscountApproval,
  fetchDiscountAnalytics,
} from '@/features/promotions/data/actions'
import * as authorizedRequestModule from '@/lib/authorized-request'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-jwt-token' } },
      }),
    },
  },
}))

describe('Promotions API Data Actions', () => {
  let authorizedRequestSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    authorizedRequestSpy = vi
      .spyOn(authorizedRequestModule, 'authorizedRequest')
      .mockImplementation(async (_getToken, url, init) => {
        return { success: true, data: { url, method: init?.method || 'GET' } }
      })
  })

  it('fetchPromotions builds query params correctly', async () => {
    await fetchPromotions({
      search: 'Summer',
      status: 'active',
      page: 1,
      pageSize: 10,
    })

    expect(authorizedRequestSpy).toHaveBeenCalledTimes(1)
    const callUrl = authorizedRequestSpy.mock.calls[0][1] as string
    expect(callUrl).toContain('/api/promotions?')
    expect(callUrl).toContain('search=Summer')
    expect(callUrl).toContain('status=active')
    expect(callUrl).toContain('page=1')
    expect(callUrl).toContain('pageSize=10')
  })

  it('fetchPromotionById queries the specific id', async () => {
    await fetchPromotionById('promo-xyz')
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions?id=promo-xyz'
    )
  })

  it('fetchPromotionStats and fetchPromotionLookups query the correct action param', async () => {
    await fetchPromotionStats()
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions?action=stats'
    )

    await fetchPromotionLookups()
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions?action=lookups'
    )
  })

  it('createPromotion sends POST request with json body', async () => {
    const payload: PromotionMutationInput = {
      name: 'Eid Mega Sale',
      promoType: 'percentage',
      startDate: '2026-09-19',
    }

    await createPromotion(payload)

    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    )
  })

  it('updatePromotion and changePromotionStatus send PATCH requests', async () => {
    await updatePromotion('promo-123', { name: 'Updated Name', promoType: 'fixed_amount', startDate: '2026-09-19' })
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions?id=promo-123',
      expect.objectContaining({
        method: 'PATCH',
      })
    )

    await changePromotionStatus('promo-123', 'paused')
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions?id=promo-123',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ action: 'status', status: 'paused' }),
      })
    )
  })

  it('duplicatePromotion and deletePromotion work as expected', async () => {
    await duplicatePromotion('promo-123')
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'duplicate', id: 'promo-123' }),
      })
    )

    await deletePromotion('promo-123')
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/promotions?id=promo-123',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })

  it('coupons actions call /api/coupons', async () => {
    await fetchCoupons({ search: 'SAVE10', status: 'active' })
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining('/api/coupons?search=SAVE10&status=active')
    )

    await createCoupon({ promotionId: 'promo-1', code: 'SAVE10' })
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/coupons',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('approvals and analytics actions call their respective /api/ endpoints', async () => {
    await fetchDiscountApprovals({ status: 'pending' })
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining('/api/discount-approvals?status=pending')
    )

    await reviewDiscountApproval('appr-1', true, 'Looks good')
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      '/api/discount-approvals',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'review', id: 'appr-1', approved: true, rejectionReason: 'Looks good' }),
      })
    )

    await fetchDiscountAnalytics({ branchId: 'br-1', storeId: 'st-1' })
    expect(authorizedRequestSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining('/api/discount-reports?branchId=br-1&storeId=st-1')
    )
  })
})
