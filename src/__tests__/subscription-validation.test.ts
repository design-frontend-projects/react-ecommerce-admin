import { describe, it, expect } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { isSubscriptionActiveTemporal } from '@/lib/subscription_utils'

describe('Subscription Logic', () => {
  it('identifies an active subscription', () => {
    const today = Temporal.Now.plainDateISO()
    const tomorrowStr = today.add({ days: 1 }).toString()
    const yesterdayStr = today.subtract({ days: 1 }).toString()

    const isActive = isSubscriptionActiveTemporal('paid', yesterdayStr, tomorrowStr)
    expect(isActive).toBe(true)
  })

  it('identifies an expired subscription', () => {
    const today = Temporal.Now.plainDateISO()
    const twoDaysAgo = today.subtract({ days: 2 }).toString()
    const yesterdayStr = today.subtract({ days: 1 }).toString()

    const isActive = isSubscriptionActiveTemporal('paid', twoDaysAgo, yesterdayStr)
    expect(isActive).toBe(false)
  })

  it('identifies an inactive status', () => {
    const today = Temporal.Now.plainDateISO()
    const tomorrowStr = today.add({ days: 1 }).toString()
    const yesterdayStr = today.subtract({ days: 1 }).toString()

    const isActive = isSubscriptionActiveTemporal('canceled', yesterdayStr, tomorrowStr)
    expect(isActive).toBe(false)
  })
})
