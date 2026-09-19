export type PriceSource = 'MANUAL' | 'LAST_PURCHASE_COST' | 'AVERAGE_COST'

export interface TaxBreakdown {
  sellingPrice: number
  priceBeforeTax: number
  taxAmount: number
  priceAfterTax: number
  taxRatePercent: number
  isInclusive: boolean
}

/**
 * Normalizes a tax rate value to a decimal ratio.
 * e.g., 14 -> 0.14, 0.15 -> 0.15
 */
export function normalizeTaxRate(rate?: number | null): number {
  if (rate == null || isNaN(rate) || rate <= 0) return 0
  return rate > 1 ? rate / 100 : rate
}

/**
 * Returns the percentage display value for a tax rate.
 * e.g., 14 -> 14, 0.15 -> 15
 */
export function getTaxRatePercentage(rate?: number | null): number {
  if (rate == null || isNaN(rate) || rate <= 0) return 0
  return rate > 1 ? rate : Number((rate * 100).toFixed(2))
}

/**
 * Calculates tax breakdown based on base selling price, tax rate, and inclusivity flag.
 */
export function calculateTaxBreakdown(
  sellingPrice: number,
  taxRate?: number | null,
  isInclusive?: boolean | null
): TaxBreakdown {
  const price = Number(sellingPrice) || 0
  const rateRatio = normalizeTaxRate(taxRate)
  const taxRatePercent = getTaxRatePercentage(taxRate)
  const inclusive = Boolean(isInclusive)

  if (price <= 0 || rateRatio <= 0) {
    return {
      sellingPrice: price,
      priceBeforeTax: Math.max(0, price),
      taxAmount: 0,
      priceAfterTax: Math.max(0, price),
      taxRatePercent: 0,
      isInclusive: inclusive,
    }
  }

  if (inclusive) {
    const priceAfterTax = price
    const priceBeforeTax = Number((price / (1 + rateRatio)).toFixed(2))
    const taxAmount = Number((priceAfterTax - priceBeforeTax).toFixed(2))
    return {
      sellingPrice: price,
      priceBeforeTax,
      taxAmount,
      priceAfterTax,
      taxRatePercent,
      isInclusive: true,
    }
  }

  const priceBeforeTax = price
  const taxAmount = Number((price * rateRatio).toFixed(2))
  const priceAfterTax = Number((price + taxAmount).toFixed(2))
  return {
    sellingPrice: price,
    priceBeforeTax,
    taxAmount,
    priceAfterTax,
    taxRatePercent,
    isInclusive: false,
  }
}

/**
 * Calculates selling price from base cost and markup percentage.
 * Formula: Cost * (1 + markupPercent / 100)
 */
export function calculatePriceFromCostAndMarkup(
  cost: number,
  markupPercent?: number | null
): number {
  const numCost = Number(cost) || 0
  const markup = Number(markupPercent) || 0
  if (numCost <= 0) return 0

  const computed = numCost * (1 + markup / 100)
  return Number(computed.toFixed(2))
}

/**
 * Calculates markup percentage from cost and selling price.
 * Formula: ((sellingPrice - cost) / cost) * 100
 */
export function calculateMarkupPercent(
  cost: number,
  sellingPrice: number
): number {
  const numCost = Number(cost) || 0
  const numPrice = Number(sellingPrice) || 0
  if (numCost <= 0) return 0

  return Number((((numPrice - numCost) / numCost) * 100).toFixed(2))
}
