import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  changeCouponStatus,
  deleteCoupon,
  generateBulkCoupons,
} from '../data/actions'
import type {
  GetCouponsFilter,
  CouponMutationInput,
  BulkCouponGenerateInput,
} from '@/server/fns/coupons-crud'
import type { CouponStatus } from '@/features/promotions/types'

export function useInvCoupons(filter: GetCouponsFilter = {}) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_coupons', filter, userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return fetchCoupons(filter)
    },
    enabled: !!userId,
  })
}

export function useCreateCoupon() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async (input: CouponMutationInput) => {
      if (!userId) throw new Error('User not authenticated')
      return createCoupon(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_coupons'] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
    },
  })
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CouponMutationInput> }) => {
      if (!userId) throw new Error('User not authenticated')
      return updateCoupon(id, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_coupons'] })
    },
  })
}

export function useChangeCouponStatus() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CouponStatus }) => {
      if (!userId) throw new Error('User not authenticated')
      return changeCouponStatus(id, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_coupons'] })
    },
  })
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated')
      return deleteCoupon(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_coupons'] })
    },
  })
}

export function useGenerateBulkCoupons() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async (input: BulkCouponGenerateInput) => {
      if (!userId) throw new Error('User not authenticated')
      return generateBulkCoupons(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_coupons'] })
    },
  })
}
