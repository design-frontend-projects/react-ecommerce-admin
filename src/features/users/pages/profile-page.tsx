'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  Clock,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Radio,
  Save,
  Shield,
  Store,
  User as UserIcon,
  Warehouse,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as TopSearch } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ChangePasswordDialog } from '../components/change-password-dialog'

export function ProfilePage() {
  const { user } = useUser()
  const userId = user?.id

  const [phone, setPhone] = useState('')
  const [isSavingPhone, setIsSavingPhone] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['my-profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('tenant_users')
        .select(
          `
          *,
          branches:branch_id (id, name),
          countries:country_id (id, name),
          cities:city_id (id, name),
          stores:store_id (store_id, name),
          warehouses:warehouse_id (id, name),
          channels:channel_id (id, name),
          user_roles (
            roles (
              id,
              name
            )
          )
        `
        )
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  useEffect(() => {
    if (profile?.phone) {
      setPhone(profile.phone)
    }
  }, [profile?.phone])

  const handleSavePhone = async () => {
    if (!userId) return
    setIsSavingPhone(true)
    try {
      const { error } = await supabase
        .from('tenant_users')
        .update({ phone, updated_at: new Date().toISOString() })
        .eq('auth_user_id', userId)

      if (error) throw error
      toast.success('Phone number updated successfully.')
      void refetch()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update phone number.'
      )
    } finally {
      setIsSavingPhone(false)
    }
  }

  const roleNames = profile?.user_roles
    ?.map((ur: any) => ur.roles?.name)
    ?.filter(Boolean) ?? [profile?.default_role ?? 'User']

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user?.fullName ||
    user?.email?.split('@')[0] ||
    'User'

  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <Header fixed>
        <TopSearch />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-8'>
        {/* Profile Hero Card */}
        <Card className='relative overflow-hidden border bg-gradient-to-r from-primary/10 via-background to-background p-6 shadow-sm'>
          {isLoading ? (
            <div className='flex items-center gap-4'>
              <Skeleton className='h-20 w-20 rounded-2xl' />
              <div className='space-y-2'>
                <Skeleton className='h-6 w-48' />
                <Skeleton className='h-4 w-64' />
              </div>
            </div>
          ) : (
            <div className='flex flex-col justify-between gap-6 sm:flex-row sm:items-center'>
              <div className='flex items-center gap-5'>
                <Avatar className='h-20 w-20 rounded-2xl border-2 border-primary/20 shadow-md'>
                  <AvatarImage
                    src={profile?.avatar_url ?? user?.avatarUrl}
                    alt={fullName}
                  />
                  <AvatarFallback className='rounded-2xl bg-primary text-2xl font-bold text-primary-foreground'>
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className='space-y-1.5'>
                  <div className='flex flex-wrap items-center gap-2.5'>
                    <h1 className='text-2xl font-bold tracking-tight'>
                      {fullName}
                    </h1>
                    <Badge
                      variant='outline'
                      className='border-primary/20 bg-primary/10 text-primary'
                    >
                      Active
                    </Badge>
                  </div>
                  <p className='flex items-center gap-1.5 text-sm text-muted-foreground'>
                    <Mail className='h-3.5 w-3.5' />
                    {user?.email || profile?.email}
                  </p>
                  <div className='flex flex-wrap gap-1.5 pt-1'>
                    {roleNames.map((roleName: string) => (
                      <Badge
                        key={roleName}
                        variant='secondary'
                        className='text-xs font-semibold tracking-wider capitalize uppercase'
                      >
                        <Shield className='mr-1 h-3 w-3 text-primary' />
                        {roleName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className='flex shrink-0 gap-2 sm:flex-col'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setIsPasswordDialogOpen(true)}
                  className='gap-2'
                >
                  <KeyRound className='h-4 w-4 text-primary' />
                  <span>Change Password</span>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Content Grid */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          {/* Personal & Contact Details */}
          <Card className='shadow-xs'>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base font-bold'>
                <UserIcon className='h-4 w-4 text-primary' />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your account identity and communication settings.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>
                    First Name
                  </Label>
                  <p className='rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-medium'>
                    {profile?.first_name || '—'}
                  </p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>
                    Last Name
                  </Label>
                  <p className='rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-medium'>
                    {profile?.last_name || '—'}
                  </p>
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='text-xs text-muted-foreground'>
                  Email Address (Read-Only)
                </Label>
                <p className='rounded-md border bg-muted/40 px-3 py-1.5 font-mono text-sm text-muted-foreground'>
                  {user?.email || profile?.email || '—'}
                </p>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='profile-phone' className='text-xs font-medium'>
                  Phone Number (Editable)
                </Label>
                <div className='flex gap-2'>
                  <Input
                    id='profile-phone'
                    type='tel'
                    placeholder='+1 234 567 8900'
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className='h-9 text-sm'
                  />
                  <Button
                    size='sm'
                    onClick={handleSavePhone}
                    disabled={isSavingPhone || phone === (profile?.phone ?? '')}
                    className='h-9 shrink-0 gap-1.5'
                  >
                    {isSavingPhone ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <Save className='h-3.5 w-3.5' />
                    )}
                    <span>Save</span>
                  </Button>
                </div>
              </div>

              {profile?.id_number && (
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>
                    National ID / Identification
                  </Label>
                  <p className='rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-medium'>
                    {profile.id_number}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location & Scope (ABAC Attributes) */}
          <Card className='shadow-xs'>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base font-bold'>
                <Globe className='h-4 w-4 text-primary' />
                Location & Workspace Assignments (ABAC)
              </CardTitle>
              <CardDescription>
                Geographic and structural scope assigned to your user account.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3.5'>
              <div className='flex items-center justify-between border-b py-2 text-sm'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Globe className='h-4 w-4 text-muted-foreground/70' />
                  Country:
                </span>
                <span className='font-semibold'>
                  {profile?.countries?.name || 'All Countries (Unrestricted)'}
                </span>
              </div>

              <div className='flex items-center justify-between border-b py-2 text-sm'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <MapPin className='h-4 w-4 text-muted-foreground/70' />
                  City:
                </span>
                <span className='font-semibold'>
                  {profile?.cities?.name || 'All Cities'}
                </span>
              </div>

              <div className='flex items-center justify-between border-b py-2 text-sm'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Building2 className='h-4 w-4 text-muted-foreground/70' />
                  Branch:
                </span>
                <span className='font-semibold'>
                  {profile?.branches?.name || 'All Branches'}
                </span>
              </div>

              <div className='flex items-center justify-between border-b py-2 text-sm'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Store className='h-4 w-4 text-muted-foreground/70' />
                  Assigned Store:
                </span>
                <span className='font-semibold'>
                  {profile?.stores?.name || 'All Stores'}
                </span>
              </div>

              <div className='flex items-center justify-between border-b py-2 text-sm'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Warehouse className='h-4 w-4 text-muted-foreground/70' />
                  Assigned Warehouse:
                </span>
                <span className='font-semibold'>
                  {profile?.warehouses?.name || 'All Warehouses'}
                </span>
              </div>

              <div className='flex items-center justify-between py-2 text-sm'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Radio className='h-4 w-4 text-muted-foreground/70' />
                  Sales Channel:
                </span>
                <span className='font-semibold'>
                  {profile?.channels?.name || 'All Channels'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security & Activity Card */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base font-bold'>
              <Shield className='h-4 w-4 text-primary' />
              Security & Account Activity
            </CardTitle>
            <CardDescription>
              Account timestamps and security lifecycle events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <div className='space-y-1 rounded-lg border bg-muted/20 p-3.5'>
                <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <Calendar className='h-3.5 w-3.5' />
                  Account Created
                </span>
                <p className='text-sm font-semibold'>
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString(
                        undefined,
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )
                    : '—'}
                </p>
              </div>

              <div className='space-y-1 rounded-lg border bg-muted/20 p-3.5'>
                <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <Clock className='h-3.5 w-3.5' />
                  Last Login
                </span>
                <p className='text-sm font-semibold'>
                  {profile?.last_login_at
                    ? new Date(profile.last_login_at).toLocaleString()
                    : 'Active now'}
                </p>
              </div>

              <div className='space-y-1 rounded-lg border bg-muted/20 p-3.5'>
                <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <KeyRound className='h-3.5 w-3.5' />
                  Password Changed
                </span>
                <p className='text-sm font-semibold'>
                  {profile?.password_changed_at
                    ? new Date(profile.password_changed_at).toLocaleDateString(
                        undefined,
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )
                    : 'Not changed yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <ChangePasswordDialog
          open={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
          onSuccess={() => void refetch()}
        />
      </Main>
    </>
  )
}
