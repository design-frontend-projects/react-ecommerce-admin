import { Temporal } from '@js-temporal/polyfill'
import { expect, test, describe } from 'vitest'
import {
  calculateEndDate,
  isSubscriptionActive,
  calculateEndDateFromTodayTemporal,
  isSubscriptionActiveTemporal,
  checkUserSubscriptionTemporal,
} from '../lib/subscription_utils'

describe('Subscription Logic', () => {
  test('calculateEndDate correctly adds months using Temporal', () => {
    const startDate = new Date('2026-03-10')
    const endDate = calculateEndDate(startDate, 1)
    expect(endDate.toISOString().split('T')[0]).toBe('2026-04-10')
  })

  test('calculateEndDate handles leap years correctly', () => {
    const startDate = new Date('2024-02-29') // Leap year
    const endDate = calculateEndDate(startDate, 12)
    expect(endDate.getUTCFullYear()).toBe(2025)
    expect(endDate.getUTCMonth()).toBe(1) // February
    expect(endDate.getUTCDate()).toBe(28) // Not a leap year next year
  })

  test('isSubscriptionActive correctly determines if a subscription is valid using Temporal', () => {
    const today = Temporal.Now.plainDateISO()
    const tomorrow = new Date(today.add({ days: 1 }).toString() + 'T00:00:00.000Z')
    const yesterday = new Date(today.subtract({ days: 1 }).toString() + 'T00:00:00.000Z')

    expect(isSubscriptionActive('paid', tomorrow)).toBe(true)
    expect(isSubscriptionActive('new', tomorrow)).toBe(false)
    expect(isSubscriptionActive('canceled', tomorrow)).toBe(false)
    expect(isSubscriptionActive('paid', yesterday)).toBe(false)
    expect(isSubscriptionActive('paid', null)).toBe(false)
  })

  test('calculateEndDateFromTodayTemporal correctly calculates end date using Temporal', () => {
    const calculated = calculateEndDateFromTodayTemporal(3)
    const today = Temporal.Now.plainDateISO()
    const expected = today.add({ months: 3 })

    expect(calculated.toString()).toBe(expected.toString())
  })

  test('isSubscriptionActiveTemporal correctly determines active/inactive subscriptions using Temporal', () => {
    const todayStr = Temporal.Now.plainDateISO().toString()
    const yesterdayStr = Temporal.Now.plainDateISO()
      .subtract({ days: 1 })
      .toString()
    const tomorrowStr = Temporal.Now.plainDateISO().add({ days: 1 }).toString()
    const lastMonthStr = Temporal.Now.plainDateISO()
      .subtract({ months: 1 })
      .toString()
    const nextMonthStr = Temporal.Now.plainDateISO()
      .add({ months: 1 })
      .toString()

    // Active subscription (today lies between start and end)
    expect(
      isSubscriptionActiveTemporal('paid', lastMonthStr, nextMonthStr)
    ).toBe(true)
    expect(isSubscriptionActiveTemporal('paid', todayStr, todayStr)).toBe(true)

    // Future subscription (start date is in the future)
    expect(
      isSubscriptionActiveTemporal('paid', tomorrowStr, nextMonthStr)
    ).toBe(false)

    // Expired subscription (end date is in the past)
    expect(
      isSubscriptionActiveTemporal('paid', lastMonthStr, yesterdayStr)
    ).toBe(false)

    // Inactive status
    expect(
      isSubscriptionActiveTemporal('new', lastMonthStr, nextMonthStr)
    ).toBe(false)
    expect(
      isSubscriptionActiveTemporal('canceled', lastMonthStr, nextMonthStr)
    ).toBe(false)

    // Null dates
    expect(isSubscriptionActiveTemporal('paid', null, nextMonthStr)).toBe(false)
    expect(isSubscriptionActiveTemporal('paid', lastMonthStr, null)).toBe(false)
  })

  test('checkUserSubscriptionTemporal correctly validates tenant_subscriptions structure', () => {
    const lastMonthStr = Temporal.Now.plainDateISO()
      .subtract({ months: 1 })
      .toString()
    const nextMonthStr = Temporal.Now.plainDateISO()
      .add({ months: 1 })
      .toString()

    const activeTenantSub = {
      status: 'paid',
      start_date: lastMonthStr,
      end_date: nextMonthStr,
    }

    const expiredTenantSub = {
      status: 'paid',
      start_date: lastMonthStr,
      end_date: lastMonthStr,
    }

    expect(checkUserSubscriptionTemporal(activeTenantSub)).toBe(true)
    expect(checkUserSubscriptionTemporal(expiredTenantSub)).toBe(false)
    expect(checkUserSubscriptionTemporal(null)).toBe(false)
  })
})
