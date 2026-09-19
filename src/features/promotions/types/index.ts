// ============================================================================
// PROMOTIONS, DISCOUNTS & COUPONS MODULE — TYPES
// ============================================================================

export type PromotionStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'scheduled'
  | 'expired'
  | 'archived'

export type PromotionType =
  | 'percentage'
  | 'fixed_amount'
  | 'buy_x_get_y'
  | 'free_item'
  | 'order_discount'
  | 'tiered'

export type RuleActionType =
  | 'percentage_discount'
  | 'fixed_discount'
  | 'buy_x_get_y'
  | 'free_item'
  | 'bundle_fixed_price'

export type PromotionScope = 'all' | 'selected'

export type ConditionField =
  | 'order_subtotal'
  | 'item_quantity'
  | 'customer_group'
  | 'product_category'
  | 'product_brand'
  | 'sales_channel'
  | 'store'
  | 'branch'
  | 'customer_first_order'
  | 'customer_order_count'
  | 'day_of_week'
  | 'time_of_day'

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'in'
  | 'not_in'
  | 'between'

export type CouponStatus = 'active' | 'expired' | 'exhausted' | 'disabled'

export type DiscountSource =
  | 'promotion'
  | 'coupon'
  | 'manual'
  | 'customer_group'
  | 'price_list'

export type DiscountType = 'fixed' | 'percentage'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

// ============================================================================
// ENTITY INTERFACES
// ============================================================================

export interface InvPromotionRule {
  id?: string
  promotionId?: string
  ruleType: RuleActionType
  discountValue: number
  applyTo: 'matching_items' | 'cheapest_item' | 'most_expensive_item' | 'entire_order' | string
  buyQuantity?: number | null
  getQuantity?: number | null
  getDiscountPercent?: number | null
  getProductVariantId?: string | null
  freeVariantName?: string | null
  tierMinQuantity?: number | null
  tierMinAmount?: number | null
  sortOrder?: number
}

export interface InvPromotionCondition {
  id?: string
  promotionId?: string
  groupId?: string
  logicalOperator?: 'AND' | 'OR'
  field: ConditionField
  operator: ConditionOperator
  value: string
  sortOrder?: number
}

export interface InvPromotionScopeItem {
  id?: string
  targetId: string
  name?: string
  code?: string
  isExcluded?: boolean
}

export interface InvPromotion {
  id: string
  tenantId: string
  name: string
  code?: string | null
  description?: string | null
  status: PromotionStatus
  promoType: PromotionType
  startDate: string
  endDate?: string | null
  timezone: string
  priority: number
  currencyId?: string | null
  currencyCode: string
  minOrderAmount?: number
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  usagePerCustomer?: number | null
  dailyUsageLimit?: number | null
  currentUsageCount: number
  allowStacking: boolean
  stackingPriority: number
  maxStackingCount?: number | null
  requiresCoupon: boolean
  requiresApproval: boolean
  autoApply: boolean
  scopeProductType: PromotionScope
  scopeCustomerType: PromotionScope
  scopeChannelType: PromotionScope
  scopeLocationType: PromotionScope
  createdByUserId?: string | null
  updatedByUserId?: string | null
  createdAt: string
  updatedAt: string

  // Relations
  rules?: InvPromotionRule[]
  conditions?: InvPromotionCondition[]
  products?: { id: string; productId?: string | null; productVariantId?: string | null; isExcluded: boolean; productName?: string; variantSku?: string }[]
  categories?: { id: string; categoryId: string; isExcluded: boolean; categoryName?: string }[]
  brands?: { id: string; brandId: string; isExcluded: boolean; brandName?: string }[]
  customerGroups?: { id: string; customerGroupId: string; isExcluded: boolean; groupName?: string }[]
  channels?: { id: string; channelId: string; isExcluded: boolean; channelName?: string }[]
  stores?: { id: string; storeId: string; isExcluded: boolean; storeName?: string }[]
  branches?: { id: string; branchId: string; isExcluded: boolean; branchName?: string }[]
  coupons?: InvCoupon[]
}

export interface InvCoupon {
  id: string
  tenantId: string
  promotionId: string
  promotionName?: string
  code: string
  description?: string | null
  status: CouponStatus
  maxUsages?: number | null
  maxUsagesPerCustomer?: number | null
  currentUsages: number
  minOrderAmount?: number | null
  startDate?: string | null
  endDate?: string | null
  customerId?: string | null
  customerName?: string | null
  isSingleUse: boolean
  createdAt: string
  updatedAt: string
}

