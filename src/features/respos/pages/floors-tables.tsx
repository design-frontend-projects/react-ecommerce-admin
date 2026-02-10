// ResPOS Floors & Tables Management
import { useState } from 'react'
import { Grid3X3, Loader2, Plus, Trash2 } from 'lucide-react'
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDeleteFloor, useDeleteTable } from '../api/mutations'
import { useFloors, useTables } from '../api/queries'
import { FloorDialog } from '../components/floor-dialog'
import { TableDialog } from '../components/table-dialog'
import { TABLE_STATUS_COLORS } from '../constants'
import type { ResFloor, ResTable } from '../types'

export function FloorsAndTables() {
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false)
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
  const [selectedFloor, setSelectedFloor] = useState<ResFloor | null>(null)
  const [selectedTable, setSelectedTable] = useState<ResTable | null>(null)
  const [activeFloorIdForTable, setActiveFloorIdForTable] = useState<string>('')

  const { data: floors, isLoading: floorsLoading } = useFloors()
  const { data: tables, isLoading: tablesLoading } = useTables()

  const deleteFloor = useDeleteFloor()
  const deleteTable = useDeleteTable()

  const isLoading = floorsLoading || tablesLoading

  // Floor Handlers
  const handleCreateFloor = () => {
    setSelectedFloor(null)
    setIsFloorDialogOpen(true)
  }

  const handleEditFloor = (floor: ResFloor) => {
    setSelectedFloor(floor)
    setIsFloorDialogOpen(true)
  }

  const handleDeleteFloor = async (id: string) => {
    if (
      confirm(
        'Are you sure you want to delete this floor? All active tables will be deleted.'
      )
    ) {
      try {
        await deleteFloor.mutateAsync(id)
        toast.success('Floor deleted')
      } catch (error) {
        toast.error('Failed to delete floor')
      }
    }
  }

  // Table Handlers
  const handleCreateTable = (floorId: string) => {
    setSelectedTable(null)
    setActiveFloorIdForTable(floorId)
    setIsTableDialogOpen(true)
  }

  const handleEditTable = (table: ResTable) => {
    setSelectedTable(table)
    setActiveFloorIdForTable(table.floor_id)
    setIsTableDialogOpen(true)
  }

  const handleDeleteTable = async (id: string) => {
    if (confirm('Are you sure you want to delete this table?')) {
      try {
        await deleteTable.mutateAsync(id)
        toast.success('Table deleted')
      } catch (error) {
        toast.error('Failed to delete table')
      }
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Grid3X3 className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Floors & Tables</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {isLoading ? (
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Header */}
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div>
                <h2 className='text-2xl font-bold'>Floor Plan</h2>
                <p className='text-muted-foreground'>
                  {floors?.length ?? 0} floors, {tables?.length ?? 0} tables
                </p>
              </div>
              <Button
                className='bg-gradient-to-r from-orange-500 to-red-500'
                onClick={handleCreateFloor}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Floor
              </Button>
            </div>

            {/* Floors */}
            <div className='space-y-6'>
              {floors?.map((floor) => (
                <FloorSection
                  key={floor.id}
                  floor={floor}
                  tables={tables?.filter((t) => t.floor_id === floor.id) ?? []}
                  onEditFloor={() => handleEditFloor(floor)}
                  onDeleteFloor={() => handleDeleteFloor(floor.id)}
                  onAddTable={() => handleCreateTable(floor.id)}
                  onEditTable={handleEditTable}
                  onDeleteTable={handleDeleteTable}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dialogs */}
        <FloorDialog
          open={isFloorDialogOpen}
          onOpenChange={setIsFloorDialogOpen}
          floor={selectedFloor}
        />

        <TableDialog
          open={isTableDialogOpen}
          onOpenChange={setIsTableDialogOpen}
          table={selectedTable}
          defaultFloorId={activeFloorIdForTable}
        />
      </Main>
    </>
  )
}

// Floor Section
function FloorSection({
  floor,
  tables,
  onEditFloor,
  onDeleteFloor,
  onAddTable,
  onEditTable,
  onDeleteTable,
}: {
  floor: ResFloor
  tables: ResTable[]
  onEditFloor: () => void
  onDeleteFloor: () => void
  onAddTable: () => void
  onEditTable: (table: ResTable) => void
  onDeleteTable: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle>{floor.name}</CardTitle>
          <CardDescription>{tables.length} tables</CardDescription>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={onEditFloor}>
            Edit Floor
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive hover:bg-destructive/10'
            onClick={onDeleteFloor}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
          <Button size='sm' onClick={onAddTable}>
            <Plus className='mr-1 h-4 w-4' />
            Add Table
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <div className='flex h-32 items-center justify-center border-2 border-dashed bg-muted/50 text-muted-foreground'>
            No tables in this floor
          </div>
        ) : (
          <div className='grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8'>
            {tables.map((table) => (
              <TableItem
                key={table.id}
                table={table}
                onClick={() => onEditTable(table)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (
                    confirm(
                      `Delete table ${table.table_number}? This cannot be undone.`
                    )
                  ) {
                    onDeleteTable(table.id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Table Item
function TableItem({
  table,
  onClick,
  onContextMenu,
}: {
  table: ResTable
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const statusColor = TABLE_STATUS_COLORS[table.status]

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 transition-all hover:scale-105 hover:shadow-md ${statusColor}`}
      title='Click to edit, Right-click to delete'
    >
      <span className='text-lg font-bold'>{table.table_number}</span>
      <span className='text-xs text-muted-foreground'>{table.seats} seats</span>
      <Badge variant='secondary' className='mt-1 text-xs capitalize'>
        {table.status}
      </Badge>
    </div>
  )
}
