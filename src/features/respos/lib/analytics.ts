import {
  eachDayOfInterval,
  format,
  isValid,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns'
import type { ResFloor, ResTable } from '../types'

const UNKNOWN_FLOOR_ID = '__unknown_floor__'
const UNKNOWN_FLOOR_NAME = 'Unknown floor'
const UNKNOWN_TABLE_ID = '__unknown_table__'
const UNKNOWN_TABLE_NAME = 'Unknown table'
const UNKNOWN_ITEM_NAME = 'Unknown item'

export const PAID_STATUS = 'paid'
export const OPERATIONAL_STATUSES = new Set([
  'open',
  'in_progress',
  'ready',
  'paid',
])

export interface AnalyticsOrderItemLike {
  quantity?: number | string | null
  unit_price?: number | string | null
  menu_item?: {
    name?: string | null
  } | null
}

export interface AnalyticsOrderLike {
  table_id?: string | null
  status?: string | null
  total_amount?: number | string | null
  created_at?: string | null
  paid_at?: string | null
  table?: {
    id?: string | null
    table_number?: string | null
    floor_id?: string | null
  } | null
  order_items?: AnalyticsOrderItemLike[] | null
}

export interface AnalyticsKpis {
  paidRevenue: number
  orderVolume: number
  itemsSold: number
  avgPaidOrderValue: number
  occupiedTables: number
  occupancyRate: number
}

export interface DailyRevenuePoint {
  date: string
  label: string
  revenue: number
}

export interface FloorAnalyticsRow {
  floorId: string
  floorName: string
  totalTables: number
  occupiedTables: number
  occupancyRate: number
  ordersCount: number
  paidRevenue: number
}

export interface TableLeaderboardRow {
  tableId: string
  tableName: string
  floorName: string
  ordersCount: number
  paidRevenue: number
}

export interface TopItemRow {
  itemName: string
  quantity: number
  revenue: number
}

export interface BuildRestaurantAnalyticsInput {
  orders: AnalyticsOrderLike[]
  floors: ResFloor[]
  tables: ResTable[]
  days: number
  now?: Date
}

export interface BuildRestaurantAnalyticsResult {
  kpis: AnalyticsKpis
  dailyRevenue: DailyRevenuePoint[]
  floorAnalytics: FloorAnalyticsRow[]
  tableLeaderboard: TableLeaderboardRow[]
  topItemsByQuantity: TopItemRow[]
  topItemsByRevenue: TopItemRow[]
}

const toNumber = (value: unknown): number => {
  const normalized =
    typeof value === 'number' || typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(normalized) ? normalized : 0
}

const toPositiveInt = (value: unknown, fallback = 1): number => {
  const parsed = Math.trunc(toNumber(value))
  return parsed > 0 ? parsed : fallback
}

const parseDateValue = (value?: string | null): Date | null => {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

const resolveOrderDate = (order: AnalyticsOrderLike): Date | null =>
  parseDateValue(order.created_at)

const resolvePaidDate = (order: AnalyticsOrderLike): Date | null =>
  parseDateValue(order.paid_at) ?? parseDateValue(order.created_at)

const isPaidOrder = (order: AnalyticsOrderLike): boolean =>
  (order.status || '').toLowerCase() === PAID_STATUS

const isOperationalOrder = (order: AnalyticsOrderLike): boolean =>
  OPERATIONAL_STATUSES.has((order.status || '').toLowerCase())

export function getRangeStart(days: number, now = new Date()): Date {
  const safeDays = Math.max(1, Math.trunc(days || 1))
  return subDays(now, safeDays)
}

export function filterOrdersByDays<T extends AnalyticsOrderLike>(
  orders: T[],
  days: number,
  now = new Date()
): T[] {
  const rangeStart = getRangeStart(days, now)

  return orders.filter((order) => {
    const orderDate = resolveOrderDate(order)
    return !!orderDate && orderDate >= rangeStart && orderDate <= now
  })
}

export function buildRestaurantAnalytics(
  input: BuildRestaurantAnalyticsInput
): BuildRestaurantAnalyticsResult {
  const now = input.now ?? new Date()
  const filteredOrders = filterOrdersByDays(input.orders, input.days, now)
  const operationalOrders = filteredOrders.filter(isOperationalOrder)
  const paidOrders = filteredOrders.filter(isPaidOrder)

  const occupiedTables = input.tables.filter((table) => table.status === 'occupied').length
  const totalTables = input.tables.length
  const paidRevenue = paidOrders.reduce(
    (sum, order) => sum + toNumber(order.total_amount),
    0
  )
  const itemsSold = operationalOrders.reduce((sum, order) => {
    const items = order.order_items || []
    const itemCount = items.reduce(
      (itemSum, item) => itemSum + toPositiveInt(item.quantity, 1),
      0
    )
    return sum + itemCount
  }, 0)

  const kpis: AnalyticsKpis = {
    paidRevenue,
    orderVolume: operationalOrders.length,
    itemsSold,
    avgPaidOrderValue:
      paidOrders.length > 0 ? paidRevenue / paidOrders.length : 0,
    occupiedTables,
    occupancyRate: totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0,
  }

  const floorNameById = new Map(input.floors.map((floor) => [floor.id, floor.name]))
  const tableById = new Map(input.tables.map((table) => [table.id, table]))

  const floorMap = new Map<string, FloorAnalyticsRow>()
  input.floors.forEach((floor) => {
    floorMap.set(floor.id, {
      floorId: floor.id,
      floorName: floor.name,
      totalTables: 0,
      occupiedTables: 0,
      occupancyRate: 0,
      ordersCount: 0,
      paidRevenue: 0,
    })
  })
  floorMap.set(UNKNOWN_FLOOR_ID, {
    floorId: UNKNOWN_FLOOR_ID,
    floorName: UNKNOWN_FLOOR_NAME,
    totalTables: 0,
    occupiedTables: 0,
    occupancyRate: 0,
    ordersCount: 0,
    paidRevenue: 0,
  })

  input.tables.forEach((table) => {
    const floorId = table.floor_id || UNKNOWN_FLOOR_ID
    const row = floorMap.get(floorId) || floorMap.get(UNKNOWN_FLOOR_ID)
    if (!row) return

    row.totalTables += 1
    if (table.status === 'occupied') {
      row.occupiedTables += 1
    }
  })

  operationalOrders.forEach((order) => {
    const tableId = order.table?.id || order.table_id || null
    const resolvedTable = tableId ? tableById.get(tableId) : null
    const floorId =
      order.table?.floor_id || resolvedTable?.floor_id || UNKNOWN_FLOOR_ID
    const row = floorMap.get(floorId) || floorMap.get(UNKNOWN_FLOOR_ID)
    if (!row) return
    row.ordersCount += 1
  })

  paidOrders.forEach((order) => {
    const tableId = order.table?.id || order.table_id || null
    const resolvedTable = tableId ? tableById.get(tableId) : null
    const floorId =
      order.table?.floor_id || resolvedTable?.floor_id || UNKNOWN_FLOOR_ID
    const row = floorMap.get(floorId) || floorMap.get(UNKNOWN_FLOOR_ID)
    if (!row) return
    row.paidRevenue += toNumber(order.total_amount)
  })

  const floorAnalytics = Array.from(floorMap.values())
    .map((row) => ({
      ...row,
      occupancyRate:
        row.totalTables > 0 ? (row.occupiedTables / row.totalTables) * 100 : 0,
    }))
    .filter(
      (row) =>
        row.floorId !== UNKNOWN_FLOOR_ID ||
        row.totalTables > 0 ||
        row.ordersCount > 0 ||
        row.paidRevenue > 0
    )
    .sort((a, b) => b.paidRevenue - a.paidRevenue)

  const tableMap = new Map<string, TableLeaderboardRow>()
  input.tables.forEach((table) => {
    tableMap.set(table.id, {
      tableId: table.id,
      tableName: table.table_number || UNKNOWN_TABLE_NAME,
      floorName: floorNameById.get(table.floor_id || '') || UNKNOWN_FLOOR_NAME,
      ordersCount: 0,
      paidRevenue: 0,
    })
  })
  tableMap.set(UNKNOWN_TABLE_ID, {
    tableId: UNKNOWN_TABLE_ID,
    tableName: UNKNOWN_TABLE_NAME,
    floorName: UNKNOWN_FLOOR_NAME,
    ordersCount: 0,
    paidRevenue: 0,
  })

  operationalOrders.forEach((order) => {
    const tableId = order.table?.id || order.table_id || UNKNOWN_TABLE_ID
    const tableName = order.table?.table_number || UNKNOWN_TABLE_NAME
    const floorName =
      floorNameById.get(order.table?.floor_id || '') || UNKNOWN_FLOOR_NAME

    if (!tableMap.has(tableId)) {
      tableMap.set(tableId, {
        tableId,
        tableName,
        floorName,
        ordersCount: 0,
        paidRevenue: 0,
      })
    }

    const row = tableMap.get(tableId)
    if (row) {
      row.ordersCount += 1
    }
  })

  paidOrders.forEach((order) => {
    const tableId = order.table?.id || order.table_id || UNKNOWN_TABLE_ID
    const row = tableMap.get(tableId)
    if (row) {
      row.paidRevenue += toNumber(order.total_amount)
    }
  })

  const tableLeaderboard = Array.from(tableMap.values())
    .filter((row) => row.ordersCount > 0 || row.paidRevenue > 0)
    .sort((a, b) => {
      if (b.paidRevenue !== a.paidRevenue) {
        return b.paidRevenue - a.paidRevenue
      }
      return b.ordersCount - a.ordersCount
    })

  const itemMap = new Map<string, TopItemRow>()
  operationalOrders.forEach((order) => {
    ;(order.order_items || []).forEach((item) => {
      const itemName = (item.menu_item?.name || '').trim() || UNKNOWN_ITEM_NAME
      const quantity = toPositiveInt(item.quantity, 1)
      const revenue = quantity * toNumber(item.unit_price)

      const existing = itemMap.get(itemName)
      if (existing) {
        existing.quantity += quantity
        existing.revenue += revenue
      } else {
        itemMap.set(itemName, { itemName, quantity, revenue })
      }
    })
  })

  const topItemsByQuantity = Array.from(itemMap.values())
    .sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity
      return b.revenue - a.revenue
    })
    .slice(0, 10)

  const topItemsByRevenue = Array.from(itemMap.values())
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue
      return b.quantity - a.quantity
    })
    .slice(0, 10)

  const rangeStart = getRangeStart(input.days, now)
  const daysInRange = eachDayOfInterval({
    start: startOfDay(rangeStart),
    end: startOfDay(now),
  })
  const dailyRevenueMap = new Map<string, number>(
    daysInRange.map((day) => [format(day, 'yyyy-MM-dd'), 0])
  )

  paidOrders.forEach((order) => {
    const paidDate = resolvePaidDate(order)
    if (!paidDate || paidDate < rangeStart || paidDate > now) return
    const key = format(paidDate, 'yyyy-MM-dd')
    dailyRevenueMap.set(
      key,
      (dailyRevenueMap.get(key) || 0) + toNumber(order.total_amount)
    )
  })

  const dailyRevenue: DailyRevenuePoint[] = Array.from(dailyRevenueMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, revenue]) => ({
      date,
      label: format(parseISO(date), 'MMM d'),
      revenue,
    }))

  return {
    kpis,
    dailyRevenue,
    floorAnalytics,
    tableLeaderboard,
    topItemsByQuantity,
    topItemsByRevenue,
  }
}
