import { useSettingsStore } from '@/features/settings/data/store'

/**
 * Currency formatting utilities that use the global settings store.
 *
 * Usage:
 * ```tsx
 * // In React component:
 * const { formatCurrency } = useFormatters()
 * return <span>{formatCurrency(42.99)}</span>
 *
 * // Outside React (reads store directly):
 * import { formatCurrencyFromStore } from '@/lib/formatters'
 * console.log(formatCurrencyFromStore(42.99))
 * ```
 */

// ─── Standalone (non-hook) formatters ──────────────────────────────

/**
 * Format a number as currency using the global settings store.
 * Can be used outside React components.
 */
export function formatCurrencyFromStore(
  amount: number | string | null | undefined
): string {
  const currency = useSettingsStore.getState().localization.currency || 'USD'
  const language = useSettingsStore.getState().localization.language || 'en'
  return formatCurrencyWith(amount, currency, language)
}

/**
 * Format a date using the global settings store date format.
 */
export function formatDateFromStore(
  date: Date | string | null | undefined
): string {
  const dateFormat = useSettingsStore.getState().localization.date_format
  const language = useSettingsStore.getState().localization.language || 'en'
  return formatDateWith(date, dateFormat, language)
}

// ─── React Hook ────────────────────────────────────────────────────

/**
 * Hook that returns formatters using the current settings.
 * Reactively updates when settings change.
 */
export function useFormatters() {
  const { currency, date_format, language } = useSettingsStore(
    (s) => s.localization
  )

  return {
    formatCurrency: (amount: number | string | null | undefined) =>
      formatCurrencyWith(amount, currency, language),

    formatDate: (date: Date | string | null | undefined) =>
      formatDateWith(date, date_format, language),

    currency,
    dateFormat: date_format,
    language,
  }
}

// ─── Internal helpers ──────────────────────────────────────────────

function formatCurrencyWith(
  amount: number | string | null | undefined,
  currency: string,
  locale: string
): string {
  if (amount === null || amount === undefined) return formatZero(currency, locale)
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numericAmount)) return formatZero(currency, locale)

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(numericAmount)
  } catch {
    // Fallback if currency code is invalid
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numericAmount)
  }
}

function formatZero(currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(0)
  } catch {
    return '$0.00'
  }
}

function formatDateWith(
  date: Date | string | null | undefined,
  _format: string,
  locale: string
): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  } catch {
    return d.toLocaleDateString()
  }
}
