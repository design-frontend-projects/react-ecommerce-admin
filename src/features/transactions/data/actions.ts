import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import type {
  CreateFinancialTransactionFormValues,
  FinancialTransactionDetail,
  FinancialTransactionRow,
  FinancialTransactionStats,
  RefundFinancialTransactionFormValues,
} from './schema'

const BASE = '/api/financial-transactions'

export interface FetchFinancialTransactionsParams {
  type?: string
  status?: string
  currency?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export async function fetchFinancialTransactions(
  getToken: TokenGetter,
  params: FetchFinancialTransactionsParams = {}
): Promise<{
  items: FinancialTransactionRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const query = new URLSearchParams()
  if (params.type && params.type !== '__all__') query.set('type', params.type)
  if (params.status && params.status !== '__all__') query.set('status', params.status)
  if (params.currency && params.currency !== '__all__') query.set('currency', params.currency)
  if (params.search?.trim()) query.set('search', params.search.trim())
  if (params.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params.dateTo) query.set('dateTo', params.dateTo)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const url = query.toString() ? `${BASE}?${query.toString()}` : BASE
  const res = (await authorizedRequest(getToken, url)) as ApiResponse<{
    items: FinancialTransactionRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }>

  if (!res?.success) {
    throw new Error(res?.error || 'Failed to fetch financial transactions')
  }

  return res.data
}

export async function fetchFinancialTransaction(
  getToken: TokenGetter,
  id: string
): Promise<FinancialTransactionDetail> {
  const res = (await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )) as ApiResponse<FinancialTransactionDetail>

  if (!res?.success) {
    throw new Error(res?.error || 'Failed to fetch transaction details')
  }

  return res.data
}

export async function fetchFinancialTransactionStats(
  getToken: TokenGetter
): Promise<FinancialTransactionStats> {
  const res = (await authorizedRequest(
    getToken,
    `${BASE}?stats=true`
  )) as ApiResponse<FinancialTransactionStats>

  if (!res?.success) {
    throw new Error(res?.error || 'Failed to fetch financial stats')
  }

  return res.data
}

export async function createFinancialTransactionAction(
  getToken: TokenGetter,
  input: CreateFinancialTransactionFormValues
): Promise<{ id: string; transaction_number: string }> {
  const res = (await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })) as ApiResponse<{ id: string; transaction_number: string }>

  if (!res?.success) {
    throw new Error(res?.error || 'Failed to create financial transaction')
  }

  return res.data
}

export async function updateFinancialTransactionStatusAction(
  getToken: TokenGetter,
  id: string,
  status: string,
  notes?: string
): Promise<{ id: string; status: string }> {
  const res = (await authorizedRequest(getToken, `${BASE}/status`, {
    method: 'POST',
    body: JSON.stringify({ id, status, notes }),
  })) as ApiResponse<{ id: string; status: string }>

  if (!res?.success) {
    throw new Error(res?.error || 'Failed to update transaction status')
  }

  return res.data
}

export async function refundFinancialTransactionAction(
  getToken: TokenGetter,
  input: RefundFinancialTransactionFormValues
): Promise<{
  refund_id: string
  refund_transaction_number: string
  parent_status: string
  refunded_amount: number
}> {
  const res = (await authorizedRequest(getToken, `${BASE}/refund`, {
    method: 'POST',
    body: JSON.stringify(input),
  })) as ApiResponse<{
    refund_id: string
    refund_transaction_number: string
    parent_status: string
    refunded_amount: number
  }>

  if (!res?.success) {
    throw new Error(res?.error || 'Failed to process refund')
  }

  return res.data
}
