import { useState, useMemo } from 'react'
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  MoreHorizontal,
  Unlock,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  Users,
  Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  usePosUserPins,
  useSetUserPinMutation,
  useToggleUserPinStatusMutation,
  useUnlockUserPinMutation,
  useResetUserPinAttemptsMutation,
  usePosTerminals,
} from '../hooks/use-pos-queries'
import type { UserPinItem } from '../services/pos-client'

export function PosUserPinsTable() {
  const [search, setSearch] = useState('')
  const [terminalFilter, setTerminalFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'locked'>('all')

  // Edit / Set PIN Dialog state
  const [selectedUser, setSelectedUser] = useState<UserPinItem | null>(null)
  const [newPin, setNewPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [isPinActive, setIsPinActive] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: terminals = [] } = usePosTerminals()
  const { data: response, isLoading, refetch } = usePosUserPins({
    terminalId: terminalFilter,
    search: search.trim() || undefined,
    status: statusFilter,
  })

  const setPinMutation = useSetUserPinMutation()
  const toggleStatusMutation = useToggleUserPinStatusMutation()
  const unlockMutation = useUnlockUserPinMutation()
  const resetAttemptsMutation = useResetUserPinAttemptsMutation()

  const userPins = useMemo(() => response?.data || [], [response?.data])

  // Aggregate stats
  const totalUsers = userPins.length
  const configuredPins = userPins.filter((u) => u.hasPin).length
  const activePins = userPins.filter((u) => u.hasPin && u.isPinActive && !u.isLocked).length
  const lockedUsers = userPins.filter((u) => u.isLocked).length

  const handleOpenSetPin = (user: UserPinItem) => {
    setSelectedUser(user)
    setNewPin('')
    setShowPin(false)
    setIsPinActive(user.hasPin ? user.isPinActive : true)
    setIsDialogOpen(true)
  }

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      toast.error('PIN must be between 4 and 8 numeric digits')
      return
    }

    try {
      await setPinMutation.mutateAsync({
        userId: selectedUser.id,
        pin: newPin,
        isActive: isPinActive,
      })
      toast.success(`PIN successfully set for ${selectedUser.name}`)
      setIsDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update PIN')
    }
  }

  const handleToggleStatus = async (user: UserPinItem) => {
    const nextStatus = !user.isPinActive
    try {
      await toggleStatusMutation.mutateAsync({
        userId: user.id,
        isActive: nextStatus,
      })
      toast.success(`PIN for ${user.name} is now ${nextStatus ? 'active' : 'inactive'}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status')
    }
  }

  const handleUnlock = async (user: UserPinItem) => {
    try {
      await unlockMutation.mutateAsync(user.id)
      toast.success(`Account unlocked for ${user.name}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock account')
    }
  }

  const handleResetAttempts = async (user: UserPinItem) => {
    try {
      await resetAttemptsMutation.mutateAsync(user.id)
      toast.success(`Failed attempts reset for ${user.name}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset attempts')
    }
  }

  return (
    <div className='space-y-4'>
      {/* KPI Stats Cards */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Card className='p-3 sm:p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-primary/10 p-2 text-primary'>
              <Users className='h-4 w-4' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Total Cashiers</p>
              <p className='text-lg font-bold'>{totalUsers}</p>
            </div>
          </div>
        </Card>

        <Card className='p-3 sm:p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-emerald-500/10 p-2 text-emerald-600'>
              <KeyRound className='h-4 w-4' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>PINs Configured</p>
              <p className='text-lg font-bold'>{configuredPins}</p>
            </div>
          </div>
        </Card>

        <Card className='p-3 sm:p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-blue-500/10 p-2 text-blue-600'>
              <ShieldCheck className='h-4 w-4' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Active & Authorized</p>
              <p className='text-lg font-bold'>{activePins}</p>
            </div>
          </div>
        </Card>

        <Card className='p-3 sm:p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-rose-500/10 p-2 text-rose-600'>
              <ShieldAlert className='h-4 w-4' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Locked Accounts</p>
              <p className='text-lg font-bold text-rose-600'>{lockedUsers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-1 items-center gap-2'>
          <div className='relative flex-1 max-w-sm'>
            <Search className='absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search cashier name, email...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='h-8 pl-8 text-xs'
            />
          </div>

          <Select value={terminalFilter} onValueChange={setTerminalFilter}>
            <SelectTrigger className='h-8 w-[170px] text-xs'>
              <Monitor className='mr-1.5 h-3 w-3 text-muted-foreground' />
              <SelectValue placeholder='All Terminals' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>
                All Terminals
              </SelectItem>
              {terminals.map((t) => (
                <SelectItem key={t.id} value={t.id} className='text-xs'>
                  {t.code} — {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className='h-8 w-[140px] text-xs'>
              <Filter className='mr-1.5 h-3 w-3 text-muted-foreground' />
              <SelectValue placeholder='All Statuses' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>All Statuses</SelectItem>
              <SelectItem value='active' className='text-xs'>Active PINs</SelectItem>
              <SelectItem value='inactive' className='text-xs'>No PIN / Inactive</SelectItem>
              <SelectItem value='locked' className='text-xs'>Locked Accounts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='h-8 text-xs gap-1.5'
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* PINs Data Table */}
      <div className='rounded-lg border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[240px] text-xs font-bold uppercase'>Cashier</TableHead>
              <TableHead className='text-xs font-bold uppercase'>Assigned Terminals</TableHead>
              <TableHead className='text-xs font-bold uppercase'>PIN Status</TableHead>
              <TableHead className='text-xs font-bold uppercase'>Failed Attempts</TableHead>
              <TableHead className='text-xs font-bold uppercase'>Lockout State</TableHead>
              <TableHead className='text-xs font-bold uppercase'>Active</TableHead>
              <TableHead className='text-right text-xs font-bold uppercase'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className='h-32 text-center'>
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <Loader2 className='h-6 w-6 animate-spin text-primary' />
                    <span className='text-xs'>Loading cashier PINs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : userPins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='h-32 text-center'>
                  <div className='flex flex-col items-center justify-center gap-1.5 text-muted-foreground'>
                    <KeyRound className='h-8 w-8 text-muted-foreground/40' />
                    <p className='text-sm font-semibold'>No cashiers found</p>
                    <p className='text-xs'>Try clearing search or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              userPins.map((user) => (
                <TableRow key={user.id} className='hover:bg-muted/50'>
                  {/* Cashier Info */}
                  <TableCell>
                    <div className='flex items-center gap-2.5'>
                      <Avatar className='h-8 w-8'>
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                        <AvatarFallback className='text-xs font-bold'>
                          {user.name
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5'>
                          <p className='truncate font-semibold text-xs'>{user.name}</p>
                          <Badge variant='outline' className='text-[9px] capitalize py-0 px-1'>
                            {user.role}
                          </Badge>
                        </div>
                        <p className='truncate text-[10px] text-muted-foreground'>{user.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Assigned Terminals */}
                  <TableCell>
                    <div className='flex flex-wrap gap-1 max-w-[200px]'>
                      {user.assignedTerminals.length === 0 ? (
                        <span className='text-[10px] text-muted-foreground italic'>
                          No terminals assigned
                        </span>
                      ) : (
                        user.assignedTerminals.map((t) => (
                          <Badge
                            key={t.id}
                            variant='secondary'
                            className='text-[9px] font-mono px-1.5'
                          >
                            {t.code}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>

                  {/* PIN Configured Status */}
                  <TableCell>
                    {user.hasPin ? (
                      <Badge
                        variant='secondary'
                        className='gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20'
                      >
                        <ShieldCheck className='h-3 w-3' /> Configured
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='gap-1 text-[10px] text-amber-600 border-amber-300'>
                        <KeyRound className='h-3 w-3' /> Not Configured
                      </Badge>
                    )}
                  </TableCell>

                  {/* Failed Attempts */}
                  <TableCell>
                    <Badge
                      variant={user.failedAttempts >= 5 ? 'destructive' : user.failedAttempts > 0 ? 'secondary' : 'outline'}
                      className='text-[10px] font-mono'
                    >
                      {user.failedAttempts} / 5
                    </Badge>
                  </TableCell>

                  {/* Lockout State */}
                  <TableCell>
                    {user.isLocked ? (
                      <Badge variant='destructive' className='gap-1 text-[10px]'>
                        <ShieldAlert className='h-3 w-3' /> Locked
                      </Badge>
                    ) : (
                      <span className='text-[11px] text-muted-foreground'>Normal</span>
                    )}
                  </TableCell>

                  {/* Active Switch */}
                  <TableCell>
                    <Switch
                      checked={user.isPinActive}
                      onCheckedChange={() => handleToggleStatus(user)}
                      disabled={!user.hasPin || toggleStatusMutation.isPending}
                    />
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon' className='h-7 w-7'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-48 text-xs'>
                        <DropdownMenuLabel>Manage PIN: {user.name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleOpenSetPin(user)}>
                          <KeyRound className='mr-2 h-3.5 w-3.5 text-primary' />
                          {user.hasPin ? 'Reset PIN Code' : 'Assign New PIN'}
                        </DropdownMenuItem>

                        {user.isLocked && (
                          <DropdownMenuItem onClick={() => handleUnlock(user)}>
                            <Unlock className='mr-2 h-3.5 w-3.5 text-emerald-600' />
                            Unlock Account
                          </DropdownMenuItem>
                        )}

                        {user.failedAttempts > 0 && (
                          <DropdownMenuItem onClick={() => handleResetAttempts(user)}>
                            <RotateCcw className='mr-2 h-3.5 w-3.5 text-blue-600' />
                            Clear Failed Attempts
                          </DropdownMenuItem>
                        )}

                        {user.hasPin && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                            <ShieldCheck className='mr-2 h-3.5 w-3.5' />
                            {user.isPinActive ? 'Deactivate PIN' : 'Activate PIN'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Set / Reset PIN Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <div className='flex items-center gap-2'>
              <KeyRound className='h-5 w-5 text-primary' />
              <DialogTitle>
                {selectedUser?.hasPin ? 'Update Cashier PIN' : 'Assign Cashier PIN'}
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs'>
              Configuring security PIN for{' '}
              <strong className='text-foreground'>{selectedUser?.name}</strong>. This PIN is required
              for POS cash drawer access, shift sign-in, and in-session refund authorizations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePin} className='space-y-4 pt-2'>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-bold'>New Numeric PIN *</Label>
                <span className='text-[10px] text-muted-foreground'>4 to 8 digits</span>
              </div>
              <div className='relative'>
                <Input
                  type={showPin ? 'text' : 'password'}
                  maxLength={8}
                  placeholder='••••'
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className='h-11 text-center font-mono text-2xl tracking-[0.5em]'
                  autoFocus
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-muted-foreground'
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                </Button>
              </div>
            </div>

            <div className='flex items-center justify-between rounded-lg border p-3 bg-muted/20'>
              <div className='space-y-0.5'>
                <Label className='text-xs font-semibold'>Activate Immediately</Label>
                <p className='text-[11px] text-muted-foreground'>
                  Authorizes cashier to immediately use this PIN for shifts and refunds.
                </p>
              </div>
              <Switch checked={isPinActive} onCheckedChange={setIsPinActive} />
            </div>

            <DialogFooter className='gap-2 pt-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={setPinMutation.isPending || newPin.length < 4}
                className='gap-1.5'
              >
                {setPinMutation.isPending ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' /> Saving...
                  </>
                ) : (
                  <>
                    <Check className='h-4 w-4' /> Save PIN
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