export interface InvCouponRedemption {
  id: string
  tenantId: string
  couponId: string
  promotionId: string
  customerId?: string | null
  salesInvoiceId?: string | null
  salesOrderId?: string | null
  discountAmount: number
  redeemedAt: string
  couponCode?: string
  customerName?: string | null
}

export interface InvSalesInvoiceDiscount {
  id: string
  salesInvoiceId: string
  promotionId?: string | null
  couponId?: string | null
  discountSource: DiscountSource
  discountType: DiscountType
  discountRate?: number | null
  discountAmount: number
  reason?: string | null
  appliedByUserId?: string | null
  createdAt: string
  promotionName?: string | null
  couponCode?: string | null
}

export interface InvSalesInvoiceItemDiscount {
  id: string
  salesInvoiceItemId: string
  salesInvoiceId: string
  promotionId?: string | null
  promotionRuleId?: string | null
  couponId?: string | null
  discountSource: DiscountSource
  discountType: DiscountType
  discountRate?: number | null
  discountAmount: number
  originalUnitPrice: number
  finalUnitPrice: number
  quantity: number
  createdAt: string
}

export interface InvDiscountApprovalRequest {
  id: string
  tenantId: string
  branchId: string
  storeId?: string | null
  posTerminalId?: string | null
  requestedByUserId: string
  requestedByName?: string
  approvedByUserId?: string | null
  approvedByName?: string | null
  salesInvoiceId?: string | null
  salesOrderId?: string | null
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  originalAmount: number
  userMaxAllowedPercent: number
  status: ApprovalStatus
  reason: string
  rejectionReason?: string | null
  reviewedAt?: string | null
  createdAt: string
  updatedAt: string
  branchName?: string
  storeName?: string
}

// ============================================================================
// ENGINE EVALUATION TYPES
// ============================================================================

export interface CartItemForEvaluation {
  lineId?: string
  variantId: string
  productId: string
  productName?: string
  variantName?: string
  sku?: string
  categoryId?: string | null
  brandId?: string | null
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface PromotionEvaluationContext {
  cartItems: CartItemForEvaluation[]
  customerId?: string | null
  customerGroupId?: string | null
  customerOrderCount?: number
  isFirstOrder?: boolean
  channelId?: string | null
  storeId?: string | null
  branchId?: string | null
  couponCode?: string | null
  currencyCode?: string
  currencyId?: string | null
  manualDiscountPercent?: number | null
  manualDiscountReason?: string | null
  authUserId?: string
  userMaxDiscountPercent?: number | null
  evaluationDate?: Date
}

export interface DiscountItemAllocation {
  lineId?: string
  variantId: string
  productId: string
  quantity: number
  originalUnitPrice: number
  finalUnitPrice: number
  lineOriginalSubtotal: number
  totalDiscountAmount: number
  finalSubtotal: number
  discounts: {
    promotionId?: string | null
    promotionRuleId?: string | null
    promotionName?: string | null
    couponId?: string | null
    source: DiscountSource
    type: DiscountType
    rate?: number | null
    amount: number
  }[]
}

export interface AppliedPromotionSummary {
  promotionId: string
  promotionName: string
  code?: string | null
  promoType: PromotionType
  discountAmount: number
  ruleId?: string
  ruleType?: RuleActionType
  couponCode?: string | null
}

export interface PricingResult {
  currencyCode: string
  grossSubtotal: number
  totalItemDiscounts: number
  totalInvoiceDiscounts: number
  totalPromotionDiscount: number
  totalCouponDiscount: number
  totalManualDiscount: number
  totalDiscount: number
  netAmount: number
  itemAllocations: DiscountItemAllocation[]
  appliedPromotions: AppliedPromotionSummary[]
  appliedCoupon?: {
    couponId: string
    code: string
    promotionId: string
    discountAmount: number
  } | null
  rejectedPromotions: {
    promotionId: string
    name: string
    reason: string
  }[]
  approvalRequired: boolean
  approvalReason?: string
  manualDiscountRequested?: {
    percent: number
    amount: number
    userMaxAllowed: number
    exceedsLimit: boolean
  } | null
}
