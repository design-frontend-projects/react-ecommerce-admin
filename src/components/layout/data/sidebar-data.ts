import {
  AudioWaveform,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChefHat,
  Command,
  CreditCard,
  DollarSign,
  GalleryVerticalEnd,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  Map,
  MapPin,
  Monitor,
  Package,
  Palette,
  Receipt,
  Settings,
  ShoppingCart,
  Timer,
  UserCog,
  Users,
  UtensilsCrossed,
  Wrench,
  Truck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type SidebarData } from '../types'

export function useSidebarData(): SidebarData {
  const { t } = useTranslation()

  return {
    user: {
      name: 'satnaing',
      email: 'satnaingdev@gmail.com',
      avatar: '/avatars/shadcn.jpg',
    },
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
          },
          {
            title: t('sidebar.posSystem'),
            url: '/pos',
            icon: Receipt,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.products'),
            url: '/products',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.subscriptions'),
            url: '/subscriptions',
            icon: CreditCard,
            roles: ['super_admin'],
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
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.posScreen'),
            url: '/respos/pos',
            icon: Receipt,
            roles: ['captain', 'admin', 'super_admin'],
          },
          {
            title: t('sidebar.captainStation'),
            url: '/respos/captain',
            icon: Users,
            roles: ['captain', 'admin', 'super_admin'],
          },
          {
            title: t('sidebar.kitchenDisplay'),
            url: '/respos/kitchen',
            icon: ChefHat,
            roles: ['kitchen', 'admin', 'super_admin'],
          },
          {
            title: t('sidebar.menuManagement'),
            url: '/respos/menu',
            icon: UtensilsCrossed,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.floorsTables'),
            url: '/respos/floors',
            icon: Grid3X3,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.reservations'),
            url: '/respos/reservations',
            icon: CalendarClock,
            roles: ['admin', 'super_admin', 'captain'],
          },
          {
            title: t('sidebar.analytics'),
            url: '/respos/analytics',
            icon: LineChart,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.shifts'),
            url: '/respos/shifts',
            icon: Timer,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.cashierCheckout'),
            url: '/respos/cashier',
            icon: CreditCard,
            roles: ['cashier', 'admin', 'super_admin'],
          },
          {
            title: t('sidebar.payments'),
            url: '/respos/payments',
            icon: CreditCard,
            roles: ['admin', 'super_admin'],
          },
          {
            title: 'POS Shipments',
            url: '/pos/shipments',
            icon: Truck,
            roles: ['admin', 'super_admin'],
          },
          // Admin only
          {
            title: t('sidebar.usersRoles'),
            url: '/users',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
        ],
      },
      {
        title: t('sidebar.inventory'),
        items: [
          {
            title: t('sidebar.categories'),
            url: '/categories',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.inventoryItems'),
            url: '/inventory',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.suppliers'),
            url: '/suppliers',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.customers'),
            url: '/customers',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.customerGroups'),
            url: '/customer-groups',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.customerCards'),
            url: '/customer-cards',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.promotions'),
            url: '/promotions',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.priceList'),
            url: '/price-list',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.purchaseOrders'),
            url: '/purchase-orders',
            icon: ShoppingCart,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.stockBalances'),
            url: '/stock-balances',
            icon: Boxes,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.taxRates'),
            url: '/tax-rates',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.transactions'),
            url: '/transactions',
            icon: Receipt,
            roles: ['admin', 'super_admin'],
          },
        ],
      },
      {
        title: t('sidebar.lookups'),
        items: [
          {
            title: t('sidebar.countries'),
            url: '/countries',
            icon: Map,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.cities'),
            url: '/cities',
            icon: MapPin,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.currencies'),
            url: '/currencies',
            icon: DollarSign,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.branches'),
            url: '/branches',
            icon: Building2,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('sidebar.stores'),
            url: '/stores',
            icon: MapPin,
            roles: ['admin', 'super_admin'],
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
}
