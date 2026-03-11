import {
  AudioWaveform,
  Bell,
  CalendarClock,
  ChefHat,
  Command,
  CreditCard,
  GalleryVerticalEnd,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  LineChart,
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
} from 'lucide-react'
import { type SidebarData } from '../types'

import { useTranslation } from 'react-i18next'

export function useSidebarData(): SidebarData {
  const { t } = useTranslation('sidebar')

  return {
    user: {
      name: 'satnaing',
      email: 'satnaingdev@gmail.com',
      avatar: '/avatars/shadcn.jpg',
    },
    teams: [
      {
        name: 'Restaurant POS',
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
        title: t('system'),
        items: [
          {
            title: t('systemManagement'),
            url: '/system',
            icon: Wrench,
            isSystemOwner: true,
          },
        ],
      },
      {
        title: t('general'),
        items: [
          {
            title: t('dashboard'),
            url: '/',
            icon: LayoutDashboard,
          },
          {
            title: t('posSystem'),
            url: '/pos',
            icon: Receipt,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('products'),
            url: '/products',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('subscriptions'),
            url: '/subscriptions',
            icon: CreditCard,
            roles: ['super_admin'],
          },
        ],
      },
      {
        title: t('restaurantPos'),
        items: [
          {
            title: t('posDashboard'),
            url: '/respos',
            icon: LayoutDashboard,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('posScreen'),
            url: '/respos/pos',
            icon: Receipt,
            roles: ['captain', 'admin', 'super_admin'],
          },
          {
            title: t('captainStation'),
            url: '/respos/captain',
            icon: Users,
            roles: ['captain', 'admin', 'super_admin'],
          },
          {
            title: t('kitchenDisplay'),
            url: '/respos/kitchen',
            icon: ChefHat,
            roles: ['kitchen', 'admin', 'super_admin'],
          },
          {
            title: t('menuManagement'),
            url: '/respos/menu',
            icon: UtensilsCrossed,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('floorsTables'),
            url: '/respos/floors',
            icon: Grid3X3,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('reservations'),
            url: '/respos/reservations',
            icon: CalendarClock,
            roles: ['admin', 'super_admin', 'captain'],
          },
          {
            title: t('analytics'),
            url: '/respos/analytics',
            icon: LineChart,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('shifts'),
            url: '/respos/shifts',
            icon: Timer,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('cashierCheckout'),
            url: '/respos/cashier',
            icon: CreditCard,
            roles: ['cashier', 'admin', 'super_admin'],
          },
          {
            title: t('payments'),
            url: '/respos/payments',
            icon: CreditCard,
            roles: ['admin', 'super_admin'],
          },
          // Admin only
          {
            title: t('usersRoles'),
            url: '/respos/users',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
        ],
      },
      {
        title: t('inventory'),
        items: [
          {
            title: t('categories'),
            url: '/categories',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('inventoryItems'),
            url: '/inventory',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('suppliers'),
            url: '/suppliers',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('customers'),
            url: '/customers',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('customerGroups'),
            url: '/customer-groups',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('customerCards'),
            url: '/customer-cards',
            icon: Users,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('promotions'),
            url: '/promotions',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('priceList'),
            url: '/price-list',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('purchaseOrders'),
            url: '/purchase-orders',
            icon: ShoppingCart,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('taxRates'),
            url: '/tax-rates',
            icon: Package,
            roles: ['admin', 'super_admin'],
          },
          {
            title: t('transactions'),
            url: '/transactions',
            icon: Receipt,
            roles: ['admin', 'super_admin'],
          },
        ],
      },
      {
        title: t('other'),
        items: [
          {
            title: t('settings'),
            icon: Settings,
            items: [
              {
                title: t('profile'),
                url: '/settings',
                icon: UserCog,
              },
              {
                title: t('account'),
                url: '/settings/account',
                icon: Wrench,
              },
              {
                title: t('appearance'),
                url: '/settings/appearance',
                icon: Palette,
              },
              {
                title: t('notifications'),
                url: '/settings/notifications',
                icon: Bell,
              },
              {
                title: t('display'),
                url: '/settings/display',
                icon: Monitor,
              },
            ],
          },
          {
            title: t('helpCenter'),
            url: '/help-center',
            icon: HelpCircle,
          },
        ],
      },
    ],
  }
}
