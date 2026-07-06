import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ReorderNotificationsBell } from '@/features/pos/components/reorder-notifications-bell'
import { ConfigDrawer } from './config-drawer'
import { useTranslation } from 'react-i18next'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0)
  const { isSignedIn } = useAuth()
  const { selectedBranchId, setSelectedBranchId } = useAuthStore(
    (state) => state.auth
  )
  const { t } = useTranslation()

  const { data: branches, isLoading: isBranchesLoading } = useQuery({
    queryKey: ['branches', 'active', 'header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data
    },
    enabled: !!isSignedIn,
  })

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
        'z-50 h-16 transition-all duration-300 ease-in-out',
        fixed && 'header-fixed peer/header sticky top-0 w-full',
        offset > 10
          ? 'border-b shadow-lg glass shadow-primary/5'
          : 'bg-transparent',
        className
      )}
      {...props}
    >
      <div
        className={cn('relative flex h-full items-center gap-3 px-6 sm:gap-4')}
      >
        <SidebarTrigger
          variant='ghost'
          className='-ml-2 transition-colors duration-200 hover:bg-primary/10 hover:text-primary'
        />
        <Separator orientation='vertical' className='h-6 bg-border/50' />
        {children}
        <div className='ml-auto flex items-center gap-2'>
          {isSignedIn && (
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger className='h-9 w-44' aria-label={t('header.selectBranch')}>
                <SelectValue
                  placeholder={
                    isBranchesLoading ? t('header.loadingBranches') : t('header.selectBranch')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ReorderNotificationsBell />
          <ConfigDrawer />
          {isSignedIn && <ProfileDropdown />}
        </div>
      </div>
    </header>
  )
}
