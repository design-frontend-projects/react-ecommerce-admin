import {
  AudioWaveform,
  Bell,
  Bug,
  CalendarClock,
  ChefHat,
  Command,
  Construction,
  CreditCard,
  FileX,
  GalleryVerticalEnd,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  Lock,
  Monitor,
  Package,
  Palette,
  Receipt,
  ServerOff,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Timer,
  UserCog,
  UserX,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
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
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Products',
          url: '/products',
          icon: Package,
          roles: ['admin', 'super_admin'],
        },
      ],
    },
    {
      title: 'Restaurant POS',
      items: [
        {
          title: 'POS Dashboard',
          url: '/respos',
          icon: LayoutDashboard,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'POS Screen',
          url: '/respos/pos',
          icon: Receipt,
          roles: ['captain', 'admin', 'super_admin'],
        },
        {
          title: 'Captain Station',
          url: '/respos/captain',
          icon: Users,
          roles: ['captain', 'admin', 'super_admin'],
        },
        {
          title: 'Kitchen Display',
          url: '/respos/kitchen',
          icon: ChefHat,
          roles: ['kitchen', 'admin', 'super_admin'],
        },
        {
          title: 'Menu Management',
          url: '/respos/menu',
          icon: UtensilsCrossed,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Floors & Tables',
          url: '/respos/floors',
          icon: Grid3X3,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Reservations',
          url: '/respos/reservations',
          icon: CalendarClock,
          roles: ['admin', 'super_admin', 'captain'],
        },
        {
          title: 'Analytics',
          url: '/respos/analytics',
          icon: LineChart,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Shifts',
          url: '/respos/shifts',
          icon: Timer,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Cashier Checkout',
          url: '/respos/cashier',
          icon: CreditCard,
          roles: ['cashier', 'admin', 'super_admin'],
        },
        {
          title: 'Payments',
          url: '/respos/payments',
          icon: CreditCard,
          roles: ['admin', 'super_admin'],
        },
        // Admin only
        {
          title: 'Users & Roles',
          url: '/respos/users',
          icon: Users,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'My Profile',
          url: '/respos/profile',
          icon: UserCog,
        },
      ],
    },
    {
      title: 'Inventory',
      items: [
        {
          title: 'Categories',
          url: '/categories',
          icon: Package,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Inventory Items',
          url: '/inventory',
          icon: Package,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Suppliers',
          url: '/suppliers',
          icon: Package,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Customers',
          url: '/customers',
          icon: Users,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Customer Groups',
          url: '/customer-groups',
          icon: Users,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Customer Cards',
          url: '/customer-cards',
          icon: Users,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Promotions',
          url: '/promotions',
          icon: Package,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Price List',
          url: '/price-list',
          icon: Package,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Purchase Orders',
          url: '/purchase-orders',
          icon: ShoppingCart,
          roles: ['admin', 'super_admin'],
        },
        {
          title: 'Tax Rates',
          url: '/tax-rates',
          icon: Package,
          roles: ['admin', 'super_admin'],
        },
      ],
    },
    {
      title: 'Pages',
      items: [
        {
          title: 'Auth',
          icon: ShieldCheck,
          items: [
            {
              title: 'Sign In',
              url: '/sign-in',
            },
            {
              title: 'Sign In (2 Col)',
              url: '/sign-in-2',
            },
            {
              title: 'Sign Up',
              url: '/sign-up',
            },
            {
              title: 'Forgot Password',
              url: '/forgot-password',
            },
            {
              title: 'OTP',
              url: '/otp',
            },
          ],
        },
        {
          title: 'Errors',
          icon: Bug,
          items: [
            {
              title: 'Unauthorized',
              url: '/errors/unauthorized',
              icon: Lock,
            },
            {
              title: 'Forbidden',
              url: '/errors/forbidden',
              icon: UserX,
            },
            {
              title: 'Not Found',
              url: '/errors/not-found',
              icon: FileX,
            },
            {
              title: 'Internal Server Error',
              url: '/errors/internal-server-error',
              icon: ServerOff,
            },
            {
              title: 'Maintenance Error',
              url: '/errors/maintenance-error',
              icon: Construction,
            },
          ],
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
