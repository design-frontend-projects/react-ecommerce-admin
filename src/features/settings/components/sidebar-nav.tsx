import { type JSX } from 'react'
import { useLocation, useNavigate, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SidebarNavProps = React.HTMLAttributes<HTMLElement> & {
  items: {
    href: string
    title: string
    icon: JSX.Element
  }[]
}

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // ─── Reactive Route Tracking (Eliminates Mobile Select Desync) ─────
  const currentPath = normalizePath(pathname)
  const activeItem = items.find((item) => normalizePath(item.href) === currentPath)
  const activeValue =
    activeItem?.href ??
    (items.some((i) => normalizePath(i.href) === '/settings')
      ? '/settings'
      : items[0]?.href ?? '/settings')

  const handleSelect = (newHref: string) => {
    navigate({ to: newHref as never })
  }

  return (
    <>
      {/* ─── Mobile View: Route-Synchronized Select Dropdown ─────────── */}
      <div className='p-1 md:hidden'>
        <Select value={activeValue} onValueChange={handleSelect}>
          <SelectTrigger className='h-11 w-full'>
            <SelectValue
              placeholder={t('settings.nav.selectSection', 'Select section')}
            />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                <div className='flex items-center gap-3 px-1 py-1'>
                  <span className='shrink-0 text-muted-foreground'>
                    {item.icon}
                  </span>
                  <span className='font-medium'>{item.title}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── Tablet / Desktop View: Scrollable Nav with Logical Gap ───── */}
      <ScrollArea
        orientation='horizontal'
        type='auto'
        className='hidden w-full min-w-40 bg-background px-1 py-2 md:block'
      >
        <nav
          className={cn(
            'flex flex-row gap-2 py-1 lg:flex-col lg:gap-1',
            className
          )}
          {...props}
        >
          {items.map((item) => {
            const isActive = normalizePath(pathname) === normalizePath(item.href)
            return (
              <Link
                key={item.href}
                to={item.href as never}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  isActive
                    ? 'bg-muted font-medium text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'justify-start'
                )}
              >
                <span
                  className={cn(
                    'me-2 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.icon}
                </span>
                <span className='truncate'>{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </>
  )
}
