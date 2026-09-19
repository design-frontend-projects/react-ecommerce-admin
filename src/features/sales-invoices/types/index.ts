export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'posted'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void'
  | 'refunded'
  | 'returned'
  | 'partially_returned'

export type InvoicePaymentStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overpaid'
  | 'refunded'

export type InvoiceType =
  | 'sale'
  | 'credit_note'
  | 'debit_note'
  | 'proforma'
  | 'service'

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'wallet'
  | 'cheque'
  | 'mixed'

export interface CustomerSummary {
  id: string
  customer_type?: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  email?: string | null
  phone?: string | null
}

export interface SalesInvoiceItem {
  id: string
  invoice_id: string
  line_no: number
  product_variant_id: string
  product_id?: string | null
  description?: string | null
  sku_snapshot?: string | null
  product_name_snapshot?: string | null
  variant_name_snapshot?: string | null
  uom_snapshot?: string | null
  quantity: number
  unit_price: number
  unit_cost: number
  gross_amount: number
  discount_type?: 'percentage' | 'fixed' | null
  discount_value: number
  discount_amount: number
  tax_rate_id?: string | null
  tax_rate: number
  tax_amount: number
  net_amount: number
  line_subtotal: number
  line_total: number
  warehouse_id?: string | null
  batch_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface SalesInvoicePayment {
  id: string
  tenant_id: string
  invoice_id: string
  payment_method: PaymentMethod
  amount: number
  currency: string
  status: string
  reference_number?: string | null
  notes?: string | null
  payment_date: string
  created_at: string
}

export interface SalesInvoice {
  id: string
  tenant_id: string
  invoice_no: string
  invoice_type: InvoiceType
  source_type: string
  source_id?: string | null
  branch_id?: string
  store_id?: string | null
  warehouse_id?: string | null
  pos_terminal_id?: string | null
  customer_id?: string | null
  currency_id?: string | null
  channel_id?: string | null
  price_list_id?: string | null
  invoice_date: string
  due_date?: string | null
  status: InvoiceStatus
  payment_status: InvoicePaymentStatus
  subtotal: number
  discount_amount: number
  tax_amount: number
  shipping_amount: number
  rounding_amount: number
  total_amount: number
  paid_amount: number
  due_amount: number
  notes?: string | null
  terms?: string | null
  posted_at?: string | null
  created_at: string
  updated_at: string
  customers?: CustomerSummary | null
  warehouses?: { id: string; name: string; code: string } | null
  currencies?: { id: string; code: string; symbol: string } | null
  channels?: { id: string; name: string; channel_type: string } | null
  sales_invoice_items?: SalesInvoiceItem[]
  sales_invoice_payments?: SalesInvoicePayment[]
  _count?: {
    sales_invoice_items: number
    sales_invoice_payments: number
  }
}

export interface InvoiceListResponse {
  items: SalesInvoice[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface InvoiceDashboardStats {
  totalInvoiced: number
  totalPaid: number
  totalDue: number
  totalTax: number
  totalDiscount: number
  totalInvoicesCount: number
  statusBreakdown: Array<{
    status: InvoiceStatus
    count: number
    amount: number
  }>
  paymentStatusBreakdown: Array<{
    paymentStatus: InvoicePaymentStatus
    count: number
    amount: number
    dueAmount: number
  }>
  recentInvoices: SalesInvoice[]
}

export interface InvoiceReportSummary {
  totalAmount?: number
  totalPaid?: number
  totalDue?: number
  totalTax?: number
  taxableAmount?: number
  totalDiscount?: number
  totalSales?: number
  invoiceCount?: number
  count?: number
}

export interface InvoiceReportResult {
  reportType: 'sales' | 'outstanding' | 'tax' | 'discount' | 'pos'
  summary: InvoiceReportSummary
  items: any[]
}

export interface InvoiceFiltersState {
  search?: string
  status?: InvoiceStatus | 'all'
  paymentStatus?: InvoicePaymentStatus | 'all'
  invoiceType?: InvoiceType | 'all'
  customerId?: string
  storeId?: string
  dateFrom?: string
  dateTo?: string
  page: number
  pageSize: number
  sortBy?: 'invoice_date' | 'created_at' | 'total_amount' | 'invoice_no'
  sortOrder?: 'asc' | 'desc'
}
