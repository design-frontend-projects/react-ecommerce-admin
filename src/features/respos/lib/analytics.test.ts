import { describe, expect, it } from 'vitest'
import { buildRestaurantAnalytics, filterOrdersByDays } from './analytics'
import type { ResFloor, ResTable } from '../types'

const NOW = new Date('2026-04-18T12:00:00.000Z')

const floors: ResFloor[] = [
  {
    id: 'f1',
    name: 'Main Floor',
    description: undefined,
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'f2',
    name: 'Terrace',
    description: undefined,
    sort_order: 2,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
]

const tables: ResTable[] = [
  {
    id: 't1',
    floor_id: 'f1',
    table_number: 'T1',
    seats: 4,
    status: 'occupied',
    position_x: 0,
    position_y: 0,
    shape: 'square',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't2',
    floor_id: 'f2',
    table_number: 'T2',
    seats: 4,
    status: 'free',
    position_x: 1,
    position_y: 1,
    shape: 'square',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
]

const orders = [
  {
    status: 'paid',
    table_id: 't1',
    total_amount: 100,
    created_at: '2026-04-18T08:00:00.000Z',
    paid_at: '2026-04-18T08:10:00.000Z',
    table: { id: 't1', table_number: 'T1', floor_id: 'f1' },
    order_items: [{ quantity: 2, unit_price: 50, menu_item: { name: 'Burger' } }],
  },
  {
    status: 'open',
    table_id: 't1',
    total_amount: 80,
    created_at: '2026-04-15T10:00:00.000Z',
    table: { id: 't1', table_number: 'T1', floor_id: 'f1' },
    order_items: [{ quantity: 1, unit_price: 80, menu_item: { name: 'Pizza' } }],
  },
  {
    status: 'ready',
    table_id: 't2',
    total_amount: 40,
    created_at: '2026-04-10T09:00:00.000Z',
    table: { id: 't2', table_number: 'T2', floor_id: 'f2' },
    order_items: [{ quantity: 1, unit_price: 40, menu_item: { name: 'Burger' } }],
  },
  {
    status: 'paid',
    table_id: 't2',
    total_amount: 60,
    created_at: '2026-03-25T16:00:00.000Z',
    paid_at: '2026-03-25T16:15:00.000Z',
    table: { id: 't2', table_number: 'T2', floor_id: 'f2' },
    order_items: [{ quantity: 3, unit_price: 20, menu_item: { name: 'Salad' } }],
  },
  {
    status: 'void',
    table_id: 't1',
    total_amount: 999,
    created_at: '2026-04-16T10:00:00.000Z',
    table: { id: 't1', table_number: 'T1', floor_id: 'f1' },
    order_items: [{ quantity: 1, unit_price: 999, menu_item: { name: 'Void Item' } }],
  },
  {
    status: 'paid',
    total_amount: 30,
    created_at: '2026-04-17T19:00:00.000Z',
    paid_at: '2026-04-17T19:10:00.000Z',
    table: null,
    order_items: [{ quantity: 1, unit_price: 30, menu_item: null }],
  },
  {
    status: 'paid',
    table_id: 't1',
    total_amount: 500,
    created_at: '2026-03-10T11:00:00.000Z',
    paid_at: '2026-03-10T11:10:00.000Z',
    table: { id: 't1', table_number: 'T1', floor_id: 'f1' },
    order_items: [{ quantity: 5, unit_price: 100, menu_item: { name: 'Steak' } }],
  },
]

describe('filterOrdersByDays', () => {
  it('filters correctly for 1/7/15/30 day windows', () => {
    expect(filterOrdersByDays(orders, 1, NOW)).toHaveLength(2)
    expect(filterOrdersByDays(orders, 7, NOW)).toHaveLength(4)
    expect(filterOrdersByDays(orders, 15, NOW)).toHaveLength(5)
    expect(filterOrdersByDays(orders, 30, NOW)).toHaveLength(6)
  })
})

describe('buildRestaurantAnalytics', () => {
  it('builds KPI, floor, table and items analytics with proper status handling', () => {
    const result = buildRestaurantAnalytics({
      orders,
      floors,
      tables,
      days: 30,
      now: NOW,
    })

    expect(result.kpis.paidRevenue).toBe(190)
    expect(result.kpis.orderVolume).toBe(5)
    expect(result.kpis.itemsSold).toBe(8)
    expect(result.kpis.avgPaidOrderValue).toBeCloseTo(63.333, 2)
    expect(result.kpis.occupiedTables).toBe(1)
    expect(result.kpis.occupancyRate).toBe(50)

    const mainFloor = result.floorAnalytics.find((x) => x.floorId === 'f1')
    const terrace = result.floorAnalytics.find((x) => x.floorId === 'f2')
    const unknownFloor = result.floorAnalytics.find(
      (x) => x.floorName === 'Unknown floor'
    )

    expect(mainFloor).toBeTruthy()
    expect(mainFloor?.ordersCount).toBe(2)
    expect(mainFloor?.paidRevenue).toBe(100)
    expect(mainFloor?.occupancyRate).toBe(100)

    expect(terrace).toBeTruthy()
    expect(terrace?.ordersCount).toBe(2)
    expect(terrace?.paidRevenue).toBe(60)

    expect(unknownFloor).toBeTruthy()
    expect(unknownFloor?.ordersCount).toBe(1)
    expect(unknownFloor?.paidRevenue).toBe(30)

    expect(result.tableLeaderboard[0]).toMatchObject({
      tableName: 'T1',
      ordersCount: 2,
      paidRevenue: 100,
    })
    expect(result.tableLeaderboard[1]).toMatchObject({
      tableName: 'T2',
      ordersCount: 2,
      paidRevenue: 60,
    })

    expect(result.topItemsByQuantity[0]).toMatchObject({
      itemName: 'Burger',
      quantity: 3,
      revenue: 140,
    })
    expect(result.topItemsByRevenue[0]).toMatchObject({
      itemName: 'Burger',
      quantity: 3,
      revenue: 140,
    })

    const day18 = result.dailyRevenue.find((x) => x.date === '2026-04-18')
    const day17 = result.dailyRevenue.find((x) => x.date === '2026-04-17')
    const day25 = result.dailyRevenue.find((x) => x.date === '2026-03-25')

    expect(day18?.revenue).toBe(100)
    expect(day17?.revenue).toBe(30)
    expect(day25?.revenue).toBe(60)
    expect(result.dailyRevenue.find((x) => x.date === '2026-03-10')).toBeFalsy()
  })
})
