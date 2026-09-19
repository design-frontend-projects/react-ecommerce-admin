import { supabase } from '@/lib/supabase'
import { authorizedRequest } from '@/lib/authorized-request'
import type {
  GetPromotionsFilter,
  PromotionMutationInput,
} from '@/server/fns/promotions-crud'
import type {
  GetCouponsFilter,
  CouponMutationInput,
  BulkCouponGenerateInput,
} from '@/server/fns/coupons-crud'
import type {
  GetApprovalsFilter,
  CreateApprovalInput,
} from '@/server/fns/discount-approvals'
import type {
  PromotionStatus,
  CouponStatus,
  PromotionLookupData,
  InvPromotion,
  InvCoupon,
  InvDiscountApprovalRequest,
} from '@/features/promotions/types'

async function getToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch {
    return null
  }
}

// ─── PROMOTIONS ─────────────────────────────────────────────────────────────

export interface PromotionsListResult {
  promotions: InvPromotion[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export async function fetchPromotions(
  filter: GetPromotionsFilter = {}
): Promise<PromotionsListResult> {
  const params = new URLSearchParams()
  if (filter.search) params.set('search', filter.search)
  if (filter.status) params.set('status', filter.status)
  if (filter.promoType) params.set('promoType', filter.promoType)
  if (filter.channelId) params.set('channelId', filter.channelId)
  if (filter.branchId) params.set('branchId', filter.branchId)
  if (filter.page) params.set('page', String(filter.page))
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize))
  if (filter.startDate) params.set('startDate', filter.startDate)
  if (filter.endDate) params.set('endDate', filter.endDate)

  const url = `/api/promotions${params.toString() ? `?${params.toString()}` : ''}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: PromotionsListResult
  }
  return res.data
}

export async function fetchPromotionById(id: string): Promise<InvPromotion> {
  const url = `/api/promotions?id=${encodeURIComponent(id)}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: InvPromotion
  }
  return res.data
}

export async function fetchPromotionStats(): Promise<Record<string, unknown>> {
  const url = `/api/promotions?action=stats`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: Record<string, unknown>
  }
  return res.data
}

export async function fetchPromotionLookups(): Promise<PromotionLookupData> {
  const url = `/api/promotions?action=lookups`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: PromotionLookupData
  }
  return res.data
}

export async function createPromotion(
  input: PromotionMutationInput
): Promise<InvPromotion> {
  const res = (await authorizedRequest(getToken, '/api/promotions', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as { success: boolean; data: InvPromotion }
  return res.data
}

export async function updatePromotion(
  id: string,
  input: PromotionMutationInput
): Promise<InvPromotion> {
  const res = (await authorizedRequest(
    getToken,
    `/api/promotions?id=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ input }),
    }
  )) as { success: boolean; data: InvPromotion }
  return res.data
}

export async function changePromotionStatus(
  id: string,
  status: PromotionStatus
): Promise<InvPromotion> {
  const res = (await authorizedRequest(
    getToken,
    `/api/promotions?id=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ action: 'status', status }),
    }
  )) as { success: boolean; data: InvPromotion }
  return res.data
}

export async function duplicatePromotion(id: string): Promise<InvPromotion> {
  const res = (await authorizedRequest(getToken, '/api/promotions', {
    method: 'POST',
    body: JSON.stringify({ action: 'duplicate', id }),
  })) as { success: boolean; data: InvPromotion }
  return res.data
}

