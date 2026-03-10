import { addMonths } from 'date-fns';

/**
 * Calculates the end date for a subscription plan based on the duration in months.
 * @param startDate The date the subscription starts.
 * @param durationMonths The duration of the plan in months (e.g., 1, 3, 6, 12).
 * @returns The calculated end date.
 */
export function calculateEndDate(startDate: Date, durationMonths: number): Date {
  return addMonths(startDate, durationMonths);
}

/**
 * Validates if a subscription record is active based on its status and end date.
 * @param status The status of the subscription ('new', 'paid', 'canceled').
 * @param endDate The date the subscription expires.
 * @returns True if the subscription is active.
 */
export function isSubscriptionActive(status: string, endDate: Date | null): boolean {
  if (status !== 'paid') return false;
  if (!endDate) return false;
  return new Date() <= endDate;
}
