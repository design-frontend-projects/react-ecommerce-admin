/**
 * Serial Number Generator Utility
 * Generates standardized, unique serial numbers based on Product Name,
 * SKU, date stamps, and padded sequences.
 */

export interface GenerateSerialsOptions {
  productName: string
  count: number
  prefix?: string
  includeDate?: boolean
  date?: Date
  dateFormat?: 'YYYYMMDD' | 'YYMM' | 'none'
  separator?: '-' | '_' | ''
  startSequence?: number
  paddingDigits?: number
  existingSerials?: string[]
}

/**
 * Derives a clean alphanumeric prefix from a product name.
 * e.g., "Apple iPhone 15 Pro" -> "IPHONE-15"
 * e.g., "Ergonomic Office Chair" -> "OFFICE-CHAIR"
 * Non-alphanumeric characters are converted to hyphens; multiple hyphens are collapsed.
 */
export function deriveProductPrefix(productName: string, maxLength = 16): string {
  if (!productName || !productName.trim()) return 'SN'

  // Clean unicode letters and numbers
  const cleaned = productName
    .trim()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()

  if (!cleaned) return 'SN'

  if (cleaned.length <= maxLength) return cleaned

  // Take meaningful words up to maxLength
  const parts = cleaned.split('-').filter(Boolean)
  let result = ''
  for (const part of parts) {
    const candidate = result ? `${result}-${part}` : part
    if (candidate.length <= maxLength) {
      result = candidate
    } else {
      break
    }
  }

  return result || cleaned.slice(0, maxLength).replace(/-+$/, '')
}

/**
 * Derives an acronym from words in a product name.
 * e.g., "Apple iPhone 15 Pro Max" -> "AIP15PM"
 * e.g., "PlayStation 5 Console" -> "PS5C"
 */
export function deriveProductAcronym(productName: string): string {
  if (!productName || !productName.trim()) return 'SN'

  // Split on spaces, punctuation, or camelCase transitions (e.g. PlayStation -> Play Station)
  const expanded = productName.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
  const tokens = expanded
    .trim()
    .split(/[\s\-_,./\\#]+/)
    .filter(Boolean)

  if (!tokens.length) return 'SN'

  const acronym = tokens
    .map((token) => {
      // If token is numeric (like "15" or "2024" or "5"), keep the number
      if (/^\d+$/.test(token)) return token
      if (/^\d+[a-zA-Z]+$/i.test(token) || /^[a-zA-Z]+\d+$/i.test(token)) {
        return token.toUpperCase()
      }
      return token.charAt(0).toUpperCase()
    })
    .join('')

  return acronym.slice(0, 12) || 'SN'
}

/**
 * Formats a date stamp (e.g., 20260928 or 2609)
 */
export function formatDateStamp(
  date: Date = new Date(),
  format: 'YYYYMMDD' | 'YYMM' | 'none' = 'YYYYMMDD'
): string {
  if (format === 'none') return ''
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  if (format === 'YYMM') {
    return `${yyyy.slice(2)}${mm}`
  }

  return `${yyyy}${mm}${dd}`
}

/**
 * Generates an array of serial numbers according to specified parameters.
 * Guarantees uniqueness and prevents collisions with any existing serials.
 */
export function generateSerials(options: GenerateSerialsOptions): string[] {
  const {
    productName,
    count,
    prefix,
    includeDate = false,
    date = new Date(),
    dateFormat = 'YYYYMMDD',
    separator = '-',
    startSequence = 1,
    paddingDigits = 3,
    existingSerials = [],
  } = options

  if (count <= 0) return []

  // Resolve prefix: user specified or derived from product name
  const resolvedPrefix = (
    prefix !== undefined ? prefix.trim() : deriveProductPrefix(productName)
  ).toUpperCase()

  const sep = separator ?? '-'

  let base = resolvedPrefix
  if (includeDate) {
    const stamp = formatDateStamp(date, dateFormat)
    if (stamp) {
      base = base ? `${base}${sep}${stamp}` : stamp
    }
  }

  const existingSet = new Set(existingSerials.map((s) => s.trim().toUpperCase()))
  const results: string[] = []
  let seq = Math.max(1, startSequence)

  // Cap loop iterations to prevent runaway in edge cases
  const maxIterations = count * 10 + 5000
  let iterations = 0

  while (results.length < count && iterations < maxIterations) {
    iterations++
    const padded = String(seq).padStart(paddingDigits, '0')
    const candidate = base ? `${base}${sep}${padded}` : padded

    if (!existingSet.has(candidate.toUpperCase())) {
      results.push(candidate)
      existingSet.add(candidate.toUpperCase())
    }
    seq++
  }

  return results
}

/**
 * Quick 1-click generator for line items.
 * Uses the product name slug + sequence padding.
 */
export function generateDefaultSerialsForProduct(
  productName: string,
  count: number,
  existingSerials: string[] = []
): string[] {
  return generateSerials({
    productName,
    count,
    prefix: deriveProductPrefix(productName),
    includeDate: false,
    separator: '-',
    startSequence: 1,
    paddingDigits: 3,
    existingSerials,
  })
}
