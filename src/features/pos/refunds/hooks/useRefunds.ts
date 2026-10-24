import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useHasPermission } from '@/features/users/hooks/use-rbac'
import {
  lookupInvoiceForRefund,
  getRefundableItems,
  createRefundRequest,
  submitRefund,
  approveRefund,
  rejectRefund,
  executeRefund,
  cancelRefund,
  getRefundById,
  listRefunds,
  type ListRefundsFilters,
  type CreateRefundInput,
  type ApproveRefundInput,
  type RejectRefundInput,
  type ExecuteRefundInput,
  type CancelRefundInput,
} from '@/server/fns/refund-engine'

export const REFUND_QUERY_KEYS = {
  all: ['pos', 'refunds'] as const,
  lists: () => [...REFUND_QUERY_KEYS.all, 'list'] as const,
  list: (filters: ListRefundsFilters) => [...REFUND_QUERY_KEYS.lists(), filters] as const,
  details: () => [...REFUND_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...REFUND_QUERY_KEYS.details(), id] as const,
  invoices: () => ['pos', 'invoices', 'refundable'] as const,
  invoiceSearch: (params: Record<string, unknown>) => [...REFUND_QUERY_KEYS.invoices(), 'search', params] as const,
  refundableItems: (invoiceId: string) => [...REFUND_QUERY_KEYS.invoices(), invoiceId, 'items'] as const,
}

/**
 * Hook to check if the current user has permission for a specific refund action.
 * Used to completely HIDE action buttons for unauthorized users.
 */
export function useCanRefundAction(action: 'create' | 'submit' | 'approve' | 'reject' | 'execute' | 'cancel' | 'override' | 'view' | 'view_all'): boolean {
  const { has } = useAuth()
  const isSuper = useHasPermission('*')
  const hasSpecific = useHasPermission(`pos.refund.${action}`)
  const hasManage = useHasPermission('pos.refund.manage')
  const hasOverride = useHasPermission('pos.refund.override')
  const hasApprove = useHasPermission('pos.refund.approve')

  if (isSuper || hasOverride) return true
  if (hasSpecific) return true
  if (action === 'create' || action === 'submit' || action === 'view') {
    return hasManage || has({ permission: 'pos.sale.create' })
  }
  if (action === 'execute') {
    return hasApprove
  }

  return false
}

/**
 * Search invoices for POS refund
 */
export function useSearchInvoicesForRefund(params: {
  invoiceNo?: string
  customerId?: string
  storeId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  enabled?: boolean
}) {
  const { user } = useAuth()
  const enabled = (params.enabled ?? true) && !!user?.id

  return useQuery({
    queryKey: REFUND_QUERY_KEYS.invoiceSearch(params),
    queryFn: () => lookupInvoiceForRefund(user!.id, params),
    enabled,
    staleTime: 30_000,
  })
}

/**
 * Load refundable items for an invoice
 */
export function useRefundableItems(invoiceId?: string | null) {
  const { user } = useAuth()
  const enabled = !!user?.id && !!invoiceId

  return useQuery({
    queryKey: REFUND_QUERY_KEYS.refundableItems(invoiceId ?? ''),
    queryFn: () => getRefundableItems(user!.id, invoiceId!),
    enabled,
    staleTime: 10_000,
  })
}

/**
 * Load single refund details
 */
export function useRefundDetails(refundId?: string | null) {
  const { user } = useAuth()
  const enabled = !!user?.id && !!refundId

  return useQuery({
    queryKey: REFUND_QUERY_KEYS.detail(refundId ?? ''),
    queryFn: () => getRefundById(user!.id, refundId!),
    enabled,
    staleTime: 10_000,
  })
}

/**
 * List refunds with filtering
 */
export function useRefundsList(filters: ListRefundsFilters = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: REFUND_QUERY_KEYS.list(filters),
    queryFn: () => listRefunds(user!.id, filters),
    enabled: !!user?.id,
    staleTime: 15_000,
  })
}

/**
 * Mutation: Create refund request
 */
export function useCreateRefund() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: CreateRefundInput) => {
      if (!user?.id) throw new Error('User authentication required')
      return createRefundRequest(user.id, input)
    },
    onSuccess: (data) => {
      if (data.isDuplicate) {
        toast.info('Returned existing refund record.')
      } else {
        toast.success(`Refund ${data.refund.refund_number} created (${data.refund.status}).`)
      }
      queryClient.invalidateQueries({ queryKey: REFUND_QUERY_KEYS.all })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create refund request.')
    },
  })
}

/**
 * Mutation: Submit refund for approval
 */
export function useSubmitRefund() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (refundId: string) => {
      if (!user?.id) throw new Error('User authentication required')
      return submitRefund(user.id, refundId)
    },
    onSuccess: (refund) => {
      toast.success(`Refund ${refund.refund_number} submitted for approval.`)
      queryClient.invalidateQueries({ queryKey: REFUND_QUERY_KEYS.all })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit refund.')
    },
  })
}

/**
 * Mutation: Approve refund
 */
export function useApproveRefund() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: ApproveRefundInput) => {
      if (!user?.id) throw new Error('User authentication required')
      return approveRefund(user.id, input)
    },
    onSuccess: (refund) => {
      toast.success(`Refund ${refund.refund_number} approved!`)
      queryClient.invalidateQueries({ queryKey: REFUND_QUERY_KEYS.all })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve refund.')
    },
  })
}

/**
 * Mutation: Reject refund
 */
export function useRejectRefund() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: RejectRefundInput) => {
      if (!user?.id) throw new Error('User authentication required')
      return rejectRefund(user.id, input)
    },
    onSuccess: (refund) => {
      toast.info(`Refund ${refund.refund_number} rejected.`)
      queryClient.invalidateQueries({ queryKey: REFUND_QUERY_KEYS.all })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reject refund.')
    },
  })
}

/**
 * Mutation: Execute refund (disbursement & restock)
 */
export function useExecuteRefund() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: ExecuteRefundInput) => {
      if (!user?.id) throw new Error('User authentication required')
      return executeRefund(user.id, input)
    },
    onSuccess: (refund) => {
      toast.success(`Refund ${refund.refund_number} completed and restocked!`)
      queryClient.invalidateQueries({ queryKey: REFUND_QUERY_KEYS.all })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to execute refund.')
    },
  })
}

/**
 * Mutation: Cancel refund
 */
export function useCancelRefund() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: CancelRefundInput) => {
      if (!user?.id) throw new Error('User authentication required')
      return cancelRefund(user.id, input)
    },
    onSuccess: (refund) => {
      toast.info(`Refund ${refund.refund_number} cancelled.`)
      queryClient.invalidateQueries({ queryKey: REFUND_QUERY_KEYS.all })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel refund.')
    },
  })
}
