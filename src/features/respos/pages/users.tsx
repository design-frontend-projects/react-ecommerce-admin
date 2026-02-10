import { useState } from 'react'
import { Plus, Search, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
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
import { useCreateUser, useUpdateUser } from '../api/mutations'
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

  const filteredEmployees =
    employees?.filter((emp) =>
      `${emp.first_name} ${emp.last_name} ${emp.email}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) || []

  const handleCreateUser = async (values: any) => {
    try {
      await createUser.mutateAsync(values)
      toast.success('User created successfully')
      setIsUserDialogOpen(false)
    } catch (error) {
      toast.error('Failed to create user')
      console.error(error)
    }
  }

  const handleUpdateUser = async (values: any) => {
    try {
      await updateUser.mutateAsync(values)
      toast.success('User updated successfully')
      setIsUserDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      toast.error('Failed to update user')
      console.error(error)
    }
  }

  const handleEditUser = (user: ResEmployeeWithRoles) => {
    setSelectedUser(user)
    setIsUserDialogOpen(true)
  }

  if (!isAdmin) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <Shield className='mx-auto h-12 w-12 text-red-500' />
          <h2 className='mt-4 text-xl font-bold'>Access Denied</h2>
          <p className='text-muted-foreground'>
            You do not have permission to view this page.
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
          <User className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>User Management</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div className='relative w-72'>
              <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search users...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
            <Button onClick={() => setIsUserDialogOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add User
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredEmployees.length})</CardTitle>
              <CardDescription>
                Manage system users and their roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center'>
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center'>
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className='font-medium'>
                            {emp.first_name} {emp.last_name}
                          </div>
                          {emp.pin_code && (
                            <div className='text-xs text-muted-foreground'>
                              PIN: {emp.pin_code}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {emp.roles.map((role) => (
                              <Badge key={role.id} variant='outline'>
                                {role.display_name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.is_active ? 'default' : 'secondary'}
                          >
                            {emp.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEditUser(emp)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
