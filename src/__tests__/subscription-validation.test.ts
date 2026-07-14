import { describe, it, expect } from 'vitest'

describe('Subscription Logic', () => {
  it('identifies an active subscription', () => {
    const subscription = {
      status: 'paid',
      end_date: new Date(Date.now() + 1000000).toISOString(),
    }

    const now = new Date()
    const endDate = new Date(subscription.end_date)
    const isActive = subscription.status === 'paid' && endDate > now

    expect(isActive).toBe(true)
  })

  it('identifies an expired subscription', () => {
    const subscription = {
      status: 'paid',
      end_date: new Date(Date.now() - 1000000).toISOString(),
    }

    const now = new Date()
    const endDate = new Date(subscription.end_date)
    const isActive = subscription.status === 'paid' && endDate > now

    expect(isActive).toBe(false)
  })

  it('identifies an inactive status', () => {
    const subscription = {
      status: 'canceled',
      end_date: new Date(Date.now() + 1000000).toISOString(),
    }

    const now = new Date()
    const endDate = new Date(subscription.end_date)
    const isActive = subscription.status === 'paid' && endDate > now

    expect(isActive).toBe(false)
  })
})
