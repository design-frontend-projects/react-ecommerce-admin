import { useState } from 'react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Search,
  Shield,
  Store,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  SubscriptionTenantUser,
  TenantSubscriptionRecord,
} from '../types'
import { formatQuotaValue } from './subscription-preview-dialog'

interface SubscriptionTenantUsersTabProps {
  tenantUsers: SubscriptionTenantUser[]
  currentSubscription: TenantSubscriptionRecord | null
}

export function SubscriptionTenantUsersTab({
  tenantUsers,
  currentSubscription,
}: SubscriptionTenantUsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  const effectiveMaxUsers =
    currentSubscription?.custom_max_users ??
    currentSubscription?.subscriptions?.max_users ??
    3

  const activeUsersCount = tenantUsers.filter(
    (u) => u.is_active && !u.is_blocked
  ).length
  const inactiveOrBlockedCount = tenantUsers.length - activeUsersCount

  const isUnlimited = effectiveMaxUsers === -1
  const seatPercent = isUnlimited
    ? 15
    : effectiveMaxUsers > 0
      ? Math.min(100, Math.round((activeUsersCount / effectiveMaxUsers) * 100))
      : 0
  const isSeatLimitReached =
    !isUnlimited && activeUsersCount >= effectiveMaxUsers

  const filteredUsers = tenantUsers.filter((u) => {
    const fullName = [u.first_name, u.last_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.phone ?? '').toLowerCase().includes(q) ||
      (u.default_role ?? '').toLowerCase().includes(q) ||
      (u.branch_name ?? '').toLowerCase().includes(q) ||
      (u.store_name ?? '').toLowerCase().includes(q)

    const isUserActive = u.is_active && !u.is_blocked
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isUserActive) ||
      (statusFilter === 'inactive' && !isUserActive)

    return matchesSearch && matchesStatus
  })

  return (
    <div className='space-y-6'>
      {/* Seat Utilization Banner */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='md:col-span-2'>
          <CardHeader className='pb-2'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <Users className='h-5 w-5 text-primary' />
                  Subscription Seat Utilization
                </CardTitle>
                <CardDescription>
                  Active `tenant_users` consuming seats under{' '}
                  <strong>
                    {currentSubscription?.subscriptions?.name ||
                      'your current plan'}
                  </strong>
                  .
                </CardDescription>
              </div>
              <Badge
                variant={isSeatLimitReached ? 'destructive' : 'secondary'}
                className='text-sm'
              >
                {activeUsersCount} / {formatQuotaValue(effectiveMaxUsers)} Seats
                Used
              </Badge>
            </div>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Progress value={seatPercent} className='h-2.5' />
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
              <span>
                {isUnlimited
                  ? 'Your current subscription includes unlimited user seats.'
                  : `${Math.max(0, effectiveMaxUsers - activeUsersCount)} seat(s) remaining on your current plan.`}
              </span>
              {isSeatLimitReached && (
                <span className='flex items-center gap-1 font-medium text-destructive'>
                  <AlertTriangle className='h-3.5 w-3.5' />
                  Seat limit reached — switch to a higher tier plan to add more
                  users.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Tenant User Breakdown</CardTitle>
            <CardDescription>Total accounts in your tenant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-3 pt-1'>
              <div className='rounded-lg border bg-emerald-500/5 p-3'>
                <div className='flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400'>
                  <UserCheck className='h-4 w-4' />
                  Active Users
                </div>
                <p className='mt-1 text-2xl font-bold'>{activeUsersCount}</p>
              </div>
              <div className='rounded-lg border bg-muted/40 p-3'>
                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <UserX className='h-4 w-4' />
                  Inactive / Blocked
                </div>
                <p className='mt-1 text-2xl font-bold'>
                  {inactiveOrBlockedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related Tenant Users Table */}
      <Card>
        <CardHeader>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-lg'>
                Related Tenant Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                All users linked to your tenant and covered by your subscription
                quotas and module permissions.
              </CardDescription>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <div className='relative w-full sm:w-64'>
                <Search className='absolute top-2.5 left-3 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search user, email, role...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-9'
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as 'all' | 'active' | 'inactive')
                }
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Users</SelectItem>
                  <SelectItem value='active'>Active Only</SelectItem>
                  <SelectItem value='inactive'>Inactive / Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant User</TableHead>
                  <TableHead>Role(s)</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Branch / Store</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const fullName =
                    [user.first_name, user.last_name]
                      .filter(Boolean)
                      .join(' ') || 'Unnamed User'
                  const initials = fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  const isActive = user.is_active && !user.is_blocked

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <Avatar className='h-9 w-9'>
                            {user.avatar_url && (
                              <AvatarImage
                                src={user.avatar_url}
                                alt={fullName}
                              />
                            )}
                            <AvatarFallback className='text-xs font-semibold'>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className='font-medium leading-none'>
                              {fullName}
                            </p>
                            <p className='mt-1 text-xs text-muted-foreground'>
                              {user.email || 'No email'}
                              {user.phone ? ` • ${user.phone}` : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {user.roles.length > 0 ? (
                            user.roles.map((r) => (
                              <Badge
                                key={r}
                                variant='outline'
                                className='text-xs capitalize'
                              >
                                <Shield className='mr-1 h-3 w-3 text-primary' />
                                {r.replace('_', ' ')}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant='secondary' className='text-xs'>
                              Member
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {user.modules.map((mod) => (
                            <Badge
                              key={mod}
                              variant={
                                mod === user.primary_module
                                  ? 'default'
                                  : 'secondary'
                              }
                              className='text-[11px] capitalize'
                            >
                              {mod}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className='space-y-0.5 text-xs'>
                          {user.branch_name ? (
                            <div className='flex items-center gap-1'>
                              <Building2 className='h-3 w-3 text-muted-foreground' />
                              <span>{user.branch_name}</span>
                            </div>
                          ) : null}
                          {user.store_name ? (
                            <div className='flex items-center gap-1 text-muted-foreground'>
                              <Store className='h-3 w-3' />
                              <span>{user.store_name}</span>
                            </div>
                          ) : null}
                          {!user.branch_name && !user.store_name && (
                            <span className='text-muted-foreground'>
                              All Locations
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant='destructive'>Blocked</Badge>
                        ) : isActive ? (
                          <Badge className='bg-emerald-600 text-white hover:bg-emerald-700'>
                            <CheckCircle2 className='mr-1 h-3 w-3' />
                            Active Seat
                          </Badge>
                        ) : (
                          <Badge variant='secondary'>Inactive</Badge>
                        )}
                      </TableCell>

                      <TableCell className='text-xs text-muted-foreground'>
                        {user.last_login_at
                          ? format(new Date(user.last_login_at), 'PP')
                          : 'Never'}
                      </TableCell>

                      <TableCell className='text-xs text-muted-foreground'>
                        {user.created_at
                          ? format(new Date(user.created_at), 'PP')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className='h-24 text-center'>
                      No tenant users found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

