import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import {
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Search, X, Users, Filter } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTablePagination, DataTableViewOptions } from '@/components/data-table'
import { useCustomerGroups } from '@/features/customer-groups/hooks/use-customer-groups'
import { type Customer } from '../hooks/use-customers'
import { getColumns } from './customers-columns'
import { useCustomersContext } from './customers-provider'

interface CustomersTableProps {
  data: Customer[]
}

export function CustomersTable({ data }: CustomersTableProps) {
  const { t } = useTranslation()
  const { filterStatus, setFilterStatus } = useCustomersContext()
  const { data: customerGroups } = useCustomerGroups()

  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const columns = useMemo(() => getColumns(t), [t])

  // Filter data based on KPI selection, group selection, and global search query
  const filteredData = useMemo(() => {
    return data.filter((customer) => {
      // 1. KPI Filter
      if (filterStatus === 'active' && !customer.is_active) return false
      if (filterStatus === 'inactive' && customer.is_active) return false
      if (filterStatus === 'loyalty' && (customer.loyalty_points ?? 0) <= 0) return false
      if (filterStatus === 'grouped' && !customer.group_id) return false

      // 2. Group Filter
      if (selectedGroup !== 'all') {
        if (selectedGroup === '__none__' && customer.group_id) return false
        if (selectedGroup !== '__none__' && customer.group_id !== selectedGroup) return false
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase()
        const code = (customer.code || '').toLowerCase()
        const email = (customer.email || '').toLowerCase()
        const phone = (customer.phone || '').toLowerCase()
        const city = (customer.city || '').toLowerCase()
        const groupName = (customer.customer_groups?.name || '').toLowerCase()

        return (
          fullName.includes(query) ||
          code.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          city.includes(query) ||
          groupName.includes(query)
        )
      }

      return true
    })
  }, [data, filterStatus, selectedGroup, searchQuery])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const isFiltered = Boolean(searchQuery || selectedGroup !== 'all' || filterStatus !== null)

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedGroup('all')
    setFilterStatus(null)
    setColumnFilters([])
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Custom Responsive Toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]'>
          <div className='relative w-full sm:w-64 lg:w-72'>
            <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t('customers.filters.searchPlaceholder', 'Search name, code, phone, email...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-9 ps-9'
            />
          </div>

          {/* Group Filter Dropdown */}
          <Select
            value={selectedGroup}
            onValueChange={setSelectedGroup}
          >
            <SelectTrigger className='h-9 w-[160px] text-xs'>
              <SelectValue placeholder={t('customers.filters.allGroups', 'All Groups')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>
                {t('customers.filters.allGroups', 'All Groups')}
              </SelectItem>
              <SelectItem value='__none__'>
                <span className='text-muted-foreground'>{t('customers.form.noGroup', 'No Group')}</span>
              </SelectItem>
              {customerGroups?.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active Filter Pill indicator if KPI is applied */}
          {filterStatus && (
            <Badge
              variant='secondary'
              className='gap-1.5 h-8 px-2.5 text-xs font-normal'
            >
              <Filter className='h-3 w-3 text-primary' />
              <span className='capitalize'>{filterStatus}</span>
              <button
                type='button'
                onClick={() => setFilterStatus(null)}
                className='hover:text-foreground text-muted-foreground'
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          )}

          {isFiltered && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResetFilters}
              className='h-9 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground'
            >
              <X className='h-3.5 w-3.5' />
              {t('common.reset', 'Reset')}
            </Button>
          )}
        </div>

        <div className='flex items-center gap-2 ms-auto'>
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Table Container */}
      <div className='overflow-hidden rounded-xl border bg-card shadow-2xs'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='bg-muted/40 hover:bg-muted/40'>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='h-10 text-xs font-semibold'>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='hover:bg-muted/30 transition-colors'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='py-2.5'>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-36 text-center'
                >
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <Users className='h-8 w-8 text-muted-foreground/40' />
                    <p className='text-sm font-medium'>
                      {t('customers.table.noResults', { defaultValue: 'No customers found.' })}
                    </p>
                    {isFiltered && (
                      <Button
                        variant='outline'
                        size='xs'
                        onClick={handleResetFilters}
                        className='text-xs mt-1'
                      >
                        {t('common.clearFilters', 'Clear Filters')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
