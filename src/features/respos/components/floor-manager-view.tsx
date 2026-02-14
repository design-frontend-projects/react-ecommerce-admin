import { motion } from 'framer-motion'
import { Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TABLE_STATUS_COLORS } from '../constants'
import type { ResFloor, ResTable } from '../types'

interface FloorManagerViewProps {
  floors: ResFloor[]
  tables: ResTable[]
  selectedFloorId: string | null
  onSelectFloor: (floorId: string) => void
  onSelectTable: (table: ResTable) => void
}

export function FloorManagerView({
  floors,
  tables,
  selectedFloorId,
  onSelectFloor,
  onSelectTable,
}: FloorManagerViewProps) {
  // Filter tables for current floor
  const activeFloorId = selectedFloorId || floors[0]?.id
  const floorTables = tables.filter((t) => t.floor_id === activeFloorId)

  return (
    <div className='flex h-full flex-col bg-background'>
      {/* Floor Tabs */}
      <div className='border-b p-2'>
        <ScrollArea className='w-full whitespace-nowrap'>
          <div className='flex gap-2 p-2'>
            {floors.map((floor) => (
              <Button
                key={floor.id}
                variant={activeFloorId === floor.id ? 'default' : 'outline'}
                onClick={() => onSelectFloor(floor.id)}
                className='rounded-full px-6'
              >
                {floor.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Tables Grid */}
      <ScrollArea className='flex-1 p-6'>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
          {floorTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => onSelectTable(table)}
            />
          ))}
          {floorTables.length === 0 && (
            <div className='col-span-full flex h-40 items-center justify-center text-muted-foreground'>
              No tables found in this floor.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className='border-t bg-muted/10 p-4'>
        <div className='flex flex-wrap items-center justify-center gap-4 text-sm'>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded-full bg-green-500' />
            <span>Free</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded-full bg-orange-500' />
            <span>Occupied</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded-full bg-purple-500' />
            <span>Reserved</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded-full bg-yellow-500' />
            <span>Dirty</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TableCard({
  table,
  onClick,
}: {
  table: ResTable
  onClick: () => void
}) {
  const statusColor = TABLE_STATUS_COLORS[table.status] || 'bg-gray-100'
  const isOccupied = table.status === 'occupied'

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 shadow-sm transition-all hover:shadow-md',
        statusColor,
        isOccupied && 'border-orange-500 ring-2 ring-orange-200 ring-offset-2',
        table.status === 'free' && 'border-green-200 hover:border-green-500'
      )}
    >
      {/* Header / Status Badge */}
      <div className='absolute top-2 right-2'>
        <Badge
          variant='secondary'
          className={cn(
            'h-6 bg-white/50 px-2 text-[10px] tracking-wider uppercase backdrop-blur-md',
            isOccupied && 'bg-orange-100 text-orange-700'
          )}
        >
          {table.status}
        </Badge>
      </div>

      {/* Table Number */}
      <span className='text-3xl font-black tracking-tighter opacity-80'>
        {table.table_number}
      </span>

      {/* Info Row */}
      <div className='flex items-center gap-3 text-xs font-medium text-muted-foreground/80'>
        <div className='flex items-center gap-1'>
          <Users className='h-3 w-3' />
          <span>{table.seats}</span>
        </div>
        {isOccupied && (
          <div className='flex items-center gap-1 text-orange-700'>
            <Clock className='h-3 w-3' />
            <span>12m</span> {/* Placeholder for time occupied */}
          </div>
        )}
      </div>
    </motion.button>
  )
}
