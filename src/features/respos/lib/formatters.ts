// ResPOS Formatting Utilities

/**
 * Format currency to Egyptian Pound
 */
export function formatCurrency(amount: number, locale = 'en-EG'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date to localized string
 */
export function formatDate(date: string | Date, locale = 'en-EG'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Format time to localized string
 */
export function formatTime(time: string | Date, locale = 'en-EG'): string {
  const d = typeof time === 'string' ? new Date(`1970-01-01T${time}`) : time
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: string | Date, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return rtf.format(-diffMins, 'minute')
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  return rtf.format(-diffDays, 'day')
}

/**
 * Generate order number
 */
export function generateOrderNumber(prefix = 'ORD'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}${random}`
}

/**
 * Format table number with status indicator
 */
export function formatTableDisplay(tableNumber: string, seats: number): string {
  return `${tableNumber} (${seats} seats)`
}

/**
 * Calculate elapsed time in minutes
 */
export function getElapsedMinutes(startTime: string | Date): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / 60000)
}

/**
 * Format elapsed time for kitchen display
 */
export function formatElapsedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

/**
 * Calculate order total from items
 */
export function calculateOrderTotal(
  items: Array<{ unit_price: number; quantity: number }>,
  taxRate: number = 0.14,
  discountAmount: number = 0,
  tipAmount: number = 0
): {
  subtotal: number
  tax: number
  total: number
} {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  )
  const taxableAmount = subtotal - discountAmount
  const tax = taxableAmount * taxRate
  const total = taxableAmount + tax + tipAmount

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}
