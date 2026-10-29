import { Temporal } from '@js-temporal/polyfill'

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  'paid',
  'active',
  'trial',
  'grace_period',
] as const

export function isActiveSubscriptionStatus(
  status: string | null | undefined
): boolean {
  if (!status) return false
  return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    status.toLowerCase()
  )
}

/**
 * Calculates the end date for a subscription plan based on the duration in months using JS Temporal.
 * @param startDate The date the subscription starts.
 * @param durationMonths The duration of the plan in months (e.g., 1, 3, 6, 12).
 * @returns The calculated end date.
 */
export function calculateEndDate(
  startDate: Date | string | Temporal.PlainDate = new Date(),
  durationMonths: number = 1
): Date {
  const plainDate = toPlainDate(startDate)
  const resultPlainDate = plainDate.add({ months: Math.max(1, durationMonths) })
  return new Date(resultPlainDate.toString() + 'T00:00:00.000Z')
}

/**
 * Validates if a subscription record is active based on its status and end date using Temporal.
 * @param status The status of the subscription ('new', 'paid', 'active', 'trial', 'grace_period', 'canceled', etc.).
 * @param endDate The date the subscription expires.
 * @returns True if the subscription is active.
 */
export function isSubscriptionActive(
  status: string,
  endDate: Date | string | null
): boolean {
  if (!isActiveSubscriptionStatus(status)) return false
  if (!endDate) return false
  const today = Temporal.Now.plainDateISO()
  const endPlain = toPlainDate(endDate)
  return Temporal.PlainDate.compare(today, endPlain) <= 0
}

/**
 * Converts a Date, ISO string, or Temporal.PlainDate to Temporal.PlainDate.
 */
export function toPlainDate(
  date: string | Date | Temporal.PlainDate
): Temporal.PlainDate {
  if (date instanceof Temporal.PlainDate) {
    return date
  }
  if (date instanceof Date) {
    return Temporal.PlainDate.from(date.toISOString().split('T')[0])
  }
  const str = date.includes('T') ? date.split('T')[0] : date
  return Temporal.PlainDate.from(str)
}

/**
 * Calculates the end date from today's date plus the duration in months using JavaScript Temporal.
 * @param durationMonths Duration in months.
 * @returns Calculated end date as a Temporal.PlainDate.
 */
export function calculateEndDateFromTodayTemporal(
  durationMonths: number
): Temporal.PlainDate {
  const today = Temporal.Now.plainDateISO()
  return today.add({ months: durationMonths })
}

/**
 * Checks if the subscription status is active and not expired, using JavaScript Temporal.
 * Checks that current date is between start_date and end_date (inclusive).
 * @param status The status of the subscription (e.g., 'paid', 'active', 'trial').
 * @param startDate The start date of the subscription.
 * @param endDate The end date of the subscription.
 * @returns True if the subscription is active and not expired.
 */
export function isSubscriptionActiveTemporal(
  status: string,
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): boolean {
  if (!isActiveSubscriptionStatus(status)) return false
  if (!startDate || !endDate) return false

  const today = Temporal.Now.plainDateISO()
  const start = toPlainDate(startDate)
  const end = toPlainDate(endDate)

  return (
    Temporal.PlainDate.compare(today, start) >= 0 &&
    Temporal.PlainDate.compare(today, end) <= 0
  )
}

export interface SubscriptionExpirationInfo {
  daysRemaining: number
  totalCycleDays: number
  elapsedDays: number
  progressPercentage: number
  isExpired: boolean
  isExpiringSoon: boolean
  isActive: boolean
}

/**
 * Computes detailed expiration metrics for a subscription using Temporal.
 */
export function getSubscriptionExpirationInfo(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  status: string | null | undefined
): SubscriptionExpirationInfo {
  if (!endDate) {
    return {
      daysRemaining: 0,
      totalCycleDays: 0,
      elapsedDays: 0,
      progressPercentage: 0,
      isExpired: false,
      isExpiringSoon: false,
      isActive: false,
    }
  }

  const today = Temporal.Now.plainDateISO()
  const end = toPlainDate(endDate)
  const start = startDate ? toPlainDate(startDate) : today

  const daysRemaining = today.until(end, { largestUnit: 'days' }).days
  const totalCycleDays = Math.max(
    1,
    start.until(end, { largestUnit: 'days' }).days
  )
  const elapsedDays = Math.max(
    0,
    Math.min(totalCycleDays, start.until(today, { largestUnit: 'days' }).days)
  )
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((elapsedDays / totalCycleDays) * 100))
  )
  const isExpired = daysRemaining < 0 || status === 'expired'
  const isActive =
    isActiveSubscriptionStatus(status) && !isExpired && daysRemaining >= 0
  const isExpiringSoon = isActive && daysRemaining <= 7

  return {
    daysRemaining: Math.max(0, daysRemaining),
    totalCycleDays,
    elapsedDays,
    progressPercentage,
    isExpired,
    isExpiringSoon,
    isActive,
  }
}

/**
 * Checks if a user already has a subscription from tenant_subscriptions and if it's active.
 * Uses JavaScript Temporal.
 * @param tenantSubscription The user's tenant subscription record.
 * @returns True if active and not expired.
 */
export function checkUserSubscriptionTemporal(
  tenantSubscription:
    | {
        status: string
        start_date: Date | string | null
        end_date: Date | string | null
        subscriptions?: {
          duration_months: number
        } | null
      }
    | null
    | undefined
): boolean {
  if (!tenantSubscription) return false
  return isSubscriptionActiveTemporal(
    tenantSubscription.status,
    tenantSubscription.start_date,
    tenantSubscription.end_date
  )
}
