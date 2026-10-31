/**
 * src/server/utils/cost-sanitizer.ts
 *
 * Recursive Sensitive Field Stripping Pipeline.
 * Guarantees cost, purchase, markup, margin, profit, and valuation metrics
 * are never serialized over the wire unless the caller holds `products.view_cost`.
 */

import { hasPermission } from '@/features/users/data/rbac'

export const SENSITIVE_COST_KEYS = new Set([
  'cost_price',
  'costprice',
  'unit_cost',
  'unitcost',
  'purchase_price',
  'purchaseprice',
  'markup_percent',
  'markuppercent',
  'markup',
  'margin',
  'margins',
  'margin_percent',
  'marginpercent',
  'potential_margin',
  'potentialmargin',
  'profit',
  'gross_profit',
  'grossprofit',
  'net_profit',
  'netprofit',
  'avg_cost',
  'avgcost',
  'total_value',
  'totalvalue',
  'valuation',
  'est_unit_cost',
  'estunitcost',
  'standard_unit_cost',
  'standardunitcost',
  'avco_unit_cost',
  'avcounitcost',
  'fifo_unit_cost',
  'fifounitcost',
])

/**
 * Check if the caller holds the products.view_cost permission or superadmin wildcard.
 */
export function hasCostViewPermission(permissions: string[]): boolean {
  if (!permissions || permissions.length === 0) return false
  return hasPermission(permissions, 'products.view_cost') || permissions.includes('*')
}

/**
 * Recursively strips sensitive cost, purchase, markup, margin, and profit fields
 * from any object, array, or nested record unless caller has products.view_cost.
 */
export function stripSensitiveCostFields<T>(
  data: T,
  hasViewCostPermission: boolean
): T {
  if (hasViewCostPermission || data === null || data === undefined) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      stripSensitiveCostFields(item, hasViewCostPermission)
    ) as unknown as T
  }

  if (typeof data === 'object') {
    // Preserve primitives, dates, regexps, buffers
    if (data instanceof Date || data instanceof RegExp) {
      return data
    }

    const cleanObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '')
      const isSensitive =
        SENSITIVE_COST_KEYS.has(key.toLowerCase()) ||
        SENSITIVE_COST_KEYS.has(normalizedKey) ||
        normalizedKey.includes('costprice') ||
        normalizedKey.includes('unitcost') ||
        normalizedKey.includes('purchaseprice') ||
        normalizedKey.includes('markuppercent') ||
        normalizedKey.includes('marginpercent') ||
        normalizedKey === 'valuation' ||
        normalizedKey === 'avgcost'

      if (isSensitive) {
        continue
      }

      cleanObj[key] = stripSensitiveCostFields(value, hasViewCostPermission)
    }
    return cleanObj as T
  }

  return data
}

/**
 * Strip sensitive cost columns from tabular or CSV rows when caller lacks permission.
 */
export function stripSensitiveCostColumns(
  rows: Record<string, unknown>[],
  hasViewCostPermission: boolean
): Record<string, unknown>[] {
  if (hasViewCostPermission) return rows
  return rows.map((row) => stripSensitiveCostFields(row, false))
}
