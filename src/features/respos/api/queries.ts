// ResPOS API Queries - TanStack Query hooks
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  fetchEligiblePromotions,
  validatePromoCode,
  validatePromotionById,
  type PromoValidationContext,
} from '../lib/promotion-validator'
import type {
  OrderChannel,
  ResFloor,
  ResMenuCategory,
  ResMenuItem,
  ResMenuItemWithDetails,
  ResNotification,
  ResOrder,
  ResOrderItem,
  ResOrderWithDetails,
  ResPaymentMethod,
  ResReservation,
  ResRole,
  ResTable,
  ResVoidRequestWithDetails,
} from '../types'

// ============ Query Keys ============

export const resposQueryKeys = {
  roles: ['respos', 'roles'] as const,
  employees: ['respos', 'employees'] as const,
  employee: (id: string) => ['respos', 'employees', id] as const,
  employeeByUserId: (userId: string) =>
    ['respos', 'employees', 'user', userId] as const,
  floors: ['respos', 'floors'] as const,
  tables: (floorId?: string, includeInactive?: boolean) => {
    const key: unknown[] = ['respos', 'tables']
    if (floorId) key.push(floorId)
    if (includeInactive) key.push('inactive')
    return key
  },
  menuCategories: ['respos', 'menu-categories'] as const,
  menuItems: (categoryId?: string) =>
    categoryId
      ? (['respos', 'menu-items', categoryId] as const)
      : (['respos', 'menu-items'] as const),
  menuItem: (id: string) => ['respos', 'menu-items', 'detail', id] as const,

  activeOrder: (tableId: string) =>
    ['respos', 'orders', 'active', tableId] as const,
  deliveryOrders: ['respos', 'orders', 'delivery-open'] as const,
  orders: (status?: string) =>
    status
      ? (['respos', 'orders', status] as const)
      : (['respos', 'orders'] as const),
  order: (id: string) => ['respos', 'orders', 'detail', id] as const,
  tableOrders: (tableId: string) =>
    ['respos', 'orders', 'table', tableId] as const,
  notifications: (employeeId: string) =>
    ['respos', 'notifications', employeeId] as const,
  unreadNotifications: (employeeId: string) =>
    ['respos', 'notifications', employeeId, 'unread'] as const,
  voidRequests: (status?: string) =>
    status
      ? (['respos', 'void-requests', status] as const)
      : (['respos', 'void-requests'] as const),
  reservations: (date?: string) =>
    date
      ? (['respos', 'reservations', date] as const)
      : (['respos', 'reservations'] as const),
  events: (date?: string) =>
    date
      ? (['respos', 'events', date] as const)
      : (['respos', 'events'] as const),
  paymentMethods: ['respos', 'payment-methods'] as const,
  promotions: (code: string, ctx: unknown) =>
    ['respos', 'promotions', 'validate', code, ctx] as const,
  promotionsById: (id: number, ctx: unknown) =>
    ['respos', 'promotions', 'validate-id', id, ctx] as const,
  eligiblePromotions: (orderType: string) =>
    ['respos', 'promotions', 'eligible', orderType] as const,
  dashboardStats: ['respos', 'dashboard-stats'] as const,
  analyticsOrders: (days: number) =>
    ['respos', 'analytics', 'orders', days] as const,
}

// ============ Roles ============

export function useRoles() {
  return useQuery({
    queryKey: resposQueryKeys.roles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_roles')
        .select('*')
        .order('name')

      if (error) throw error
      return data as ResRole[]
    },
  })
}

// ============ Floors & Tables ============

export function useFloors() {
  return useQuery({
    queryKey: resposQueryKeys.floors,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_floors')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      return data as ResFloor[]
    },
  })
}

export function useTables(floorId?: string, includeInactive = false) {
  return useQuery({
    queryKey: resposQueryKeys.tables(floorId, includeInactive),
    queryFn: async () => {
      let query = supabase.from('res_tables').select('*').order('table_number')

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      if (floorId) {
        query = query.eq('floor_id', floorId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ResTable[]
    },
  })
}

// ============ Menu ============

export function useMenuCategories() {
  return useQuery({
    queryKey: resposQueryKeys.menuCategories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      return data as ResMenuCategory[]
    },
  })
}

export function useMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: resposQueryKeys.menuItems(categoryId),
    queryFn: async () => {
      let query = supabase
        .from('res_menu_items')
        .select('*, category:res_menu_categories(*)')
        .order('name')

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Array<ResMenuItem & { category: ResMenuCategory }>
    },
  })
}

