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
  promo_type?: PromotionType
  startDate: string
  start_date?: string
  endDate?: string | null
  end_date?: string | null
  timezone: string
  priority: number
  currencyId?: string | null
  currency_id?: string | null
  currencyCode?: string
  currency_code?: string | null
  currency?: { id: string; code: string; symbol?: string | null; name?: string | null } | null
  currencies?: { id: string; code: string; symbol?: string | null; name?: string | null } | null
  minOrderAmount?: number
  min_order_amount?: number | string | null
  maxDiscountAmount?: number | null
  max_discount_amount?: number | string | null
  current_discount_amount?: number | null
  currentDiscountAmount?: number | null
  usageLimit?: number | null
  usage_limit?: number | null
  usagePerCustomer?: number | null
  usage_per_customer?: number | null
  dailyUsageLimit?: number | null
  daily_usage_limit?: number | null
  currentUsageCount: number
  current_usage_count?: number | null
  allowStacking: boolean
  allow_stacking?: boolean
  stackingPriority: number
  stacking_priority?: number
  maxStackingCount?: number | null
  max_stacking_count?: number | null
  requiresCoupon: boolean
  requires_coupon?: boolean
  requiresApproval: boolean
  requires_approval?: boolean
  autoApply: boolean
  auto_apply?: boolean
  scopeProductType: PromotionScope
  scopeCustomerType: PromotionScope
  scopeChannelType: PromotionScope
  scopeLocationType: PromotionScope
  createdByUserId?: string | null
  updatedByUserId?: string | null
  createdAt: string
  updatedAt: string

  // Relations
  rules?: (InvPromotionRule | Record<string, unknown>)[]
  conditions?: (InvPromotionCondition | Record<string, unknown>)[]
  products?: { id: string; productId?: string | null; product_id?: string | null; productVariantId?: string | null; product_variant_id?: string | null; isExcluded?: boolean; is_excluded?: boolean; productName?: string; variantSku?: string }[]
  categories?: { id: string; categoryId?: string; category_id?: string; isExcluded?: boolean; is_excluded?: boolean; categoryName?: string }[]
  brands?: { id: string; brandId?: string; brand_id?: string; isExcluded?: boolean; is_excluded?: boolean; brandName?: string }[]
  customerGroups?: { id: string; customerGroupId?: string; customer_group_id?: string; isExcluded?: boolean; is_excluded?: boolean; groupName?: string }[]
  customer_groups?: { id: string; customerGroupId?: string; customer_group_id?: string; isExcluded?: boolean; is_excluded?: boolean; groupName?: string }[]
  channels?: { id: string; channelId?: string; channel_id?: string; isExcluded?: boolean; is_excluded?: boolean; channelName?: string }[]
  stores?: { id: string; storeId?: string; store_id?: string; isExcluded?: boolean; is_excluded?: boolean; storeName?: string }[]
  branches?: { id: string; branchId?: string; branch_id?: string; isExcluded?: boolean; is_excluded?: boolean; branchName?: string }[]
  coupons?: InvCoupon[]
  usage_logs?: Record<string, unknown>[]
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

export interface PromotionLookupData {
  currencies: { id: string; code: string; name: string; symbol: string | null }[]
  categories: { id: string; name: string; name_ar?: string | null; parent_id?: string | null }[]
  brands: { id: string; name: string; name_ar?: string | null; code?: string | null }[]
  customerGroups: { id: string; name: string; discountPercentage: number }[]
  channels: { id: string; code: string; name: string }[]
  stores: { id: string; name: string }[]
  branches: { id: string; name: string }[]
  products: { id: string; name: string; sku?: string | null; category_id?: string | null; brand_id?: string | null }[]
  productVariants: { id: string; name: string; sku: string; product_id: string }[]
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
