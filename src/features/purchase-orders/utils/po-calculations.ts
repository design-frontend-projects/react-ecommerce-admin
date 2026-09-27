import { type DecimalMath, d } from './decimal-math'

export interface POLineCalculationInput {
  product_variant_id: string
  quantity_ordered: number | string
  unit_cost: number | string
  discount_amount?: number | string | null
  tax_amount?: number | string | null
  line_no?: number
  uom_id?: string | null
}

export interface POLineCalculationResult {
  product_variant_id: string
  quantity_ordered: number
  unit_cost: number
  gross_amount: number
  subtotal: number
  discount_amount: number
  net_before_tax: number
  tax_amount: number
  total_amount: number
  line_no?: number
  uom_id?: string | null

  // Decimal representations
  dec_quantity: DecimalMath
  dec_unit_cost: DecimalMath
  dec_subtotal: DecimalMath
  dec_discount: DecimalMath
  dec_tax: DecimalMath
  dec_total: DecimalMath
}

export interface POHeaderAdjustments {
  shipping_amount?: number | string | null
}

export interface POTotalsResult {
  subtotal: number
  discount_total: number
  tax_total: number
  shipping_amount: number
  grand_total: number

  dec_subtotal: DecimalMath
  dec_discount_total: DecimalMath
  dec_tax_total: DecimalMath
  dec_shipping_amount: DecimalMath
  dec_grand_total: DecimalMath
}

export interface POValidationError {
  field: string
  line_no?: number
  message: string
}

/**
 * Calculates line-level financials:
 * gross_amount = quantity_ordered * unit_cost
 * subtotal = gross_amount
 * net_before_tax = gross_amount - discount_amount
 * line_total = net_before_tax + tax_amount
 */
export function calculatePOLine(input: POLineCalculationInput): POLineCalculationResult {
  const qty = d(input.quantity_ordered)
  const cost = d(input.unit_cost)
  const discount = d(input.discount_amount || 0)
  const tax = d(input.tax_amount || 0)

  const gross = qty.mul(cost)
  const subtotal = gross
  const netBeforeTax = gross.sub(discount)
  const total = netBeforeTax.add(tax)

  return {
    product_variant_id: input.product_variant_id,
    quantity_ordered: qty.toNumber(),
    unit_cost: cost.toNumber(),
    gross_amount: gross.toNumber(),
    subtotal: subtotal.toNumber(),
    discount_amount: discount.toNumber(),
    net_before_tax: netBeforeTax.toNumber(),
    tax_amount: tax.toNumber(),
    total_amount: total.toNumber(),
    line_no: input.line_no,
    uom_id: input.uom_id,

    dec_quantity: qty,
    dec_unit_cost: cost,
    dec_subtotal: subtotal,
    dec_discount: discount,
    dec_tax: tax,
    dec_total: total,
  }
}

/**
 * Calculates header-level authoritative financial totals:
 * subtotal = SUM(line subtotal values)
 * discount_total = SUM(line discount_amount)
 * tax_total = SUM(line tax_amount)
 * grand_total = subtotal - discount_total + tax_total + shipping_amount
 */
export function calculatePOTotals(
  lines: Array<POLineCalculationResult | POLineCalculationInput>,
  adjustments: POHeaderAdjustments = {}
): POTotalsResult {
  let subtotal = d(0)
  let discountTotal = d(0)
  let taxTotal = d(0)

  for (const rawLine of lines) {
    const line =
      'dec_subtotal' in rawLine && rawLine.dec_subtotal
        ? (rawLine as POLineCalculationResult)
        : calculatePOLine(rawLine)

    subtotal = subtotal.add(line.dec_subtotal)
    discountTotal = discountTotal.add(line.dec_discount)
    taxTotal = taxTotal.add(line.dec_tax)
  }

  const shipping = d(adjustments.shipping_amount || 0)
  if (shipping.isNegative()) {
    throw new Error('Shipping amount must be greater than or equal to 0')
  }
  const grandTotal = subtotal.sub(discountTotal).add(taxTotal).add(shipping)

  return {
    subtotal: subtotal.toNumber(),
    discount_total: discountTotal.toNumber(),
    tax_total: taxTotal.toNumber(),
    shipping_amount: shipping.toNumber(),
    grand_total: Math.max(0, grandTotal.toNumber()),

    dec_subtotal: subtotal,
    dec_discount_total: discountTotal,
    dec_tax_total: taxTotal,
    dec_shipping_amount: shipping,
    dec_grand_total: grandTotal,
  }
}

