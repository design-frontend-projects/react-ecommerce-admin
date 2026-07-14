import { addMonths } from 'date-fns'
import { Temporal } from '@js-temporal/polyfill'

/**
 * Calculates the end date for a subscription plan based on the duration in months.
 * @param startDate The date the subscription starts.
 * @param durationMonths The duration of the plan in months (e.g., 1, 3, 6, 12).
 * @returns The calculated end date.
 */
export function calculateEndDate(
  startDate: Date,
  durationMonths: number
): Date {
  return addMonths(startDate, durationMonths)
}

/**
 * Validates if a subscription record is active based on its status and end date.
 * @param status The status of the subscription ('new', 'paid', 'canceled').
 * @param endDate The date the subscription expires.
 * @returns True if the subscription is active.
 */
export function isSubscriptionActive(
  status: string,
  endDate: Date | null
): boolean {
  if (status !== 'paid') return false
  if (!endDate) return false
  return new Date() <= endDate
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
 * @param status The status of the subscription (e.g., 'paid').
 * @param startDate The start date of the subscription.
 * @param endDate The end date of the subscription.
 * @returns True if the subscription is active and not expired.
 */
export function isSubscriptionActiveTemporal(
  status: string,
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): boolean {
  if (status !== 'paid') return false
  if (!startDate || !endDate) return false

  const today = Temporal.Now.plainDateISO()
  const start = toPlainDate(startDate)
  const end = toPlainDate(endDate)

  return (
    Temporal.PlainDate.compare(today, start) >= 0 &&
    Temporal.PlainDate.compare(today, end) <= 0
  )
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
