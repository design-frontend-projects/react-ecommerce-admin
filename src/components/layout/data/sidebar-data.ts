import { UserRole, ADMIN_ROLES } from '@/types/user-role.enum'
import {
  AlertTriangle,
  ArrowLeftRight,
  AudioWaveform,
  Barcode,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Clock,
  History,
  Building2,
  CalendarClock,
  ChefHat,
  Command,
  CreditCard,
  Database,
  DollarSign,
  FileSpreadsheet,
  FileText,
  GalleryVerticalEnd,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  Layers,
  LineChart,
  Lock,
  Map,
  MapPin,
  Monitor,
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
  TrendingUp,
  UserCog,
  Users,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  Wrench,
  Truck,
  MonitorDot,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { useNavCatalog } from '@/features/access-control/hooks/use-nav-catalog'
import { type SidebarData } from '../types'
import { buildCatalogNavGroups } from './catalog-nav'

const ADMINS = [...ADMIN_ROLES]

export function useSidebarData(): SidebarData {
  const { t } = useTranslation()
  const navCatalog = useNavCatalog()
  const profile = useAuthStore((state) => state.auth.profile)

  const staticData: SidebarData = {
    ...(profile
      ? {
          user: {
            name: profile.first_name || profile.email?.split('@')[0] || 'User',
            email: profile.email || '',
            avatar: (profile as any)?.avatar_url || '',
          },
        }
      : {}),
    teams: [
      {
        name: t('sidebar.restaurantPos'),
        logo: Command,
        plan: 'Free',
      },
      {
        name: 'Acme Inc',
        logo: GalleryVerticalEnd,
        plan: 'Enterprise',
      },
      {
        name: 'Acme Corp.',
        logo: AudioWaveform,
        plan: 'Startup',
      },
    ],
    navGroups: [
      {
        title: t('sidebar.system'),
        items: [
          {
            title: t('sidebar.systemManagement'),
            url: '/system',
            icon: Wrench,
            isSystemOwner: true,
          },
          {
            title: t('sidebar.auditLogs'),
            url: '/system/audit-logs',
            icon: LineChart,
            isSystemOwner: true,
          },
        ],
      },
      {
        title: t('sidebar.general'),
        items: [
          {
            title: t('sidebar.dashboard'),
            url: '/',
            icon: LayoutDashboard,
            roles: ADMINS,
          },
          {
            title: t('sidebar.posSystem'),
            url: '/pos',
            icon: Receipt,
            roles: ADMINS,
          },
          {
            title: t('sidebar.products'),
            url: '/products',
            icon: Package,
            roles: ADMINS,
          },
          {
            title: t('sidebar.subscriptions'),
            url: '/subscriptions',
            icon: CreditCard,
            roles: ADMINS,
          },
          {
            title: 'Notifications',
            url: '/notifications',
            icon: Bell,
            roles: ADMINS,
          },
        ],
      },
      {
        title: t('sidebar.restaurantPos'),
        items: [
          {
            title: t('sidebar.posDashboard'),
            url: '/respos',
            icon: LayoutDashboard,
            roles: [UserRole.Captain, UserRole.Cashier, ...ADMINS],
          },
          {
            title: t('sidebar.posScreen'),
            url: '/respos/pos',
            icon: Receipt,
            roles: [UserRole.Captain, ...ADMINS],
          },
          {
            title: 'Captain Station',
            url: '/respos/captain',
            icon: ChefHat,
            roles: [UserRole.Captain, ...ADMINS],
          },
          {
            title: 'Kitchen Display',
            url: '/respos/kitchen',
            icon: MonitorDot,
            roles: [UserRole.Kitchen, ...ADMINS],
          },
          {
            title: t('sidebar.menuManagement'),
            url: '/respos/menu',
            icon: UtensilsCrossed,
            roles: ADMINS,
          },
          {
            title: t('sidebar.floorsTables'),
            url: '/respos/floors',
            icon: Grid3X3,
            roles: ADMINS,
          },
          {
            title: t('sidebar.reservations'),
            url: '/respos/reservations',
            icon: CalendarClock,
            roles: [...ADMINS, UserRole.Captain],
          },
          {
            title: t('sidebar.analytics'),
            url: '/respos/analytics',
            icon: LineChart,
            roles: ADMINS,
          },

          {
            title: t('sidebar.cashierCheckout'),
            url: '/respos/cashier',
            icon: CreditCard,
            roles: [UserRole.Cashier, ...ADMINS],
          },
          {
            title: t('sidebar.payments'),
            url: '/respos/payments',
            icon: CreditCard,
            roles: [UserRole.Cashier, ...ADMINS],
          },
          {
            title: t('sidebar.shipments'),
            url: '/respos/shipments',
            icon: Truck,
            roles: ADMINS,
          },
          {
            title: t('sidebar.paymentMethods'),
            url: '/payment-methods',
            icon: Wallet,
            roles: ADMINS,
          },
          // Admin only
          {
            title: t('sidebar.usersRoles'),
            url: '/users',
            icon: Users,
            roles: ADMINS,
            permissions: [
              'access_control.users.view',
              'access_control.users.manage',
            ],
          },
          {
            title: t('sidebar.accessControl'),
            url: '/access-control',
            icon: ShieldCheck,
            roles: ADMINS,
            permissions: [
              'access_control.screens.view',
              'access_control.roles.manage',
            ],
          },
        ],
      },
      {
        title: t('sidebar.inventory'),
        items: [
          {
            title: 'Inventory Dashboard',
            url: '/inventory/dashboard',
            icon: LayoutDashboard,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: 'Inventory Alerts',
            url: '/inventory/alerts',
            icon: AlertTriangle,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.categories'),
            url: '/categories',
            icon: Package,
            roles: ADMINS,
          },
          {
            title: t('sidebar.inventoryItems'),
            url: '/inventory',
            icon: Package,
            roles: ADMINS,
          },
          {
            title: 'Stock Ledger',
            url: '/inventory/ledger',
            icon: History,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: 'Expiry Management',
            url: '/inventory/expiry',
            icon: Clock,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: 'Inventory Valuation',
            url: '/inventory/valuation',
            icon: DollarSign,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.shipments'),
            url: '/inventory/shipments',
            icon: Truck,
            roles: ADMINS,
          },
          {
            title: t('sidebar.suppliers'),
            url: '/suppliers',
            icon: Package,
            roles: ADMINS,
          },
          {
            title: t('sidebar.customers'),
            url: '/customers',
            icon: Users,
            roles: ADMINS,
          },
          {
            title: t('sidebar.customerGroups'),
            url: '/customer-groups',
            icon: Users,
            roles: ADMINS,
          },
          {
            title: t('sidebar.customerCards'),
            url: '/customer-cards',
            icon: Users,
            roles: ADMINS,
          },
          {
            title: t('sidebar.promotions'),
            url: '/promotions',
            icon: Package,
            roles: ADMINS,
          },
          {
            title: t('sidebar.priceList'),
            url: '/price-list',
            icon: Package,
            roles: ADMINS,
          },
          {
            title: t('sidebar.purchaseOrders'),
            url: '/purchase-orders',
            icon: ShoppingCart,
            roles: ADMINS,
          },
          {
            title: t('sidebar.purchaseRequisitions'),
            url: '/purchase-requisitions',
            icon: FileText,
            roles: ADMINS,
            permissions: [
              'inventory.purchasing.view',
              'inventory.purchasing.manage',
            ],
          },
          {
            title: t('sidebar.goodsReceipts'),
            url: '/goods-receipts',
            icon: PackageCheck,
            roles: ADMINS,
            permissions: [
              'inventory.purchasing.view',
              'inventory.purchasing.manage',
            ],
          },
          {
            title: t('sidebar.salesOrders'),
            url: '/sales-orders',
            icon: FileSpreadsheet,
            roles: ADMINS,
            permissions: ['inventory.sales.view', 'inventory.sales.manage'],
          },
          {
            title: t('sidebar.reservations'),
            url: '/reservations',
            icon: Lock,
            roles: ADMINS,
            permissions: ['inventory.sales.view', 'inventory.sales.manage'],
          },
          {
            title: t('sidebar.warehouses'),
            url: '/warehouses',
            icon: Warehouse,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.stockByLocation'),
            url: '/stock-by-location',
            icon: MapPin,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.brands'),
            url: '/brands',
            icon: Tags,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.units'),
            url: '/units',
            icon: Ruler,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.batches'),
            url: '/batches',
            icon: Layers,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.serials'),
            url: '/serials',
            icon: Barcode,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.stockCounts'),
            url: '/stock-counts',
            icon: ClipboardCheck,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.reorderRules'),
            url: '/reorder-rules',
            icon: Repeat,
            roles: ADMINS,
            permissions: ['inventory.stock.view', 'inventory.stock.manage'],
          },
          {
            title: t('sidebar.replenishment'),
            url: '/replenishment',
            icon: TrendingUp,
            roles: ADMINS,
            permissions: [
              'inventory.purchasing.view',
              'inventory.purchasing.manage',
            ],
          },
          {
            title: t('sidebar.stockBalances'),
            url: '/stock-balances',
            icon: Boxes,
            roles: ADMINS,
          },
          {
            title: t('sidebar.stockTransfers'),
            url: '/stock-transfers',
            icon: ArrowLeftRight,
            roles: ADMINS,
          },
          {
            title: t('sidebar.stockAdjustments'),
            url: '/stock-adjustments',
            icon: ClipboardList,
            roles: ADMINS,
          },
          {
            title: t('sidebar.inventoryMovements'),
            url: '/inventory-movements',
            icon: History,
            roles: ADMINS,
          },
          {
            title: t('sidebar.taxRates'),
            url: '/tax-rates',
            icon: Package,
            roles: ADMINS,
          },
          {
            title: t('sidebar.transactions'),
            url: '/transactions',
            icon: Receipt,
            roles: ADMINS,
          },
        ],
      },
      {
        title: t('sidebar.lookups'),
        items: [
          {
            title: 'Master Lookups',
            url: '/lookups',
            icon: Database,
            roles: ADMINS,
          },
          {
            title: t('sidebar.countries'),
            url: '/countries',
            icon: Map,
            roles: ADMINS,
          },
          {
            title: t('sidebar.cities'),
            url: '/cities',
            icon: MapPin,
            roles: ADMINS,
          },
          {
            title: t('sidebar.currencies'),
            url: '/currencies',
            icon: DollarSign,
            roles: ADMINS,
          },
          {
            title: t('sidebar.branches'),
            url: '/branches',
            icon: Building2,
            roles: ADMINS,
          },
          {
            title: t('sidebar.stores'),
            url: '/stores',
            icon: MapPin,
            roles: ADMINS,
          },
        ],
      },
      {
        title: t('sidebar.other'),
        items: [
          {
            title: t('sidebar.settings'),
            icon: Settings,
            items: [
              {
                title: t('sidebar.profile'),
                url: '/settings',
                icon: UserCog,
              },
              {
                title: t('sidebar.account'),
                url: '/settings/account',
                icon: Wrench,
              },
              {
                title: t('sidebar.appearance'),
                url: '/settings/appearance',
                icon: Palette,
              },
              {
                title: t('sidebar.notifications'),
                url: '/settings/notifications',
                icon: Bell,
              },
              {
                title: t('sidebar.display'),
                url: '/settings/display',
                icon: Monitor,
              },
            ],
          },
          {
            title: t('sidebar.helpCenter'),
            url: '/help-center',
            icon: HelpCircle,
          },
        ],
      },
    ],
  }

  // Catalog-driven migration path: once screens are enriched in the DB (icons set via the
  // Access Control > Screens admin), drive nav from the catalog. Until then this returns null
  // and the curated static array above is used, so nav never regresses. Visibility filtering
  // stays in `app-sidebar.tsx` (`canAccessItem`), which now reads the converged RBAC store.
  const catalogGroups = buildCatalogNavGroups(navCatalog.data)
  if (catalogGroups) {
    return { ...staticData, navGroups: catalogGroups }
  }

  return staticData
}
