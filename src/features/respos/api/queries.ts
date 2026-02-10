// ResPOS API Queries - TanStack Query hooks
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useSupabaseClient } from '@/hooks/use-supabase-client'
import type {
  ResEmployee,
  ResEmployeeRole,
  ResEmployeeWithRoles,
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
  ResShift,
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
  tables: (floorId?: string) =>
    floorId
      ? (['respos', 'tables', floorId] as const)
      : (['respos', 'tables'] as const),
  menuCategories: ['respos', 'menu-categories'] as const,
  menuItems: (categoryId?: string) =>
    categoryId
      ? (['respos', 'menu-items', categoryId] as const)
      : (['respos', 'menu-items'] as const),
  menuItem: (id: string) => ['respos', 'menu-items', 'detail', id] as const,
  shifts: ['respos', 'shifts'] as const,
  activeShift: ['respos', 'shifts', 'active'] as const,
  activeOrder: (tableId: string) =>
    ['respos', 'orders', 'active', tableId] as const,
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
  dashboardStats: ['respos', 'dashboard-stats'] as const,
}

// ============ Roles ============

export function useRoles() {
  const { getClient } = useSupabaseClient()
  return useQuery({
    queryKey: resposQueryKeys.roles,
    queryFn: async () => {
      const client = await getClient()
      const { data, error } = await client
        .from('res_roles')
        .select('*')
        .order('name')

      if (error) throw error
      return data as ResRole[]
    },
  })
}

// ============ Employees ============

export function useEmployees() {
  const { getClient } = useSupabaseClient()
  return useQuery({
    queryKey: resposQueryKeys.employees,
    queryFn: async () => {
      const client = await getClient()
      const { data: employees, error: empError } = await client
        .from('res_employees')
        .select('*')
        .eq('is_active', true)
        .order('first_name')

      if (empError) throw empError

      // Get roles for all employees
      const { data: employeeRoles, error: rolesError } = await client
        .from('res_employee_roles')
        .select('*, role:res_roles(*)')

      if (rolesError) throw rolesError

      // Map roles to employees
      return (employees as ResEmployee[]).map((emp) => ({
        ...emp,
        roles: (employeeRoles as Array<ResEmployeeRole & { role: ResRole }>)
          .filter((er) => er.employee_id === emp.id)
          .map((er) => er.role),
      })) as ResEmployeeWithRoles[]
    },
  })
}

export function useEmployeeByUserId(userId: string | undefined) {
  const { getClient } = useSupabaseClient()
  return useQuery({
    queryKey: resposQueryKeys.employeeByUserId(userId || ''),
    queryFn: async () => {
      if (!userId) return null

      const client = await getClient()
      const { data: employee, error: empError } = await client
        .from('res_employees')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (empError) {
        if (empError.code === 'PGRST116') return null
        throw empError
      }

      // Get roles
      const { data: employeeRoles, error: rolesError } = await client
        .from('res_employee_roles')
        .select('*, role:res_roles(*)')
        .eq('employee_id', employee.id)

      if (rolesError) throw rolesError

      // Get public user data
      const { data: publicUser } = await client
        .from('users')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

      return {
        ...employee,
        roles: (
          employeeRoles as Array<ResEmployeeRole & { role: ResRole }>
        ).map((er) => er.role),
        public_user: publicUser,
      } as ResEmployeeWithRoles
    },
    enabled: !!userId,
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

export function useTables(floorId?: string) {
  return useQuery({
    queryKey: resposQueryKeys.tables(floorId),
    queryFn: async () => {
      let query = supabase
        .from('res_tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number')

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
        .single()

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

// ============ Shifts ============

export function useActiveShift() {
  return useQuery({
    queryKey: resposQueryKeys.activeShift,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_shifts')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data as ResShift | null
    },
  })
}

export function useShifts() {
  return useQuery({
    queryKey: resposQueryKeys.shifts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_shifts')
        .select('*')
        .order('opened_at', { ascending: false })

      if (error) throw error
      return data as ResShift[]
    },
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

export function useOrder(id: string) {
  return useQuery({
    queryKey: resposQueryKeys.order(id),
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from('res_orders')
        .select('*, table:res_tables(*), creator:res_employees(*)')
        .eq('id', id)
        .single()

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
  const { getClient } = useSupabaseClient()
  return useQuery({
    queryKey: resposQueryKeys.voidRequests(status),
    queryFn: async () => {
      const client = await getClient()
      let query = client
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

export function useReservations(date?: string) {
  const { getClient } = useSupabaseClient()
  return useQuery({
    queryKey: resposQueryKeys.reservations(date),
    queryFn: async () => {
      const client = await getClient()
      let query = client
        .from('res_reservations')
        .select('*, table:res_tables(*)')
        .order('reservation_time')

      if (date) {
        query = query.eq('reservation_date', date)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Array<ResReservation & { table: ResTable }>
    },
  })
}

// ============ Payment Methods ============

export function usePaymentMethods() {
  const { getClient } = useSupabaseClient()
  return useQuery({
    queryKey: resposQueryKeys.paymentMethods,
    queryFn: async () => {
      const client = await getClient()
      const { data, error } = await client
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
  const { getClient } = useSupabaseClient()
  return useQuery({
    queryKey: resposQueryKeys.dashboardStats,
    queryFn: async () => {
      const client = await getClient()
      // Get table stats
      const { data: tables, error: tablesError } = await client
        .from('res_tables')
        .select('status')
        .eq('is_active', true)

      if (tablesError) throw tablesError

      // Get open orders count
      const { count: openOrders, error: ordersError } = await client
        .from('res_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'ready'])

      if (ordersError) throw ordersError

      // Get today's sales
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySales, error: salesError } = await client
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
