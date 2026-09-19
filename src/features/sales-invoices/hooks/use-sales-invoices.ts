import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  fetchSalesInvoices,
  fetchInvoiceById,
  createSalesInvoiceAction,
  issueInvoiceAction,
  recordInvoicePaymentAction,
  cancelInvoiceAction,
  voidInvoiceAction,
  createCreditNoteAction,
  fetchInvoiceDashboardStats,
  fetchInvoiceReports,
} from '../data/actions'
import type { InvoiceFiltersState } from '../types'
import type {
  RecordPaymentFormData,
  CancelInvoiceFormData,
  VoidInvoiceFormData,
  CreditNoteFormData,
  CreateInvoiceFormData,
} from '../schemas'

export const INVOICE_QUERY_KEYS = {
  all: ['sales_invoices'] as const,
  lists: () => [...INVOICE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Partial<InvoiceFiltersState>) => [...INVOICE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...INVOICE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INVOICE_QUERY_KEYS.details(), id] as const,
  dashboard: (range?: { from?: string; to?: string }) => [...INVOICE_QUERY_KEYS.all, 'dashboard', range] as const,
  reports: (params: any) => [...INVOICE_QUERY_KEYS.all, 'reports', params] as const,
}

export function useSalesInvoices(filters: Partial<InvoiceFiltersState> = {}) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.list(filters),
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return fetchSalesInvoices(filters)
    },
    enabled: !!userId,
  })
}

export function useSalesInvoice(id: string) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.detail(id),
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return fetchInvoiceById(id)
    },
    enabled: !!userId && !!id,
  })
}

export function useInvoiceDashboard(dateRange?: { from?: string; to?: string }) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.dashboard(dateRange),
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return fetchInvoiceDashboardStats(dateRange)
    },
    enabled: !!userId,
  })
}

export function useInvoiceReports(params: {
  reportType: 'sales' | 'outstanding' | 'tax' | 'discount' | 'pos'
  dateFrom?: string
  dateTo?: string
  storeId?: string
  customerId?: string
}) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.reports(params),
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return fetchInvoiceReports(params)
    },
    enabled: !!userId,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateInvoiceFormData) => createSalesInvoiceAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useIssueInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => issueInvoiceAction(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, payment }: { invoiceId: string; payment: RecordPaymentFormData }) =>
      recordInvoicePaymentAction(invoiceId, payment),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(vars.invoiceId) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useCancelInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelInvoiceFormData }) =>
      cancelInvoiceAction(id, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(vars.id) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useVoidInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VoidInvoiceFormData }) =>
      voidInvoiceAction(id, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(vars.id) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ originalInvoiceId, payload }: { originalInvoiceId: string; payload: CreditNoteFormData }) =>
      createCreditNoteAction(originalInvoiceId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(vars.originalInvoiceId) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}
