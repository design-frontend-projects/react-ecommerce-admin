import type {
  refund_status_enum,
  refund_method_enum,
  refund_inventory_return_status_enum,
  refund_approval_level_enum,
  return_disposition_enum,
  stock_condition_enum,
} from '@/generated/prisma/enums'
import type { RefundPolicy } from '@/server/fns/refund-policy'
import type { RefundAuthorizationResult } from '@/server/fns/refund-authorization'

export type {
  refund_status_enum,
  refund_method_enum,
  refund_inventory_return_status_enum,
  refund_approval_level_enum,
  return_disposition_enum,
  stock_condition_enum,
  RefundPolicy,
  RefundAuthorizationResult,
}

export interface RefundItemRecord {
  id: string
  tenant_id: string
  refund_id: string
  sales_invoice_item_id: string
  product_variant_id: string
  original_quantity: number | string
  previously_refunded_qty: number | string
  refund_quantity: number | string
  unit_price: number | string
  discount_amount: number | string
  tax_amount: number | string
  refund_amount: number | string
  reason?: string | null
  condition?: stock_condition_enum | null
  disposition?: return_disposition_enum | null
  sku_snapshot?: string | null
  product_name_snapshot?: string | null
  variant_name_snapshot?: string | null
  created_at: string | Date
}

export interface RefundRecord {
  id: string
  tenant_id: string
  refund_number: string
  sales_invoice_id: string
  store_id?: string | null
  branch_id?: string | null
  pos_terminal_id?: string | null
  customer_id?: string | null
  status: refund_status_enum
  currency: string
  requested_amount: number | string
  approved_amount: number | string
  refunded_amount: number | string
  refund_method?: refund_method_enum | null
  original_payment_method?: string | null
  refund_reference?: string | null
  reason?: string | null
  notes?: string | null
  approval_required: boolean
  approval_level: refund_approval_level_enum
  approval_reason?: string | null
  requested_at?: string | Date | null
  requested_by_user_id?: string | null
  submitted_at?: string | Date | null
  submitted_by_user_id?: string | null
  approved_at?: string | Date | null
  approved_by_user_id?: string | null
  rejected_at?: string | Date | null
  rejected_by_user_id?: string | null
  rejection_reason?: string | null
  processed_at?: string | Date | null
  processed_by_user_id?: string | null
  completed_at?: string | Date | null
  completed_by_user_id?: string | null
  cancelled_at?: string | Date | null
  cancelled_by_user_id?: string | null
  cancellation_reason?: string | null
  inventory_return_required: boolean
  inventory_return_status: refund_inventory_return_status_enum
  inventory_transaction_id?: string | null
  version: number
  idempotency_key?: string | null
  created_at: string | Date
  updated_at: string | Date
  refund_items?: RefundItemRecord[]
  sales_invoices?: {
    id: string
    invoice_no: string
    invoice_date: string | Date
    total_amount: number | string
    customers?: {
      id: string
      name: string
      phone?: string | null
    } | null
  } | null
}

export interface RefundableInvoiceItem {
  salesInvoiceItemId: string
  productVariantId: string
  skuSnapshot?: string | null
  productNameSnapshot?: string | null
  variantNameSnapshot?: string | null
  uomSnapshot?: string | null
  originalQuantity: number
  previouslyRefundedQuantity: number
  remainingRefundableQuantity: number
  unitPrice: number
  effectiveUnitPrice: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  isFullyRefunded: boolean
}

export interface RefundableInvoiceDetails {
  invoice: {
    id: string
    invoiceNo: string
    invoiceDate: string | Date
    status: string
    paymentStatus: string
    totalAmount: number
    paidAmount: number
    storeId?: string | null
    branchId?: string | null
    customerId?: string | null
    customerName?: string | null
    primaryPaymentMethod?: string | null
  }
  items: RefundableInvoiceItem[]
  policy: RefundPolicy
}

export interface RefundItemDraft {
  salesInvoiceItemId: string
  productVariantId: string
  refundQuantity: number
  disposition: return_disposition_enum
  reason?: string
  unitPrice: number
  refundAmount: number
  skuSnapshot?: string | null
  productNameSnapshot?: string | null
}
