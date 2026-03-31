import { getRouteApi } from '@tanstack/react-router'
// Fixing imports:
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { RolesManagement } from './components/roles-management'
import { PermissionsManagement } from './components/permissions-management'
import { useUsersList } from './hooks/use-users'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const route = getRouteApi('/_authenticated/users')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const { data: users = [], isLoading } = useUsersList()

  return (
    <UsersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Access Management</h2>
            <p className='text-muted-foreground'>
              Manage your users, roles, and granular permissions here.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>

        <Tabs defaultValue='users' className='w-full'>
          <TabsList className='mb-4'>
            <TabsTrigger value='users'>Users</TabsTrigger>
            <TabsTrigger value='roles'>Roles</TabsTrigger>
            <TabsTrigger value='permissions'>Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value='users' className='m-0 focus-visible:outline-none'>
            {isLoading ? (
              <div className='space-y-4 rounded-md border p-4'>
                <div className='flex items-center justify-between'>
                  <Skeleton className='h-8 w-[250px]' />
                  <Skeleton className='h-8 w-[100px]' />
                </div>
                <div className='space-y-2'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              </div>
            ) : (
              <UsersTable data={users} search={search} navigate={navigate} />
            )}
          </TabsContent>

          <TabsContent value='roles' className='m-0 focus-visible:outline-none'>
            <RolesManagement />
          </TabsContent>

          <TabsContent value='permissions' className='m-0 focus-visible:outline-none'>
            <PermissionsManagement />
          </TabsContent>
        </Tabs>
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}

