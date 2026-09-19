import { useState, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  AlertCircle,
  Check,
  Filter,
  Loader2,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
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
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  useAssignTerminalUsersMutation,
  useBatchRemoveTerminalUsersMutation,
  usePosTerminalUsers,
  useRemoveTerminalUserMutation,
  useToggleTerminalUserStatusMutation,
} from '../hooks/use-pos-queries'
import type { TerminalUserAssignment } from '../services/pos-client'

export function PosTerminalUsersPage() {
  // Query param from URL (e.g. ?terminalId=...)
  const searchParams = useSearch({ strict: false }) as { terminalId?: string }

  // Component states
  const [selectedTerminalFilter, setSelectedTerminalFilter] = useState<string>(
    searchParams?.terminalId || 'all'
  )
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([])

  // Modal dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignTerminalId, setAssignTerminalId] = useState<string>('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [assignUserSearch, setAssignUserSearch] = useState('')

  // Delete dialog state
  const [assignmentToDelete, setAssignmentToDelete] = useState<TerminalUserAssignment | null>(null)
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false)

  // API Queries & Mutations
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = usePosTerminalUsers({
    terminalId: selectedTerminalFilter !== 'all' ? selectedTerminalFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const assignMutation = useAssignTerminalUsersMutation()
  const toggleMutation = useToggleTerminalUserStatusMutation()
  const removeMutation = useRemoveTerminalUserMutation()
  const batchRemoveMutation = useBatchRemoveTerminalUsersMutation()

  const assignments = useMemo(() => data?.assignments || [], [data?.assignments])
  const terminals = useMemo(() => data?.terminals || [], [data?.terminals])
  const availableUsers = useMemo(() => data?.users || [], [data?.users])

  // Filtered assignments by search query
  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return assignments

    return assignments.filter((a) => {
      return (
        a.userName.toLowerCase().includes(query) ||
        a.userEmail.toLowerCase().includes(query) ||
        a.terminalCode.toLowerCase().includes(query) ||
        a.terminalName.toLowerCase().includes(query) ||
        a.userRole.toLowerCase().includes(query)
      )
    })
  }, [assignments, searchQuery])

  // KPIs
  const totalTerminals = terminals.length
  const totalAssignments = assignments.length
  const activeAssignments = assignments.filter((a) => a.isActive).length
  const inactiveAssignments = totalAssignments - activeAssignments

  // Helpers for Assign Modal
  const openAssignModal = (preselectedTerminalId?: string) => {
    const targetTerminalId =
      preselectedTerminalId ||
      (selectedTerminalFilter !== 'all' ? selectedTerminalFilter : terminals[0]?.id || '')

    setAssignTerminalId(targetTerminalId)
    setSelectedUserIds([])
    setAssignUserSearch('')
    setIsAssignDialogOpen(true)
  }

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignTerminalId) {
      toast.error('Please select a target terminal')
      return
    }
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one cashier to assign')
      return
    }

    try {
      await assignMutation.mutateAsync({
        terminalId: assignTerminalId,
        userIds: selectedUserIds,
        isActive: true,
      })

      const terminalObj = terminals.find((t) => t.id === assignTerminalId)
      toast.success(
        `Successfully assigned ${selectedUserIds.length} cashier(s) to ${terminalObj?.code || 'terminal'}`
      )
      setIsAssignDialogOpen(false)
      setSelectedUserIds([])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign cashiers')
    }
  }

  const handleToggleStatus = async (assignment: TerminalUserAssignment) => {
    const newStatus = !assignment.isActive
    try {
      await toggleMutation.mutateAsync({
        id: assignment.id,
        isActive: newStatus,
      })
      toast.success(
        `Authorization for ${assignment.userName} on ${assignment.terminalCode} is now ${
          newStatus ? 'Active' : 'Inactive'
        }`
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update cashier authorization')
    }
  }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return
    try {
      await removeMutation.mutateAsync(assignmentToDelete.id)
      toast.success(
        `Removed ${assignmentToDelete.userName} from ${assignmentToDelete.terminalCode}`
      )
      setAssignmentToDelete(null)
      setSelectedAssignmentIds((prev) => prev.filter((id) => id !== assignmentToDelete.id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove cashier assignment')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedAssignmentIds.length === 0) return
    try {
      await batchRemoveMutation.mutateAsync(selectedAssignmentIds)
      toast.success(`Removed ${selectedAssignmentIds.length} cashier assignment(s)`)
      setSelectedAssignmentIds([])
      setIsBatchDeleteDialogOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove selected assignments')
    }
  }

  const toggleSelectAll = () => {
    if (selectedAssignmentIds.length === filteredAssignments.length) {
      setSelectedAssignmentIds([])
    } else {
      setSelectedAssignmentIds(filteredAssignments.map((a) => a.id))
    }
  }

  // Already assigned user IDs for the currently selected modal terminal
  const existingAssignedUserIds = useMemo(() => {
    if (!assignTerminalId) return new Set<string>()
    return new Set(
      assignments.filter((a) => a.terminalId === assignTerminalId).map((a) => a.userId)
    )
  }, [assignments, assignTerminalId])

  // Filtered available users in modal
  const modalFilteredUsers = useMemo(() => {
    const q = assignUserSearch.trim().toLowerCase()
    if (!q) return availableUsers
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    )
  }, [availableUsers, assignUserSearch])

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Top Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-3xl font-extrabold tracking-tight'>
              Terminal Users
            </h1>
            <Badge variant='outline' className='font-mono text-xs font-semibold'>
              pos_terminal_users
            </Badge>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            Authorize cashiers and operators to specific POS checkout terminals, manage credentials, and toggle register permissions.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className='gap-1.5'
            title='Refresh assignments'
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', (isLoading || isRefetching) && 'animate-spin')}
            />
            <span className='hidden sm:inline'>Refresh</span>
          </Button>

          <Button
            onClick={() => openAssignModal()}
            className='gap-2 bg-primary text-primary-foreground shadow-xs'
          >
            <Plus className='h-4 w-4' /> Assign Cashiers
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
        <Card className='shadow-xs transition-all hover:border-primary/40'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>
              Total Terminals
            </CardTitle>
            <Monitor className='h-4 w-4 text-primary' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalTerminals}</div>
            <p className='mt-0.5 text-xs text-muted-foreground'>Available checkout stations</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs transition-all hover:border-primary/40'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>
              Total Assignments
            </CardTitle>
            <Users className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalAssignments}</div>
            <p className='mt-0.5 text-xs text-muted-foreground'>Cashier-to-terminal mappings</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs transition-all hover:border-emerald-500/40'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>
              Active Authorizations
            </CardTitle>
            <ShieldCheck className='h-4 w-4 text-emerald-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
              {activeAssignments}
            </div>
            <p className='mt-0.5 text-xs text-muted-foreground'>Permitted to open shifts</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs transition-all hover:border-amber-500/40'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>
              Restricted / Inactive
            </CardTitle>
            <ShieldAlert className='h-4 w-4 text-amber-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
              {inactiveAssignments}
            </div>
            <p className='mt-0.5 text-xs text-muted-foreground'>Access temporarily revoked</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <Card className='p-4 shadow-xs'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          {/* Search bar */}
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search cashier name, email, terminal code...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-9 pl-9 pr-8 text-xs sm:text-sm'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>

          {/* Filters & View toggles */}
          <div className='flex flex-wrap items-center gap-2'>
            {/* Terminal Filter */}
            <div className='flex items-center gap-1.5'>
              <Filter className='h-3.5 w-3.5 text-muted-foreground' />
              <Select
                value={selectedTerminalFilter}
                onValueChange={setSelectedTerminalFilter}
              >
                <SelectTrigger className='h-9 w-[180px] text-xs font-medium'>
                  <SelectValue placeholder='All Terminals' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Terminals ({terminals.length})</SelectItem>
                  {terminals.map((t) => (
                    <SelectItem key={t.id} value={t.id} className='text-xs'>
                      {t.code} - {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Tabs */}
            <div className='flex items-center rounded-md border bg-muted/30 p-0.5 text-xs font-medium'>
              <button
                type='button'
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'rounded-sm px-2.5 py-1 transition-colors',
                  statusFilter === 'all'
                    ? 'bg-background font-bold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>
              <button
                type='button'
                onClick={() => setStatusFilter('active')}
                className={cn(
                  'rounded-sm px-2.5 py-1 transition-colors',
                  statusFilter === 'active'
                    ? 'bg-background font-bold text-emerald-600 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Active
              </button>
              <button
                type='button'
                onClick={() => setStatusFilter('inactive')}
                className={cn(
                  'rounded-sm px-2.5 py-1 transition-colors',
                  statusFilter === 'inactive'
                    ? 'bg-background font-bold text-amber-600 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Inactive
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className='flex items-center rounded-md border bg-muted/30 p-0.5 text-xs'>
              <button
                type='button'
                onClick={() => setViewMode('table')}
                className={cn(
                  'rounded-sm px-2.5 py-1 font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Table View
              </button>
              <button
                type='button'
                onClick={() => setViewMode('cards')}
                className={cn(
                  'rounded-sm px-2.5 py-1 font-medium transition-colors',
                  viewMode === 'cards'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                By Terminal
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Floating Bar */}
        {selectedAssignmentIds.length > 0 && (
          <div className='mt-3 flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs'>
            <div className='flex items-center gap-2'>
              <span className='font-bold text-primary'>
                {selectedAssignmentIds.length} assignment(s) selected
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='destructive'
                size='sm'
                className='h-7 gap-1.5 text-xs'
                onClick={() => setIsBatchDeleteDialogOpen(true)}
              >
                <Trash2 className='h-3.5 w-3.5' /> Remove Selected
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs'
                onClick={() => setSelectedAssignmentIds([])}
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <div className='flex h-64 items-center justify-center rounded-lg border bg-card'>
          <div className='flex flex-col items-center gap-2'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs font-semibold text-muted-foreground'>
              Loading cashier terminal authorizations...
            </p>
          </div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='space-y-3 py-16 text-center'>
            <UserX className='mx-auto h-12 w-12 text-muted-foreground opacity-30' />
            <h3 className='text-lg font-bold'>No Cashier Assignments Found</h3>
            <p className='mx-auto max-w-md text-sm text-muted-foreground'>
              {searchQuery || selectedTerminalFilter !== 'all' || statusFilter !== 'all'
                ? 'No assignments match the active search or filter criteria. Try adjusting filters.'
                : 'No cashiers are currently assigned to checkout terminals. Assign cashiers to authorize them for POS register shifts.'}
            </p>
            <Button
              onClick={() => openAssignModal()}
              variant='outline'
              className='mt-2 gap-1.5'
            >
              <Plus className='h-4 w-4' /> Assign Cashiers Now
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* ── Table View ── */
        <Card className='overflow-hidden shadow-xs'>
          <Table>
            <TableHeader className='bg-muted/40'>
              <TableRow>
                <TableHead className='w-10'>
                  <Checkbox
                    checked={
                      filteredAssignments.length > 0 &&
                      selectedAssignmentIds.length === filteredAssignments.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label='Select all'
                  />
                </TableHead>
                <TableHead>Cashier / Operator</TableHead>
                <TableHead>Assigned Terminal</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access Status</TableHead>
                <TableHead>Assigned On</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => {
                const isSelected = selectedAssignmentIds.includes(assignment.id)
                const initials = assignment.userName
                  .split(' ')
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'CA'

                return (
                  <TableRow
                    key={assignment.id}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          setSelectedAssignmentIds((prev) =>
                            prev.includes(assignment.id)
                              ? prev.filter((id) => id !== assignment.id)
                              : [...prev, assignment.id]
                          )
                        }}
                        aria-label={`Select ${assignment.userName}`}
                      />
                    </TableCell>

                    <TableCell>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-9 w-9 border'>
                          {assignment.avatarUrl && (
                            <AvatarImage
                              src={assignment.avatarUrl}
                              alt={assignment.userName}
                            />
                          )}
                          <AvatarFallback className='text-xs font-bold'>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='font-semibold text-sm'>
                            {assignment.userName}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {assignment.userEmail || assignment.userPhone || 'No contact info'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant='secondary'
                          className='font-mono font-bold text-xs'
                        >
                          {assignment.terminalCode}
                        </Badge>
                        <span className='font-medium text-xs'>
                          {assignment.terminalName}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant='outline'
                        className='capitalize text-[11px] font-semibold'
                      >
                        {assignment.userRole}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className='flex items-center gap-2.5'>
                        <Switch
                          checked={assignment.isActive}
                          onCheckedChange={() => handleToggleStatus(assignment)}
                          disabled={toggleMutation.isPending}
                        />
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            assignment.isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          {assignment.isActive ? 'Authorized' : 'Restricted'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className='text-xs text-muted-foreground font-mono'>
                      {new Date(assignment.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>

                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 w-8 p-0'
                          >
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-48'>
                          <DropdownMenuLabel className='text-xs'>
                            Assignment Options
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(assignment)}
                            className='cursor-pointer text-xs'
                          >
                            {assignment.isActive ? (
                              <>
                                <UserX className='mr-2 h-3.5 w-3.5 text-amber-500' />
                                Revoke Authorization
                              </>
                            ) : (
                              <>
                                <UserCheck className='mr-2 h-3.5 w-3.5 text-emerald-500' />
                                Grant Authorization
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setAssignmentToDelete(assignment)}
                            className='cursor-pointer text-xs text-rose-600 focus:text-rose-600'
                          >
                            <Trash2 className='mr-2 h-3.5 w-3.5' />
                            Remove from Terminal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* ── Cards Grouped by Terminal ── */
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {terminals.map((term) => {
            const terminalAssignments = filteredAssignments.filter(
              (a) => a.terminalId === term.id
            )

            return (
              <Card
                key={term.id}
                className='flex flex-col justify-between overflow-hidden shadow-xs transition-shadow hover:shadow-md'
              >
                <CardHeader className='border-b bg-muted/20 pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <Monitor className='h-4 w-4 text-primary' />
                        <CardTitle className='text-base'>{term.name}</CardTitle>
                      </div>
                      <CardDescription className='font-mono text-xs font-semibold'>
                        Code: {term.code}
                      </CardDescription>
                    </div>

                    <Badge
                      variant={terminalAssignments.length > 0 ? 'default' : 'outline'}
                      className='text-xs'
                    >
                      {terminalAssignments.length} Cashier{terminalAssignments.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className='flex-1 space-y-3 pt-4'>
                  {terminalAssignments.length === 0 ? (
                    <div className='rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground'>
                      No cashiers assigned to this terminal yet.
                    </div>
                  ) : (
                    <div className='space-y-2 max-h-56 overflow-y-auto pr-1'>
                      {terminalAssignments.map((a) => (
                        <div
                          key={a.id}
                          className='flex items-center justify-between rounded-md border bg-card p-2 text-xs'
                        >
                          <div className='flex items-center gap-2.5'>
                            <Avatar className='h-7 w-7'>
                              {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.userName} />}
                              <AvatarFallback className='text-[10px] font-bold'>
                                {a.userName
                                  .split(' ')
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className='font-semibold leading-tight'>{a.userName}</p>
                              <p className='text-[10px] text-muted-foreground'>{a.userRole}</p>
                            </div>
                          </div>

                          <div className='flex items-center gap-1.5'>
                            <Switch
                              checked={a.isActive}
                              onCheckedChange={() => handleToggleStatus(a)}
                              className='scale-90'
                            />
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => setAssignmentToDelete(a)}
                              className='h-7 w-7 p-0 text-muted-foreground hover:text-rose-600'
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                <div className='border-t bg-muted/10 p-3'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full gap-1.5 text-xs font-semibold'
                    onClick={() => openAssignModal(term.id)}
                  >
                    <Plus className='h-3.5 w-3.5' /> Assign Cashier to {term.code}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Assign Cashiers Modal Dialog ── */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Assign Cashiers to Terminal</DialogTitle>
            <DialogDescription>
              Select an authorized register terminal and check the staff members who should be permitted to log in and conduct sales on it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className='space-y-4 py-2'>
            {/* Target Terminal Select */}
            <div className='space-y-2'>
              <Label htmlFor='modalTerminal' className='text-xs font-bold uppercase'>
                Target Terminal *
              </Label>
              <Select
                value={assignTerminalId || undefined}
                onValueChange={setAssignTerminalId}
              >
                <SelectTrigger id='modalTerminal' className='text-xs sm:text-sm font-semibold'>
                  <SelectValue placeholder='Select terminal' />
                </SelectTrigger>
                <SelectContent>
                  {terminals.map((t) => (
                    <SelectItem key={t.id} value={t.id} className='text-xs'>
                      <span className='font-mono font-bold'>{t.code}</span> — {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Users List */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-bold uppercase'>
                  Select Cashiers & Operators *
                </Label>
                <span className='text-xs text-muted-foreground'>
                  {selectedUserIds.length} selected
                </span>
              </div>

              <div className='relative'>
                <Search className='absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Search by name, email, or role...'
                  value={assignUserSearch}
                  onChange={(e) => setAssignUserSearch(e.target.value)}
                  className='h-8 pl-8 text-xs'
                />
              </div>

              {/* Users selectable box */}
              <div className='max-h-56 overflow-y-auto rounded-md border p-1 space-y-1'>
                {modalFilteredUsers.length === 0 ? (
                  <p className='py-6 text-center text-xs text-muted-foreground'>
                    No users found matching search.
                  </p>
                ) : (
                  modalFilteredUsers.map((u) => {
                    const isAlreadyAssigned = existingAssignedUserIds.has(u.id)
                    const isChecked = selectedUserIds.includes(u.id)

                    return (
                      <div
                        key={u.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement
                          if (target.closest('[data-slot="checkbox"]') || target.tagName === 'INPUT') {
                            return
                          }
                          handleToggleUserSelection(u.id)
                        }}
                        className={cn(
                          'flex items-center justify-between rounded-md p-2 text-xs transition-colors cursor-pointer select-none',
                          isChecked ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50',
                          isAlreadyAssigned && !isChecked && 'opacity-70 bg-muted/20'
                        )}
                      >
                        <div className='flex items-center gap-2.5'>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleUserSelection(u.id)}
                            onClick={(e) => e.stopPropagation()}
                            id={`user-${u.id}`}
                            aria-label={`Select ${u.name}`}
                          />
                          <Avatar className='h-7 w-7'>
                            {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
                            <AvatarFallback className='text-[10px] font-bold'>
                              {u.name
                                .split(' ')
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className='font-semibold leading-tight'>{u.name}</p>
                            <p className='text-[10px] text-muted-foreground'>{u.email}</p>
                          </div>
                        </div>

                        <div className='flex items-center gap-1.5'>
                          {isAlreadyAssigned && (
                            <Badge
                              variant='secondary'
                              className='text-[9px] font-normal text-muted-foreground'
                            >
                              Currently Assigned
                            </Badge>
                          )}
                          <Badge variant='outline' className='text-[10px] capitalize'>
                            {u.role}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={assignMutation.isPending || selectedUserIds.length === 0}
                className='gap-1.5'
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' /> Assigning...
                  </>
                ) : (
                  <>
                    <Check className='h-4 w-4' /> Authorize {selectedUserIds.length} Cashier(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Single Remove Confirmation Dialog ── */}
      <AlertDialog
        open={Boolean(assignmentToDelete)}
        onOpenChange={(open) => !open && setAssignmentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-rose-600'>
              <AlertCircle className='h-5 w-5' />
              Remove Cashier Assignment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong className='text-foreground'>{assignmentToDelete?.userName}</strong> from{' '}
              <strong className='text-foreground'>{assignmentToDelete?.terminalCode}</strong> (
              {assignmentToDelete?.terminalName})? This user will no longer be authorized to open shifts on this checkout terminal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-rose-600 text-white hover:bg-rose-700'
            >
              {removeMutation.isPending ? 'Removing...' : 'Confirm Removal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Batch Remove Confirmation Dialog ── */}
      <AlertDialog
        open={isBatchDeleteDialogOpen}
        onOpenChange={setIsBatchDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-rose-600'>
              <AlertCircle className='h-5 w-5' />
              Remove {selectedAssignmentIds.length} Assignments?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke terminal access for the selected {selectedAssignmentIds.length} cashier authorization(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className='bg-rose-600 text-white hover:bg-rose-700'
            >
              {batchRemoveMutation.isPending ? 'Removing...' : 'Revoke Selected'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
