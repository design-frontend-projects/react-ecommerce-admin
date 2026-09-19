import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  fetchDiscountApprovals,
  createDiscountApproval,
  reviewDiscountApproval,
} from '../data/actions'
import type {
  GetApprovalsFilter,
  CreateApprovalInput,
} from '@/server/fns/discount-approvals'

export function useDiscountApprovalRequests(filter: GetApprovalsFilter = {}) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_discount_approvals', filter, userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return fetchDiscountApprovals(filter)
    },
    enabled: !!userId,
  })
}

export function useCreateDiscountApproval() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async (input: CreateApprovalInput) => {
      if (!userId) throw new Error('User not authenticated')
      return createDiscountApproval(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_discount_approvals'] })
    },
  })
}

export function useReviewDiscountApproval() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async ({
      requestId,
      approved,
      rejectionReason,
    }: {
      requestId: string
      approved: boolean
      rejectionReason?: string
    }) => {
      if (!userId) throw new Error('User not authenticated')
      return reviewDiscountApproval(requestId, approved, rejectionReason)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_discount_approvals'] })
    },
  })
}
