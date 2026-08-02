import { describe, test, expect } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { isSubscriptionActiveTemporal } from '../lib/subscription_utils'

describe('Subscription Guard Logic', () => {
  test('should allow access for paid subscription that is not expired', () => {
    const today = Temporal.Now.plainDateISO()
    const startDate = today.subtract({ days: 1 }).toString()
    const endDate = today.add({ days: 1 }).toString()
    expect(isSubscriptionActiveTemporal('paid', startDate, endDate)).toBe(true)
  })

  test('should deny access for new status', () => {
    const today = Temporal.Now.plainDateISO()
    const startDate = today.subtract({ days: 1 }).toString()
    const endDate = today.add({ days: 1 }).toString()
    expect(isSubscriptionActiveTemporal('new', startDate, endDate)).toBe(false)
  })

  test('should deny access for expired subscription', () => {
    const today = Temporal.Now.plainDateISO()
    const startDate = today.subtract({ days: 10 }).toString()
    const endDate = today.subtract({ days: 1 }).toString()
    expect(isSubscriptionActiveTemporal('paid', startDate, endDate)).toBe(false)
  })

  test('should deny access for canceled status', () => {
    const today = Temporal.Now.plainDateISO()
    const startDate = today.subtract({ days: 1 }).toString()
    const endDate = today.add({ days: 1 }).toString()
    expect(isSubscriptionActiveTemporal('canceled', startDate, endDate)).toBe(false)
  })
})
