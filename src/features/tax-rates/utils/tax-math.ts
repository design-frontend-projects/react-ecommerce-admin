import type { TaxCalculationResult, TaxRateValidity } from '../types'

/**
 * Calculates tax details with support for inclusive, exclusive, quantities, and discounts.
 */
export function calculateTax({
  amount,
  rate,
  isInclusive = false,
  quantity = 1,
  discount = 0,
}: {
  amount: number
  rate: number
  isInclusive?: boolean
  quantity?: number
  discount?: number
}): TaxCalculationResult {
  const safeQty = Math.max(1, quantity)
  const safeRate = Math.max(0, rate)
  const totalBase = Math.max(0, amount * safeQty - Math.max(0, discount))

  if (safeRate === 0 || totalBase === 0) {
    return {
      grossAmount: Number(totalBase.toFixed(2)),
      netAmount: Number(totalBase.toFixed(2)),
      taxAmount: 0,
      effectiveRate: safeRate,
      isInclusive,
      unitTax: 0,
      formula: isInclusive
        ? 'Zero Tax Rate (Inclusive)'
        : 'Zero Tax Rate (Exclusive)',
    }
  }

  if (isInclusive) {
    // Gross is the totalBase (tax is included)
    // Net = Gross / (1 + Rate/100)
    // Tax = Gross - Net
    const netAmount = totalBase / (1 + safeRate / 100)
    const taxAmount = totalBase - netAmount
    const unitTax = safeQty > 0 ? taxAmount / safeQty : 0

    return {
      grossAmount: Number(totalBase.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      effectiveRate: safeRate,
      isInclusive: true,
      unitTax: Number(unitTax.toFixed(2)),
      formula: `Net = ${totalBase.toFixed(2)} / (1 + ${safeRate}% / 100) = ${netAmount.toFixed(2)}, Tax = Gross - Net = ${taxAmount.toFixed(2)}`,
    }
  } else {
    // Exclusive: Net is totalBase, Tax is Net * Rate/100, Gross is Net + Tax
    const taxAmount = (totalBase * safeRate) / 100
    const grossAmount = totalBase + taxAmount
    const unitTax = safeQty > 0 ? taxAmount / safeQty : 0

    return {
      grossAmount: Number(grossAmount.toFixed(2)),
      netAmount: Number(totalBase.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      effectiveRate: safeRate,
      isInclusive: false,
      unitTax: Number(unitTax.toFixed(2)),
      formula: `Tax = ${totalBase.toFixed(2)} * (${safeRate}% / 100) = ${taxAmount.toFixed(2)}, Gross = Net + Tax = ${grossAmount.toFixed(2)}`,
    }
  }
}

/**
 * Evaluates whether a tax rate is currently effective, upcoming in the future, or expired.
 */
export function getTaxRateValidity(
  effectiveFrom?: string | null,
  effectiveTo?: string | null,
  referenceDate: Date = new Date()
): TaxRateValidity {
  if (!effectiveFrom) return 'current'

  // Format YYYY-MM-DD for stable date comparisons without timezone skew
  const refStr = referenceDate.toISOString().split('T')[0]
  const fromStr = effectiveFrom.split('T')[0]
  const toStr = effectiveTo ? effectiveTo.split('T')[0] : null

  if (fromStr > refStr) {
    return 'upcoming'
  }

  if (toStr && toStr < refStr) {
    return 'expired'
  }

  return 'current'
}

/**
 * Human-readable format of rate with percentage and mode badge text
 */
export function formatTaxRate(rate: number, isInclusive = false): string {
  const formattedRate = Number(rate).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
  return `${formattedRate}% ${isInclusive ? '(Inc)' : '(Exc)'}`
}

/**
 * Format currency amounts nicely
 */
export function formatCurrency(amount: number, currencyCode = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
