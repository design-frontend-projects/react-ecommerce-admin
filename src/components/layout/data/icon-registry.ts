import {
  ArrowLeftRight,
  Barcode,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChefHat,
  Circle,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Grid3X3,
  History,
  LayoutDashboard,
  Layers,
  LineChart,
  Lock,
  Map,
  MapPin,
  Monitor,
  MonitorDot,
  Package,
  PackageCheck,
  Receipt,
  Repeat,
  Ruler,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Timer,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  Wrench,
} from 'lucide-react'

/**
 * Explicit name -> lucide component registry for DB-driven navigation.
 * Keys cover both `app_screens.icon` values (admin-configurable) and the
 * screen catalog codes used as fallbacks. An explicit registry (instead of
 * importing all of lucide dynamically) keeps the bundle lean.
 */
const ICONS: Record<string, React.ElementType> = {
  // generic icon names an admin can store in app_screens.icon
  dashboard: LayoutDashboard,
  pos: Monitor,
  products: Package,
  orders: ClipboardList,
  inventory: Boxes,
  settings: Settings,
  users: Users,
  roles: UserCog,
  security: Lock,
  reports: LineChart,
  audit: History,
  screens: MonitorDot,
  buttons: Grid3X3,
  payments: CreditCard,
  cash: DollarSign,
  wallet: Wallet,
  receipt: Receipt,
  shipments: Truck,
  warehouse: Warehouse,
  locations: MapPin,
  map: Map,
  transfers: ArrowLeftRight,
  adjustments: Wrench,
  counts: ClipboardCheck,
  batches: Layers,
  serials: Barcode,
  uoms: Ruler,
  brands: Tags,
  shifts: Timer,
  reservations: CalendarClock,
  kitchen: ChefHat,
  menu: UtensilsCrossed,
  replenishment: Repeat,
  trending: TrendingUp,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  notifications: Bell,
  branches: Building2,
  cart: ShoppingCart,
  packagecheck: PackageCheck,
  access_control: ShieldCheck,

  // screen-code fallbacks (used when app_screens.icon is null)
  respos_dashboard: LayoutDashboard,
  respos_pos: Monitor,
  respos_captain: ClipboardList,
  respos_kitchen: ChefHat,
  respos_menu: UtensilsCrossed,
  respos_floors: Map,
  respos_reservations: CalendarClock,
  respos_analytics: LineChart,
  respos_shifts: Timer,
  respos_cashier: DollarSign,
  respos_payments: CreditCard,
  respos_shipments: Truck,
  inventory_shipments: Truck,
  stock_balances: ClipboardCheck,
  purchase_orders: ShoppingCart,
  price_list: Tags,
  promotions: TrendingUp,
  transactions: Receipt,
  stock_transfers: ArrowLeftRight,
  stock_adjustments: Wrench,
  inventory_movements: History,
  suppliers: Truck,
  stores: Building2,
  categories: Layers,
  tax_rates: FileSpreadsheet,
  countries: Map,
  cities: MapPin,
  currencies: DollarSign,
  subscriptions: CreditCard,
  customers: Users,
  customer_groups: Users,
  customer_cards: CreditCard,
  permissions: Lock,
  system_management: Settings,
  audit_logs: History,
}

const DEFAULT_ICON: React.ElementType = Circle

/**
 * Resolve a navigation icon: the DB icon name first, the screen code as a
 * fallback, then a neutral default. Lookup is case-insensitive.
 */
export function resolveNavIcon(
  iconName: string | null | undefined,
  screenCode?: string
): React.ElementType {
  const byName = iconName ? ICONS[iconName.trim().toLowerCase()] : undefined
  if (byName) return byName
  const byCode = screenCode
    ? ICONS[screenCode.trim().toLowerCase()]
    : undefined
  return byCode ?? DEFAULT_ICON
}
