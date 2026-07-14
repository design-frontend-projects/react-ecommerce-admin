import { Link } from '@tanstack/react-router'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'

type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()
  const { t } = useTranslation()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='group mx-1 w-[calc(100%-8px)] rounded-xl transition-all duration-300 hover:bg-primary/5 data-[state=open]:bg-primary/10 data-[state=open]:text-primary-foreground'
              >
                <div className='relative transition-transform duration-300 group-hover:scale-110'>
                  <Avatar className='h-9 w-9 rounded-xl border border-primary/20 shadow-sm'>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className='rounded-xl bg-linear-to-br from-primary/20 to-primary/10 font-bold text-primary'>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-background bg-green-500' />
                </div>
                <div className='ml-2 grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-bold tracking-tight'>
                    {user.name}
                  </span>
                  <span className='truncate text-xs text-muted-foreground'>
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className='ms-auto size-4 text-muted-foreground transition-colors group-hover:text-primary' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='glass-card premium-border w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-2xl p-2 shadow-2xl'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={8}
            >
              <DropdownMenuLabel className='p-2 font-normal'>
                <div className='flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 px-2 py-2 text-start text-sm'>
                  <Avatar className='h-10 w-10 rounded-xl border border-primary/20'>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className='rounded-xl bg-linear-to-br from-primary/20 to-primary/10 font-bold text-primary'>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate text-base leading-none font-bold'>
                      {user.name}
                    </span>
                    <span className='mt-1 truncate text-xs text-muted-foreground'>
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Sparkles />
                  {t('sidebar.upgradeToPro')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to='/settings/account'>
                    <BadgeCheck />
                    {t('sidebar.account')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to='/settings'>
                    <CreditCard />
                    {t('sidebar.billing')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to='/settings/notifications'>
                    <Bell />
                    {t('sidebar.notifications')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => setOpen(true)}
              >
                <LogOut />
                {t('sidebar.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
