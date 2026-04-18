import { describe, expect, it } from 'vitest'
import { buildShiftDashboardAnalytics } from '../dashboard-api'

const DAY_MS = 24 * 60 * 60 * 1000

describe('buildShiftDashboardAnalytics', () => {
  it('applies rolling-window filtering for sales, refunds, and details', () => {
    const now = new Date('2026-04-18T12:00:00.000Z')

    const analytics = buildShiftDashboardAnalytics({
      range: 7,
      now,
      salesTransactions: [
        {
          id: 'tx-in',
          transaction_number: 'TX-IN',
          transaction_type: 'sale',
          status: 'completed',
          total_amount: 100,
          created_at: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
        },
        {
          id: 'tx-old',
          transaction_number: 'TX-OLD',
          transaction_type: 'sale',
          status: 'completed',
          total_amount: 60,
          created_at: new Date(now.getTime() - 8 * DAY_MS).toISOString(),
        },
      ],
      refundRows: [
        {
          refund_id: 1,
          order_id: 'TX-IN',
          refund_date: new Date(now.getTime() - DAY_MS).toISOString(),
          refund_amount: 20,
          reason: null,
        },
        {
          refund_id: 2,
          order_id: 'TX-OLD',
          refund_date: new Date(now.getTime() - 10 * DAY_MS).toISOString(),
          refund_amount: 10,
          reason: null,
        },
      ],
      transactionDetails: [
        {
          id: 'd1',
          transaction_id: 'tx-in',
          product_id: 11,
          quantity: 2,
          unit_price: 50,
          subtotal: 100,
          products: { name: 'Cola', sku: 'COLA-001' },
        },
        {
          id: 'd2',
          transaction_id: 'tx-old',
          product_id: 22,
          quantity: 5,
          unit_price: 12,
          subtotal: 60,
          products: { name: 'Water', sku: 'WATER-001' },
        },
      ],
    })

    expect(analytics.kpis.grossSales).toBe(100)
    expect(analytics.kpis.refundAmount).toBe(20)
    expect(analytics.kpis.netSales).toBe(80)
    expect(analytics.kpis.orderCount).toBe(1)
    expect(analytics.kpis.itemsSold).toBe(2)
    expect(analytics.kpis.refundCount).toBe(1)
    expect(analytics.topProducts).toHaveLength(1)
    expect(analytics.topProducts[0].productId).toBe(11)
  })

  it('uses hybrid-safe refund strategy without double counting refund totals', () => {
    const now = new Date('2026-04-18T12:00:00.000Z')

    const analytics = buildShiftDashboardAnalytics({
      range: 1,
      now,
      salesTransactions: [
        {
          id: 'tx-sale',
          transaction_number: 'TX-SALE',
          transaction_type: 'sale',
          status: 'completed',
          total_amount: 200,
          created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'tx-refund-row',
          transaction_number: 'REF-TX-SALE',
          transaction_type: 'refund',
          status: 'completed',
          total_amount: -50,
          created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        },
      ],
      refundRows: [
        {
          refund_id: 99,
          order_id: 'TX-SALE',
          refund_date: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
          refund_amount: 50,
          reason: 'Damaged',
        },
      ],
      transactionDetails: [
        {
          id: 'sd1',
          transaction_id: 'tx-sale',
          product_id: 101,
          quantity: 4,
          unit_price: 50,
          subtotal: 200,
          products: { name: 'Pizza', sku: 'PIZZA-L' },
        },
      ],
    })

    expect(analytics.kpis.grossSales).toBe(200)
    expect(analytics.kpis.refundAmount).toBe(50)
    expect(analytics.kpis.netSales).toBe(150)
    expect(analytics.kpis.orderCount).toBe(1)
    expect(analytics.kpis.refundCount).toBe(1)
  })

  it('fills missing trend buckets with zeros for 1D and 15D', () => {
    const now = new Date('2026-04-18T12:00:00.000Z')

    const analytics1d = buildShiftDashboardAnalytics({
      range: 1,
      now,
      salesTransactions: [],
      refundRows: [],
      transactionDetails: [],
    })

    const analytics15d = buildShiftDashboardAnalytics({
      range: 15,
      now,
      salesTransactions: [],
      refundRows: [],
      transactionDetails: [],
    })

    expect(analytics1d.trend).toHaveLength(24)
    expect(analytics1d.trend.every((point) => point.net === 0)).toBe(true)

    expect(analytics15d.trend).toHaveLength(15)
    expect(analytics15d.trend.every((point) => point.sales === 0)).toBe(true)
    expect(analytics15d.trend.every((point) => point.refunds === 0)).toBe(true)
  })

  it('aggregates top products by quantity and revenue from transaction details', () => {
    const now = new Date('2026-04-18T12:00:00.000Z')

    const analytics = buildShiftDashboardAnalytics({
      range: 30,
      now,
      salesTransactions: [
        {
          id: 's1',
          transaction_number: 'S1',
          transaction_type: 'sale',
          status: 'completed',
          total_amount: 35,
          created_at: new Date(now.getTime() - DAY_MS).toISOString(),
        },
      ],
      refundRows: [],
      transactionDetails: [
        {
          id: 'l1',
          transaction_id: 's1',
          product_id: 1,
          quantity: 1,
          unit_price: 10,
          subtotal: 10,
          products: { name: 'Burger', sku: 'BURGER' },
        },
        {
          id: 'l2',
          transaction_id: 's1',
          product_id: 1,
          quantity: 2,
          unit_price: 10,
          subtotal: 20,
          products: { name: 'Burger', sku: 'BURGER' },
        },
        {
          id: 'l3',
          transaction_id: 's1',
          product_id: 2,
          quantity: 1,
          unit_price: 5,
          subtotal: 5,
          products: { name: 'Fries', sku: 'FRIES' },
        },
      ],
    })

    expect(analytics.topProducts).toHaveLength(2)
    expect(analytics.topProducts[0].productId).toBe(1)
    expect(analytics.topProducts[0].quantitySold).toBe(3)
    expect(analytics.topProducts[0].revenue).toBe(30)
    expect(analytics.topProducts[1].productId).toBe(2)
  })
})