export function useMenuItemsWithDetails(categoryId?: string) {
  return useQuery({
    queryKey: ['respos', 'menu-items', 'details', categoryId] as const,
    queryFn: async () => {
      // Fetch items
      let query = supabase
        .from('res_menu_items')
        .select('*, category:res_menu_categories(*)')
        .order('name')

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data: items, error: itemsError } = await query
      if (itemsError) throw itemsError

      if (!items || items.length === 0) return []

      // Fetch all variants for these items
      const itemIds = items.map((i) => i.id)
      const { data: variants, error: varError } = await supabase
        .from('res_item_variants')
        .select('*')
        .in('item_id', itemIds)

      if (varError) throw varError

      // Fetch all properties for these items
      const { data: properties, error: propError } = await supabase
        .from('res_item_properties')
        .select('*')
        .in('item_id', itemIds)

      if (propError) throw propError

      // Map details to items
      return items.map((item) => ({
        ...item,
        variants: variants?.filter((v) => v.item_id === item.id) || [],
        properties: properties?.filter((p) => p.item_id === item.id) || [],
      })) as ResMenuItemWithDetails[]
    },
  })
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: resposQueryKeys.menuItem(id),
    queryFn: async () => {
      const { data: item, error: itemError } = await supabase
        .from('res_menu_items')
        .select('*, category:res_menu_categories(*)')
        .eq('id', id)
        .maybeSingle()

      if (itemError) throw itemError

      const { data: variants, error: varError } = await supabase
        .from('res_item_variants')
        .select('*')
        .eq('item_id', id)
        .order('is_default', { ascending: false })

      if (varError) throw varError

      const { data: properties, error: propError } = await supabase
        .from('res_item_properties')
        .select('*')
        .eq('item_id', id)

      if (propError) throw propError

      return {
        ...item,
        variants,
        properties,
      } as ResMenuItemWithDetails
    },
    enabled: !!id,
  })
}


// ============ Orders ============

export function useOrders(status?: string) {
  return useQuery({
    queryKey: resposQueryKeys.orders(status),
    queryFn: async () => {
      let query = supabase
        .from('res_orders')
        .select(
          '*, table:res_tables(*), order_items:res_order_items(*, menu_item:res_menu_items(*))'
        )
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Array<
        ResOrder & {
          table: ResTable
          order_items: Array<ResOrderItem & { menu_item: ResMenuItem }>
        }
      >
    },
  })
}

export function useAnalyticsOrders(params?: { days?: number }) {
  const days = params?.days ?? 30

  return useQuery({
    queryKey: resposQueryKeys.analyticsOrders(days),
    queryFn: async () => {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)

      const { data, error } = await supabase
        .from('res_orders')
        .select(
          `
            id,
            order_number,
            table_id,
            status,
            total_amount,
            created_at,
            paid_at,
            table:res_tables(id, table_number, floor_id),
            order_items:res_order_items(
              id,
              quantity,
              unit_price,
              menu_item:res_menu_items(id, name)
            )
          `
        )
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      return data as Array<{
        id: string
        order_number: string
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
        order_items?: Array<{
          id: string
          quantity?: number | null
          unit_price?: number | string | null
          menu_item?: { id?: string | null; name?: string | null } | null
        }> | null
      }>
    },
  })
}

