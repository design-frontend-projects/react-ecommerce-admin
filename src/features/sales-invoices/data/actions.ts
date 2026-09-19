import { supabase } from '@/lib/supabase'
import { authorizedRequest } from '@/lib/authorized-request'
import type {
  SalesInvoice,
  InvoiceListResponse,
  InvoiceDashboardStats,
  InvoiceReportResult,
  InvoiceFiltersState,
} from '../types'
import type {
  RecordPaymentFormData,
  CancelInvoiceFormData,
  VoidInvoiceFormData,
  CreditNoteFormData,
  CreateInvoiceFormData,
} from '../schemas'

async function getToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch {
    return null
  }
}

export async function fetchSalesInvoices(
  filters: Partial<InvoiceFiltersState> = {}
): Promise<InvoiceListResponse> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.paymentStatus && filters.paymentStatus !== 'all') params.set('paymentStatus', filters.paymentStatus)
  if (filters.invoiceType && filters.invoiceType !== 'all') params.set('invoiceType', filters.invoiceType)
  if (filters.customerId) params.set('customerId', filters.customerId)
  if (filters.storeId) params.set('storeId', filters.storeId)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

  const url = `/api/sales-invoices${params.toString() ? `?${params.toString()}` : ''}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: InvoiceListResponse
  }
  return res.data
}

export async function fetchInvoiceById(id: string): Promise<SalesInvoice> {
  const url = `/api/sales-invoices?id=${encodeURIComponent(id)}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: SalesInvoice
  }
  return res.data
}

export async function createSalesInvoiceAction(
  data: CreateInvoiceFormData
): Promise<SalesInvoice> {
  const res = (await authorizedRequest(getToken, '/api/sales-invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  })) as {
    success: boolean
    data: SalesInvoice
  }
  return res.data
}

export async function issueInvoiceAction(id: string): Promise<SalesInvoice> {
  const res = (await authorizedRequest(getToken, '/api/sales-invoices/issue', {
    method: 'POST',
    body: JSON.stringify({ invoiceId: id }),
  })) as {
    success: boolean
    data: SalesInvoice
  }
  return res.data
}

export async function recordInvoicePaymentAction(
  invoiceId: string,
  payment: RecordPaymentFormData
): Promise<{ payment: any; invoice: SalesInvoice }> {
  const res = (await authorizedRequest(getToken, '/api/sales-invoices/payments', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, ...payment }),
  })) as {
    success: boolean
    data: { payment: any; invoice: SalesInvoice }
  }
  return res.data
}

export async function cancelInvoiceAction(
  id: string,
  payload: CancelInvoiceFormData
): Promise<SalesInvoice> {
  const res = (await authorizedRequest(getToken, '/api/sales-invoices/cancel', {
    method: 'POST',
    body: JSON.stringify({ invoiceId: id, reason: payload.reason }),
  })) as {
    success: boolean
    data: SalesInvoice
  }
  return res.data
}

export async function voidInvoiceAction(
  id: string,
  payload: VoidInvoiceFormData
): Promise<SalesInvoice> {
  const res = (await authorizedRequest(getToken, '/api/sales-invoices/void', {
    method: 'POST',
    body: JSON.stringify({ invoiceId: id, reason: payload.reason }),
  })) as {
    success: boolean
    data: SalesInvoice
  }
  return res.data
}

export async function createCreditNoteAction(
  originalInvoiceId: string,
  payload: CreditNoteFormData
): Promise<SalesInvoice> {
  const res = (await authorizedRequest(getToken, '/api/sales-invoices/credit-note', {
    method: 'POST',
    body: JSON.stringify({ originalInvoiceId, reason: payload.reason }),
  })) as {
    success: boolean
    data: SalesInvoice
  }
  return res.data
}

export async function fetchInvoiceDashboardStats(
  dateRange?: { from?: string; to?: string }
): Promise<InvoiceDashboardStats> {
  const params = new URLSearchParams()
  if (dateRange?.from) params.set('from', dateRange.from)
  if (dateRange?.to) params.set('to', dateRange.to)

  const url = `/api/sales-invoices/dashboard${params.toString() ? `?${params.toString()}` : ''}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: InvoiceDashboardStats
  }
  return res.data
}

export async function fetchInvoiceReports(
  params: {
    reportType: 'sales' | 'outstanding' | 'tax' | 'discount' | 'pos'
    dateFrom?: string
    dateTo?: string
    storeId?: string
    customerId?: string
  }
): Promise<InvoiceReportResult> {
  const query = new URLSearchParams()
  query.set('reportType', params.reportType)
  if (params.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params.dateTo) query.set('dateTo', params.dateTo)
  if (params.storeId) query.set('storeId', params.storeId)
  if (params.customerId) query.set('customerId', params.customerId)

  const url = `/api/sales-invoices/reports?${query.toString()}`
  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: InvoiceReportResult
  }
  return res.data
}
