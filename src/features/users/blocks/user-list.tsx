import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import type { User } from '../data/types'
import { users as dummyUsers } from '../data/users'

export function useUsersList() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })
}

async function fetchUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/users')
    if (!response.ok) {
      throw new Error('Failed to fetch users from API')
    }
    const data = await response.json()
    return data as User[]
  } catch (error) {
    console.warn('Real API failed, falling back to dummy data:', error)
    // Fallback to dummy data for development/demo purposes
    return new Promise((resolve) => {
      setTimeout(() => resolve(dummyUsers as User[]), 800)
    })
  }
}

export function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const table = useReactTable({
    data: users || [],
    columns: [
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'lastName', header: 'Last Name' },
      { accessorKey: 'email', header: 'Email' },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">{row.original.role}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge variant={status === 'active' ? 'default' : 'secondary'} className="capitalize">
              {status}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          return (
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          )
        },
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <div>Loading users...</div>
  if (error) return <div>Failed to load users.</div>

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
