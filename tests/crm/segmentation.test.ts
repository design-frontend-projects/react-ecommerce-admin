import { describe, it, expect, vi, beforeEach } from 'vitest'
import { determineSegment } from '@/services/crm/segmenter'
import { Temporal } from '@js-temporal/polyfill'

describe('CRM Segmentation Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-26T12:00:00Z'))
  })

  it('should classify as VIP if spend is > $500 in last 30 days', () => {
    const today = Temporal.Now.plainDateISO()
    const customer = {
      customer_id: 1,
      created_at: today.subtract({ months: 2 }).toString(),
      last_active_at: today.toString(),
    }
    const sales = [
      { sale_date: today.subtract({ days: 10 }).toString(), total_amount: 300 },
      { sale_date: today.subtract({ days: 20 }).toString(), total_amount: 250 },
    ]

    expect(determineSegment(customer, sales)).toBe('VIP')
  })

  it('should classify as frequent if >= 3 orders in last 30 days but spend <= $500', () => {
    const today = Temporal.Now.plainDateISO()
    const customer = {
      customer_id: 2,
      created_at: today.subtract({ months: 2 }).toString(),
      last_active_at: today.toString(),
    }
    const sales = [
      { sale_date: today.subtract({ days: 10 }).toString(), total_amount: 50 },
      { sale_date: today.subtract({ days: 15 }).toString(), total_amount: 50 },
      { sale_date: today.subtract({ days: 20 }).toString(), total_amount: 50 },
    ]

    expect(determineSegment(customer, sales)).toBe('frequent')
  })

  it('should classify as new if created in last 30 days without hitting VIP/frequent thresholds', () => {
    const today = Temporal.Now.plainDateISO()
    const customer = {
      customer_id: 3,
      created_at: today.subtract({ days: 10 }).toString(),
      last_active_at: today.toString(),
    }
    const sales = [
      { sale_date: today.subtract({ days: 5 }).toString(), total_amount: 100 },
    ]

    expect(determineSegment(customer, sales)).toBe('new')
  })

  it('should classify as inactive if last_active_at is older than 6 months', () => {
    const today = Temporal.Now.plainDateISO()
    const customer = {
      customer_id: 4,
      created_at: today.subtract({ months: 12 }).toString(),
      last_active_at: today.subtract({ months: 7 }).toString(),
    }
    const sales = [
      { sale_date: today.subtract({ months: 8 }).toString(), total_amount: 1000 },
    ]

    expect(determineSegment(customer, sales)).toBe('inactive')
  })

  it('should fallback to active for regular customers', () => {
    const today = Temporal.Now.plainDateISO()
    const customer = {
      customer_id: 5,
      created_at: today.subtract({ months: 3 }).toString(),
      last_active_at: today.subtract({ days: 2 }).toString(),
    }
    const sales = [
      { sale_date: today.subtract({ days: 2 }).toString(), total_amount: 50 },
    ]

    expect(determineSegment(customer, sales)).toBe('active')
  })
})
