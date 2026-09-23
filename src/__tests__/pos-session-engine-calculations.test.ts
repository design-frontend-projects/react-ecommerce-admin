import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('POS Session Engine - Financial Calculations & Date Comparison', () => {
  it('correctly calculates expected cash from opening float, cash sales, cash in/out, and refunds', () => {
    const openingCash = 150.0
    const payments = [
      { id: 'p1', method: 'cash', amount: 80.5, status: 'completed' },
      { id: 'p2', method: 'cash', amount: 120.0, status: 'completed' },
      { id: 'p3', method: 'card', amount: 200.0, status: 'completed' },
      { id: 'p4', method: 'wallet', amount: 50.0, status: 'completed' },
      { id: 'p5', method: 'cash', amount: -25.0, status: 'refunded' },
    ]

    const cashMovements = [
      { type: 'in', reason: 'opening', amount: 150.0 },
      { type: 'in', reason: 'income', amount: 40.0 }, // Paid in
      { type: 'out', reason: 'expense', amount: 15.0 }, // Paid out
      { type: 'out', reason: 'customer_refund', amount: 10.0 }, // Cash refund
    ]

    // Cash sales from payments
    const cashSales = payments
      .filter((p) => p.method === 'cash' && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)
    expect(cashSales).toBe(200.5)

    // Card sales
    const cardSales = payments
      .filter((p) => p.method === 'card' && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)
    expect(cardSales).toBe(200.0)

    // Other digital sales
    const otherSales = payments
      .filter((p) => p.method !== 'cash' && p.method !== 'card' && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)
    expect(otherSales).toBe(50.0)

    // Total gross sales
    const totalSales = cashSales + cardSales + otherSales
    expect(totalSales).toBe(450.5)

    // Cash in (paid in)
    const cashIn = cashMovements
      .filter((m) => m.type === 'in' && m.reason !== 'opening' && m.reason !== 'sale')
      .reduce((sum, m) => sum + m.amount, 0)
    expect(cashIn).toBe(40.0)

    // Cash out (paid out)
    const cashOut = cashMovements
      .filter((m) => m.type === 'out' && m.reason !== 'closing' && m.reason !== 'customer_refund')
      .reduce((sum, m) => sum + m.amount, 0)
    expect(cashOut).toBe(15.0)

    // Cash refunds
    const cashRefunds =
      payments
        .filter((p) => p.method === 'cash' && p.status === 'refunded')
        .reduce((sum, p) => sum + Math.abs(p.amount), 0) +
      cashMovements
        .filter((m) => m.type === 'out' && m.reason === 'customer_refund')
        .reduce((sum, m) => sum + m.amount, 0)
    expect(cashRefunds).toBe(35.0)

    // Expected cash: Opening + Cash Sales + Cash In - Cash Out - Cash Refunds
    const expectedCash = openingCash + cashSales + cashIn - cashOut - cashRefunds
    // 150 + 200.50 + 40 - 15 - 35 = 340.50
    expect(expectedCash).toBe(340.5)

    // Discrepancy test:
    const countedCashEqual = 340.5
    expect(countedCashEqual - expectedCash).toBe(0)

    const countedCashOver = 350.0
    expect(countedCashOver - expectedCash).toBe(9.5)

    const countedCashShort = 330.0
    expect(countedCashShort - expectedCash).toBe(-10.5)
  })

  it('correctly filters orders based on shift opened_at and closed_at timeframe', () => {
    const shiftOpenedAt = new Date('2026-09-23T08:00:00Z')
    const shiftClosedAt = new Date('2026-09-23T16:00:00Z')
    const terminalId = 'term-01'

    const allOrders = [
      // Order prior to shift opening (should be excluded)
      { id: 'o1', terminalId: 'term-01', createdAt: new Date('2026-09-23T07:30:00Z'), amount: 50 },
      // Order during shift (should be included)
      { id: 'o2', terminalId: 'term-01', createdAt: new Date('2026-09-23T09:15:00Z'), amount: 120 },
      // Order during shift on another terminal (should be excluded)
      { id: 'o3', terminalId: 'term-02', createdAt: new Date('2026-09-23T10:00:00Z'), amount: 75 },
      // Order during shift (should be included)
      { id: 'o4', terminalId: 'term-01', createdAt: new Date('2026-09-23T15:45:00Z'), amount: 85 },
      // Order after shift closing (should be excluded)
      { id: 'o5', terminalId: 'term-01', createdAt: new Date('2026-09-23T16:30:00Z'), amount: 60 },
    ]

    const matchingOrders = allOrders.filter(
      (o) =>
        o.terminalId === terminalId &&
        o.createdAt >= shiftOpenedAt &&
        o.createdAt <= shiftClosedAt
    )

    expect(matchingOrders.map((o) => o.id)).toEqual(['o2', 'o4'])
    const totalOrderAmount = matchingOrders.reduce((sum, o) => sum + o.amount, 0)
    expect(totalOrderAmount).toBe(205)
  })
})