/**
 * Validates a single PO Line Item against business rules:
 * - quantity_ordered > 0
 * - unit_cost >= 0
 * - discount_amount >= 0 and <= gross
 * - tax_amount >= 0
 */
export function validatePOLine(line: {
  product_variant_id: string
  quantity_ordered: number | string
  unit_cost: number | string
  discount_amount?: number | string | null
  tax_amount?: number | string | null
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const qty = d(line.quantity_ordered)
  if (!qty.isPositive()) {
    errors.push('Quantity ordered must be greater than 0')
  }

  const cost = d(line.unit_cost)
  if (cost.isNegative()) {
    errors.push('Unit cost must be greater than or equal to 0')
  }

  const discount = d(line.discount_amount || 0)
  if (discount.isNegative()) {
    errors.push('Discount amount must be greater than or equal to 0')
  }

  const gross = qty.mul(cost)
  if (discount.gt(gross)) {
    errors.push(`Discount amount (${discount.toFixed(2)}) cannot exceed gross amount (${gross.toFixed(2)})`)
  }

  const tax = d(line.tax_amount || 0)
  if (tax.isNegative()) {
    errors.push('Tax amount must be greater than or equal to 0')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Checks for duplicate product_variant_id in a line item array.
 */
export function checkDuplicateVariants(items: Array<{ product_variant_id: string }>): {
  hasDuplicates: boolean
  duplicateVariantIds: string[]
} {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const item of items) {
    const id = item.product_variant_id
    if (!id) continue
    if (seen.has(id)) {
      duplicates.add(id)
    }
    seen.add(id)
  }
  return {
    hasDuplicates: duplicates.size > 0,
    duplicateVariantIds: Array.from(duplicates),
  }
}

/**
 * Validates Purchase Order lines and adjustments:
 * - quantity_ordered > 0 (supports fractional e.g. 0.5, 1.25)
 * - unit_cost >= 0
 * - discount_amount >= 0 and <= gross_amount
 * - tax_amount >= 0
 * - shipping_amount >= 0
 * - No duplicate product_variant_id
 */
export function validatePOCalculation(
  items: POLineCalculationInput[],
  adjustments: POHeaderAdjustments = {}
): POValidationError[] {
  const errors: POValidationError[] = []

  if (!items || items.length === 0) {
    errors.push({ field: 'items', message: 'At least one line item is required.' })
    return errors
  }

  const variantSeen = new Set<string>()

  items.forEach((item, index) => {
    const lineNum = item.line_no ?? index + 1
    const vId = (item.product_variant_id || '').trim()

    if (!vId) {
      errors.push({
        field: 'product_variant_id',
        line_no: lineNum,
        message: `Line #${lineNum}: Product variant is required.`,
      })
    } else {
      if (variantSeen.has(vId)) {
        errors.push({
          field: 'product_variant_id',
          line_no: lineNum,
          message: `Line #${lineNum}: Duplicate product variant selected. Each variant can only appear once per purchase order.`,
        })
      }
      variantSeen.add(vId)
    }

    const qty = d(item.quantity_ordered)
    if (!qty.isPositive()) {
      errors.push({
        field: 'quantity_ordered',
        line_no: lineNum,
        message: `Line #${lineNum}: Quantity ordered must be greater than 0.`,
      })
    }

    const cost = d(item.unit_cost)
    if (cost.isNegative()) {
      errors.push({
        field: 'unit_cost',
        line_no: lineNum,
        message: `Line #${lineNum}: Unit cost cannot be negative.`,
      })
    }

    const discount = d(item.discount_amount || 0)
    if (discount.isNegative()) {
      errors.push({
        field: 'discount_amount',
        line_no: lineNum,
        message: `Line #${lineNum}: Discount amount cannot be negative.`,
      })
    }

    const gross = qty.mul(cost)
    if (discount.gt(gross)) {
      errors.push({
        field: 'discount_amount',
        line_no: lineNum,
        message: `Line #${lineNum}: Discount amount (${discount.toFixed(2)}) cannot exceed gross subtotal (${gross.toFixed(2)}).`,
      })
    }

    const tax = d(item.tax_amount || 0)
    if (tax.isNegative()) {
      errors.push({
        field: 'tax_amount',
        line_no: lineNum,
        message: `Line #${lineNum}: Tax amount cannot be negative.`,
      })
    }
  })

  const shipping = d(adjustments.shipping_amount || 0)
  if (shipping.isNegative()) {
    errors.push({
      field: 'shipping_amount',
      message: 'Shipping amount cannot be negative.',
    })
  }

  return errors
}
