import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'

export function NavGroup({ title, items }: NavGroupProps) {
  const { state } = useSidebar()
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className='px-4 text-[11px] font-bold tracking-wider text-muted-foreground/50 uppercase'>
        {title}
      </SidebarGroupLabel>
      <SidebarMenu className='gap-1 px-2'>
        {items.map((item) => {
          const key = `${item.title}-${item.url}`

          if (!('items' in item)) {
            return <SidebarMenuLink key={key} item={item} href={pathname} />
          }

          if (state === 'collapsed') {
            return (
              <SidebarMenuCollapsedDropdown
                key={key}
                item={item}
                href={pathname}
              />
            )
          }

          return (
            <SidebarMenuCollapsible key={key} item={item} href={pathname} />
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return (
    <Badge className='rounded-full border-primary/20 bg-primary/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase shadow-sm backdrop-blur-md'>
      {children}
    </Badge>
  )
}

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar()
  const isActive = checkIsActive(href, item)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className={cn(
          'group relative h-10 w-full justify-start gap-3 rounded-xl transition-all duration-300',
          isActive
            ? 'bg-primary/10 font-bold text-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]'
            : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
        )}
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && (
            <item.icon
              className={cn(
                'size-4.5 transition-transform duration-300 group-hover:scale-110',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-primary'
              )}
            />
          )}
          <span className='flex-1 truncate'>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
          {isActive && (
            <motion.div
              layoutId='active-pill'
              className='absolute right-2 size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]'
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  const { setOpenMobile } = useSidebar()
  const isActive = checkIsActive(href, item, true)

  return (
    <Collapsible asChild defaultOpen={isActive} className='group/collapsible'>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className={cn(
              'group h-10 w-full justify-start gap-3 rounded-xl transition-all duration-300',
              isActive
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
            )}
          >
            {item.icon && (
              <item.icon
                className={cn(
                  'size-4.5 transition-transform duration-300 group-hover:scale-110',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-primary'
                )}
              />
            )}
            <span className='flex-1 truncate'>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto size-4 text-muted-foreground/50 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
          <SidebarMenuSub className='my-1 ml-4 space-y-1 border-l border-primary/10 pl-2'>
            {item.items.map((subItem) => {
              const isSubActive = checkIsActive(href, subItem)
              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isSubActive}
                    className={cn(
                      'h-9 rounded-lg transition-all duration-200',
                      isSubActive
                        ? 'bg-primary/5 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                    )}
                  >
                    <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                      {subItem.icon && (
                        <subItem.icon
                          className={cn(
                            'size-4 transition-colors',
                            isSubActive
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-primary'
                          )}
                        />
                      )}
                      <span className='truncate text-sm'>{subItem.title}</span>
                      {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  const isActive = checkIsActive(href, item)

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isActive}
            className={cn(
              'rounded-xl transition-all duration-300',
              isActive ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'
            )}
          >
            {item.icon && <item.icon className='size-4.5' />}
            <span className='sr-only'>{item.title}</span>
            {item.badge && (
              <div className='absolute -top-1 -right-1 rounded-full bg-primary px-1 py-0.5 text-[8px] font-bold text-white'>
                {item.badge}
              </div>
            )}
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side='right'
          align='start'
          sideOffset={8}
          className='w-56 overflow-hidden rounded-2xl border-white/20 bg-background/80 p-2 shadow-2xl backdrop-blur-xl'
        >
          <DropdownMenuLabel className='flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-wider text-muted-foreground/70 uppercase'>
            {item.title}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className='bg-primary/5' />
          {item.items.map((sub) => {
            const isSubActive = checkIsActive(href, sub)
            return (
              <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
                <Link
                  to={sub.url}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                    isSubActive
                      ? 'bg-primary/10 font-bold text-primary'
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                  )}
                >
                  {sub.icon && <sub.icon className='size-4' />}
                  <span className='flex-1 truncate text-sm'>{sub.title}</span>
                  {sub.badge && <NavBadge>{sub.badge}</NavBadge>}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    href === item.url ||
    href.split('?')[0] === item.url ||
    ('items' in item && !!item.items?.some((i) => i.url === href)) ||
    (mainNav &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === item?.url?.split('/')[1])
  )
}
