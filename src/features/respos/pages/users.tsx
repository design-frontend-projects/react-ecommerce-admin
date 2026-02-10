import { useEffect, useState } from 'react'
import {
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ToggleLeft,
  User,
  Users,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  useCreateUser,
  useUpdateUser,
  useToggleEmployeeStatus,
} from '../api/mutations'
import { useEmployees } from '../api/queries'
import { UserDialog } from '../components/user-dialog'
import { useResposAuth } from '../hooks'
import type { ResEmployeeWithRoles } from '../types'

export function UserManagement() {
  const { isAdmin } = useResposAuth()
  const { data: employees, isLoading } = useEmployees()
  const [searchQuery, setSearchQuery] = useState('')
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ResEmployeeWithRoles | null>(
    null
  )

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const toggleStatus = useToggleEmployeeStatus()

  const filteredEmployees =
    employees?.filter((emp) =>
      `${emp.first_name} ${emp.last_name} ${emp.email}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) || []

  const activeCount = filteredEmployees.filter((e) => e.is_active).length
  const inactiveCount = filteredEmployees.length - activeCount

  const handleCreateUser = async (values: Record<string, unknown>) => {
    try {
      await createUser.mutateAsync(
        values as Parameters<typeof createUser.mutateAsync>[0]
      )
      toast.success('Employee created successfully')
      setIsUserDialogOpen(false)
    } catch {
      toast.error('Failed to create employee')
    }
  }

  const handleUpdateUser = async (values: Record<string, unknown>) => {
    try {
      await updateUser.mutateAsync(
        values as Parameters<typeof updateUser.mutateAsync>[0]
      )
      toast.success('Employee updated successfully')
      setIsUserDialogOpen(false)
      setSelectedUser(null)
    } catch {
      toast.error('Failed to update employee')
    }
  }

  const handleEditUser = (user: ResEmployeeWithRoles) => {
    setSelectedUser(user)
    setIsUserDialogOpen(true)
  }

  const handleToggleStatus = async (emp: ResEmployeeWithRoles) => {
    try {
      await toggleStatus.mutateAsync({
        employeeId: emp.id,
        isActive: !emp.is_active,
      })
      toast.success(
        `Employee ${emp.is_active ? 'deactivated' : 'activated'} successfully`
      )
    } catch {
      toast.error('Failed to update employee status')
    }
  }

  useEffect(() => {
    console.log('isAdmin', isAdmin)
    console.log('employees', employees)
  }, [isAdmin, employees])

  if (!isAdmin) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <ShieldAlert className='mx-auto h-16 w-16 text-red-400 opacity-80' />
          <h2 className='mt-4 text-xl font-bold'>Access Denied</h2>
          <p className='mt-1 text-muted-foreground'>
            You need admin privileges to manage employees.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={(open) => {
          setIsUserDialogOpen(open)
          if (!open) setSelectedUser(null)
        }}
        user={selectedUser}
        onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
      />

      <Header>
        <div className='flex items-center gap-2'>
          <Users className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Employee Management</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex flex-col gap-4'>
          {/* Stats Bar */}
          <div className='grid grid-cols-3 gap-4'>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30'>
                  <Users className='h-5 w-5 text-orange-600 dark:text-orange-400' />
                </div>
                <div>
                  <p className='text-2xl font-bold'>
                    {filteredEmployees.length}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Total Employees
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='rounded-lg bg-green-100 p-2 dark:bg-green-900/30'>
                  <User className='h-5 w-5 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='text-2xl font-bold'>{activeCount}</p>
                  <p className='text-xs text-muted-foreground'>Active</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='rounded-lg bg-gray-100 p-2 dark:bg-gray-800'>
                  <Shield className='h-5 w-5 text-gray-500' />
                </div>
                <div>
                  <p className='text-2xl font-bold'>{inactiveCount}</p>
                  <p className='text-xs text-muted-foreground'>Inactive</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search + Add */}
          <div className='flex items-center justify-between'>
            <div className='relative w-72'>
              <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search employees...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
            <Button onClick={() => setIsUserDialogOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Employee
            </Button>
          </div>

          {/* Employees Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
              <CardDescription>
                Manage restaurant employees, roles, and access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className='py-8 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent' />
                          Loading employees...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='py-8 text-center'>
                        <Users className='mx-auto h-8 w-8 text-muted-foreground/50' />
                        <p className='mt-2 text-sm text-muted-foreground'>
                          No employees found.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const initials =
                        `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase()
                      return (
                        <TableRow
                          key={emp.id}
                          className={!emp.is_active ? 'opacity-60' : ''}
                        >
                          <TableCell>
                            <div className='flex items-center gap-3'>
                              <Avatar className='h-9 w-9'>
                                <AvatarImage
                                  src={emp.avatar_url || ''}
                                  alt={`${emp.first_name} ${emp.last_name}`}
                                />
                                <AvatarFallback className='bg-orange-100 text-xs font-semibold text-orange-700'>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className='font-medium'>
                                  {emp.first_name} {emp.last_name}
                                </div>
                                {emp.pin_code && (
                                  <div className='text-xs text-muted-foreground'>
                                    PIN: ••••{emp.pin_code.slice(-2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className='text-sm'>{emp.email}</TableCell>
                          <TableCell className='text-sm text-muted-foreground'>
                            {emp.id_number || '—'}
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-wrap gap-1'>
                              {emp.roles.map((role) => (
                                <Badge
                                  key={role.id}
                                  variant='outline'
                                  className='text-xs'
                                >
                                  {role.display_name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={emp.is_active ? 'default' : 'secondary'}
                              className={
                                emp.is_active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                  : ''
                              }
                            >
                              {emp.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon'>
                                  <MoreHorizontal className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuItem
                                  onClick={() => handleEditUser(emp)}
                                >
                                  <Edit className='mr-2 h-4 w-4' />
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(emp)}
                                >
                                  <ToggleLeft className='mr-2 h-4 w-4' />
                                  {emp.is_active ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
