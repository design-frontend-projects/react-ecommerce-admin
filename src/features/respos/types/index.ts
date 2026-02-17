// ResPOS TypeScript Types
// All entities for the restaurant POS module

// ============ RBAC Types ============

export type RoleName =
  | 'super_admin'
  | 'admin'
  | 'cashier'
  | 'captain'
  | 'kitchen'

export type Permission =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'menu'
  | 'floors'
  | 'reservations'
  | 'reservations_view'
  | 'analytics'
  | 'shifts'
  | 'settings'
  | 'payments'
  | 'void_approve'
  | 'void_request'
  | 'kitchen'
  | 'notifications'
  | '*'

export interface ResRole {
  id: string
  name: RoleName
  display_name: string
  permissions: Permission[]
  created_at: string
}

export interface ResEmployee {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string
  pin_code?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ResEmployeeRole {
  id: string
  employee_id: string
  role_id: string
  assigned_at: string
}

export interface ResEmployeeWithRoles extends ResEmployee {
  roles: ResRole[]
}

// ============ Location Types ============

export type TableStatus = 'free' | 'occupied' | 'reserved' | 'dirty'
export type TableShape = 'square' | 'round' | 'rectangle'

export interface ResFloor {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface ResTable {
  id: string
  floor_id: string
  table_number: string
  seats: number
  status: TableStatus
  position_x: number
  position_y: number
  shape: TableShape
  is_active: boolean
  created_at: string
}

export interface ResTableWithFloor extends ResTable {
  floor: ResFloor
}

// ============ Menu Types ============

export interface ResMenuCategory {
  id: string
  name: string
  name_ar?: string
  icon?: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface ResMenuItem {
  id: string
  category_id?: string
  name: string
  name_ar?: string
  description?: string
  description_ar?: string
  base_price: number
  image_url?: string
  is_available: boolean
  preparation_time: number
  allergens: string[]
  tags: string[]
  created_at: string
  updated_at: string
  variants: ResItemVariant[]
  properties: ResItemProperty[]
}

export interface ResItemVariant {
  id: string
  item_id: string
  name: string
  price_adjustment: number
  is_default: boolean
  created_at: string
}

export interface PropertyOption {
  name: string
  price: number
}

export interface ResItemProperty {
  id: string
  item_id: string
  name: string
  options: PropertyOption[]
  is_required: boolean
  max_selections: number
  created_at: string
  price: number
}

export interface ResMenuItemWithDetails extends ResMenuItem {
  category?: ResMenuCategory
  variants: ResItemVariant[]
  properties: ResItemProperty[]
}

// ============ Order Types ============

export type ShiftStatus = 'open' | 'closed'
export type OrderStatus =
  | 'open'
  | 'in_progress'
  | 'ready'
  | 'paid'
  | 'void'
  | 'void_pending'
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served'

export interface ResShift {
  id: string
  opened_by: string
  closed_by?: string
  opening_cash: number
  closing_cash?: number
  status: ShiftStatus
  opened_at: string
  closed_at?: string
  notes?: string
}

export interface ResShiftWithEmployee extends ResShift {
  opener: ResEmployee
  closer?: ResEmployee
}

export interface ResOrder {
  id: string
  order_number: string
  table_id?: string
  shift_id?: string
  created_by?: string
  customer_name?: string
  status: OrderStatus
  subtotal: number
  discount_amount: number
  discount_type?: string
  tax_amount: number
  tip_amount: number
  total_amount: number
  payment_method?: string
  paid_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface SelectedProperty {
  id: string
  name: string
  price: number
}

export interface ResOrderItem {
  id: string
  order_id: string
  item_id: string
  variant_id?: string
  quantity: number
  unit_price: number
  properties: SelectedProperty[]
  notes?: string
  status: OrderItemStatus
  created_at: string
  updated_at: string
}

export interface ResOrderItemWithDetails extends ResOrderItem {
  item: ResMenuItem
  variant?: ResItemVariant
}

export interface ResOrderWithDetails extends ResOrder {
  table?: ResTable
  items: ResOrderItemWithDetails[]
  creator?: ResEmployee
}

// ============ Notification Types ============

export type NotificationType =
  | 'void_request'
  | 'order_ready'
  | 'new_order'
  | 'void_approved'
  | 'void_rejected'

export interface ResNotification {
  id: string
  recipient_id: string
  type: NotificationType
  title: string
  message?: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export type VoidRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ResVoidRequest {
  id: string
  order_id: string
  requested_by: string
  approved_by?: string
  reason: string
  status: VoidRequestStatus
  rejection_reason?: string
  created_at: string
  processed_at?: string
}

export interface ResVoidRequestWithDetails extends ResVoidRequest {
  order: ResOrder
  requester: ResEmployee
  approver?: ResEmployee
}

// ============ Reservation Types ============

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'

export interface ResReservation {
  id: string
  table_id?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  party_size: number
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  status: ReservationStatus
  notes?: string
  created_by?: string
  created_at: string
}

export interface ResReservationWithDetails extends ResReservation {
  table?: ResTable
  creator?: ResEmployee
}

export interface ResEvent {
  id: string
  title: string
  description?: string
  event_date: string
  start_time: string
  end_time: string
  blocked_tables: string[]
  is_active: boolean
  created_by?: string
  created_at: string
}

// ============ Payment Types ============

export interface ResPaymentMethod {
  id: string
  name: string
  icon?: string
  is_enabled: boolean
  sort_order: number
  created_at: string
}

// ============ Cart Types ============

export interface CartItem {
  item: ResMenuItem
  variant?: ResItemVariant
  quantity: number
  selectedProperties: SelectedProperty[]
  notes?: string
  lineTotal: number
}

export interface Cart {
  tableId?: string
  items: CartItem[]
  subtotal: number
  discountAmount: number
  discountType?: 'percentage' | 'fixed'
  taxAmount: number
  tipAmount: number
  total: number
}

// ============ Dashboard Types ============

export interface DashboardStats {
  activeTables: number
  totalTables: number
  openOrders: number
  todaySales: number
  pendingNotifications: number
}
