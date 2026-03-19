import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ConfigDrawer } from './config-drawer'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-16 transition-all duration-300',
        fixed && 'header-fixed peer/header sticky top-0 w-[inherit]',
        offset > 10
          ? 'border-b bg-background/60 backdrop-blur-md shadow-sm'
          : 'bg-transparent',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative flex h-full items-center gap-3 px-6 sm:gap-4'
        )}
      >
        <SidebarTrigger variant='ghost' className='-ml-2 hover:bg-primary/10' />
        <Separator orientation='vertical' className='h-6 bg-border/50' />
        {children}
        <div className="ml-auto flex items-center gap-2">
          <ConfigDrawer />
        </div>
      </div>
    </header>
  )
}