export async function deletePromotion(id: string): Promise<{ id: string }> {
  const res = (await authorizedRequest(
    getToken,
    `/api/promotions?id=${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  )) as { success: boolean; data: { id: string } }
  return res.data
}

// ─── COUPONS ────────────────────────────────────────────────────────────────

export interface CouponsListResult {
  coupons: InvCoupon[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export async function fetchCoupons(
  filter: GetCouponsFilter = {}
): Promise<CouponsListResult> {
  const params = new URLSearchParams()
  if (filter.search) params.set('search', filter.search)
  if (filter.status) params.set('status', filter.status)
  if (filter.promotionId) params.set('promotionId', filter.promotionId)
  if (filter.page) params.set('page', String(filter.page))
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize))

  const url = `/api/coupons${params.toString() ? `?${params.toString()}` : ''}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: CouponsListResult
  }
  return res.data
}

export async function createCoupon(
  input: CouponMutationInput
): Promise<InvCoupon> {
  const res = (await authorizedRequest(getToken, '/api/coupons', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as { success: boolean; data: InvCoupon }
  return res.data
}

export async function updateCoupon(
  id: string,
  input: Partial<CouponMutationInput>
): Promise<InvCoupon> {
  const res = (await authorizedRequest(
    getToken,
    `/api/coupons?id=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ input }),
    }
  )) as { success: boolean; data: InvCoupon }
  return res.data
}

export async function changeCouponStatus(
  id: string,
  status: CouponStatus
): Promise<InvCoupon> {
  const res = (await authorizedRequest(
    getToken,
    `/api/coupons?id=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ action: 'status', status }),
    }
  )) as { success: boolean; data: InvCoupon }
  return res.data
}

export async function deleteCoupon(id: string): Promise<{ id: string }> {
  const res = (await authorizedRequest(
    getToken,
    `/api/coupons?id=${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  )) as { success: boolean; data: { id: string } }
  return res.data
}

export async function generateBulkCoupons(
  input: BulkCouponGenerateInput
): Promise<InvCoupon[]> {
  const res = (await authorizedRequest(getToken, '/api/coupons', {
    method: 'POST',
    body: JSON.stringify({ action: 'bulk', payload: input }),
  })) as { success: boolean; data: InvCoupon[] }
  return res.data
}

// ─── DISCOUNT APPROVALS ─────────────────────────────────────────────────────

export interface ApprovalsListResult {
  requests: InvDiscountApprovalRequest[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export async function fetchDiscountApprovals(
  filter: GetApprovalsFilter = {}
): Promise<ApprovalsListResult> {
  const params = new URLSearchParams()
  if (filter.status) params.set('status', filter.status)
  if (filter.storeId) params.set('storeId', filter.storeId)
  if (filter.branchId) params.set('branchId', filter.branchId)
  if (filter.page) params.set('page', String(filter.page))
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize))

  const url = `/api/discount-approvals${params.toString() ? `?${params.toString()}` : ''}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: ApprovalsListResult
  }
  return res.data
}

export async function createDiscountApproval(
  input: CreateApprovalInput
): Promise<InvDiscountApprovalRequest> {
  const res = (await authorizedRequest(getToken, '/api/discount-approvals', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as { success: boolean; data: InvDiscountApprovalRequest }
  return res.data
}

export async function reviewDiscountApproval(
  id: string,
  approved: boolean,
  rejectionReason?: string
): Promise<InvDiscountApprovalRequest> {
  const res = (await authorizedRequest(getToken, '/api/discount-approvals', {
    method: 'POST',
    body: JSON.stringify({ action: 'review', id, approved, rejectionReason }),
  })) as { success: boolean; data: InvDiscountApprovalRequest }
  return res.data
}

// ─── DISCOUNT REPORTS ───────────────────────────────────────────────────────

export async function fetchDiscountAnalytics(
  options: {
    startDate?: string
    endDate?: string
    branchId?: string
    storeId?: string
  } = {}
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams()
  if (options.startDate) params.set('startDate', options.startDate)
  if (options.endDate) params.set('endDate', options.endDate)
  if (options.branchId) params.set('branchId', options.branchId)
  if (options.storeId) params.set('storeId', options.storeId)

  const url = `/api/discount-reports${params.toString() ? `?${params.toString()}` : ''}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: Record<string, unknown>
  }
  return res.data
}
