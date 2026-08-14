import * as LucideIcons from 'lucide-react'
import {
  ArrowLeftRight,
  Barcode,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Grid3X3,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  LineChart,
  Lock,
  Map,
  MapPin,
  Monitor,
  MonitorDot,
  Package,
  PackageCheck,
  Palette,
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
  units: Ruler,
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
  profile: UserCog,
  account: Wrench,
  appearance: Palette,
  display: Monitor,
  help: HelpCircle,
  help_center: HelpCircle,

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
  inventory_items: Boxes,
  stock_balances: Boxes,
  purchase_orders: ShoppingCart,
  purchase_requisitions: FileText,
  goods_receipts: PackageCheck,
  sales_orders: FileSpreadsheet,
  warehouses: Warehouse,
  stock_by_location: MapPin,
  stock_counts: ClipboardCheck,
  reorder_rules: Repeat,
  price_list: Tags,
  promotions: TrendingUp,
  transactions: Receipt,
  stock_transfers: ArrowLeftRight,
  stock_adjustments: ClipboardList,
  inventory_movements: History,
  suppliers: Truck,
  stores: Building2,
  categories: Package,
  tax_rates: Package,
  countries: Map,
  cities: MapPin,
  currencies: DollarSign,
  subscriptions: CreditCard,
  customers: Users,
  customer_groups: Users,
  customer_cards: CreditCard,
  permissions: Lock,
  system_management: Wrench,
  audit_logs: LineChart,
}

const DEFAULT_ICON: React.ElementType = LayoutDashboard

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase())
}

/**
 * Resolve a navigation icon: the DB icon name first, the screen code as a
 * fallback, then a dynamic PascalCase match from lucide-react, then a neutral default.
 */
export function resolveNavIcon(
  iconName: string | null | undefined,
  screenCode?: string
): React.ElementType {
  if (iconName) {
    const cleanName = iconName.trim().toLowerCase()
    if (ICONS[cleanName]) return ICONS[cleanName]

    const pascalName = toPascalCase(cleanName)
    const dynamicIcon = (LucideIcons as Record<string, unknown>)[pascalName]
    if (typeof dynamicIcon === 'function' || typeof dynamicIcon === 'object') {
      return dynamicIcon as React.ElementType
    }
  }

  if (screenCode) {
    const cleanCode = screenCode.trim().toLowerCase()
    if (ICONS[cleanCode]) return ICONS[cleanCode]

    const pascalCode = toPascalCase(cleanCode)
    const dynamicCodeIcon = (LucideIcons as Record<string, unknown>)[pascalCode]
    if (
      typeof dynamicCodeIcon === 'function' ||
      typeof dynamicCodeIcon === 'object'
    ) {
      return dynamicCodeIcon as React.ElementType
    }
  }

  return DEFAULT_ICON
}