export function useTableOrders(tableId: string) {
  return useQuery({
    queryKey: resposQueryKeys.tableOrders(tableId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_orders')
        .select('*')
        .eq('table_id', tableId)
        .in('status', ['open', 'in_progress', 'ready'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ResOrder[]
    },
    enabled: !!tableId,
  })
}

export function useActiveOrderByTable(tableId: string) {
  return useQuery({
    queryKey: resposQueryKeys.activeOrder(tableId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_orders')
        .select(
          '*, items:res_order_items(*, item:res_menu_items(*), variant:res_item_variants(*))'
        )
        .eq('table_id', tableId)
        .in('status', ['open', 'in_progress', 'ready'])
        .maybeSingle()

      if (error) throw error
      return data as ResOrderWithDetails | null
    },
    enabled: !!tableId,
  })
}

export function useOpenDeliveryOrders() {
  return useQuery({
    queryKey: resposQueryKeys.deliveryOrders,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_orders')
        .select(
          '*, items:res_order_items(*, item:res_menu_items(*), variant:res_item_variants(*))'
        )
        .is('table_id', null)
        .in('status', ['open', 'in_progress', 'ready'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as ResOrderWithDetails[]
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: resposQueryKeys.order(id),
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from('res_orders')
        .select('*, table:res_tables(*), creator:res_employees(*)')
        .eq('id', id)
        .maybeSingle()

      if (orderError) throw orderError

      const { data: items, error: itemsError } = await supabase
        .from('res_order_items')
        .select('*, item:res_menu_items(*), variant:res_item_variants(*)')
        .eq('order_id', id)

      if (itemsError) throw itemsError

      return {
        ...order,
        items,
      } as ResOrderWithDetails
    },
    enabled: !!id,
  })
}

// ============ Notifications ============

export function useNotifications(employeeId: string) {
  return useQuery({
    queryKey: resposQueryKeys.notifications(employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_notifications')
        .select('*')
        .eq('recipient_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as ResNotification[]
    },
    enabled: !!employeeId,
  })
}

export function useUnreadNotificationCount(employeeId: string) {
  return useQuery({
    queryKey: resposQueryKeys.unreadNotifications(employeeId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('res_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', employeeId)
        .eq('is_read', false)

      if (error) throw error
      return count || 0
    },
    enabled: !!employeeId,
  })
}

// ============ Void Requests ============

export function useVoidRequests(status?: string) {
  return useQuery({
    queryKey: resposQueryKeys.voidRequests(status),
    queryFn: async () => {
      let query = supabase
        .from('res_void_requests')
        .select(
          '*, order:res_orders(*), requester:res_employees!requested_by(*), approver:res_employees!approved_by(*)'
        )
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ResVoidRequestWithDetails[]
    },
  })
}

// ============ Reservations ============

export function useReservations(params?: {
  date?: string
  from?: string
  to?: string
}) {
  return useQuery({
    queryKey: ['respos', 'reservations', params] as const,
    queryFn: async () => {
      let query = supabase
        .from('res_reservations')
        .select('*, table:res_tables(*)')
        .order('reservation_time')

      if (params?.date) {
        query = query.eq('reservation_date', params.date)
      } else if (params?.from && params?.to) {
        query = query
          .gte('reservation_date', params.from)
          .lte('reservation_date', params.to)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Array<ResReservation & { table: ResTable }>
    },
  })
}

// ============ Payment Methods ============

export function usePaymentMethods() {
  return useQuery({
    queryKey: resposQueryKeys.paymentMethods,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_payment_methods')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order')

      if (error) throw error
      return data as ResPaymentMethod[]
    },
  })
}

// ============ Dashboard Stats ============

export function useDashboardStats() {
  return useQuery({
    queryKey: resposQueryKeys.dashboardStats,
    queryFn: async () => {
      // Get table stats
      const { data: tables, error: tablesError } = await supabase
        .from('res_tables')
        .select('status')
        .eq('is_active', true)

      if (tablesError) throw tablesError

      // Get open orders count
      const { count: openOrders, error: ordersError } = await supabase
        .from('res_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'ready'])

      if (ordersError) throw ordersError

      // Get today's sales
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySales, error: salesError } = await supabase
        .from('res_orders')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('paid_at', `${today}T00:00:00`)

      if (salesError) throw salesError

      const totalSales =
        todaySales?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

      return {
        activeTables:
          tables?.filter((t) => t.status === 'occupied').length || 0,
        totalTables: tables?.length || 0,
        openOrders: openOrders || 0,
        todaySales: totalSales,
        pendingNotifications: 0, // Will be updated per user
      }
    },
  })
}

// ============ Promotions ============

export function useValidatePromoCode(
  code: string,
  ctx: PromoValidationContext
) {
  return useQuery({
    // ctx is part of the key: validation depends on lines/channel/mobile too
    queryKey: resposQueryKeys.promotions(code, ctx),
    queryFn: () => validatePromoCode(code, ctx),
    enabled: !!code.trim() && ctx.subtotal > 0,
    staleTime: 30_000,
    retry: false,
  })
}

export function useValidatePromoById(
  promotionId: number | null | undefined,
  ctx: PromoValidationContext
) {
  return useQuery({
    queryKey: resposQueryKeys.promotionsById(promotionId ?? 0, ctx),
    queryFn: () => validatePromotionById(promotionId!, ctx),
    enabled: !!promotionId && ctx.subtotal > 0,
    staleTime: 30_000,
    retry: false,
  })
}

export function useEligiblePromotions(
  orderType: OrderChannel,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: resposQueryKeys.eligiblePromotions(orderType),
    queryFn: () => fetchEligiblePromotions(orderType),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    retry: 1,
  })
}
