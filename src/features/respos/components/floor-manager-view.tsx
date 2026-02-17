import { motion } from 'framer-motion'
import { Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    <div className='flex h-full flex-col bg-muted/5'>
      {/* Floor Tabs */}
      <div className='bg-background/80 px-4 py-3 backdrop-blur-md'>
        <ScrollArea className='w-full'>
          <div className='flex gap-2 pb-1'>
            {floors.map((floor) => (
              <Button
                key={floor.id}
                variant={activeFloorId === floor.id ? 'default' : 'ghost'}
                onClick={() => onSelectFloor(floor.id)}
                className={cn(
                  'relative rounded-full px-6 transition-all',
                  activeFloorId === floor.id
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                    : 'hover:bg-orange-50 dark:hover:bg-orange-950/20'
                )}
              >
                {floor.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Tables Grid */}
      <ScrollArea className='flex-1'>
        <div className='p-6'>
          <div className='grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
            {floorTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => onSelectTable(table)}
              />
            ))}
            {floorTables.length === 0 && (
              <div className='col-span-full flex h-60 flex-col items-center justify-center gap-4 text-muted-foreground'>
                <div className='rounded-full bg-muted p-6'>
                  <Users className='h-10 w-10 opacity-20' />
                </div>
                <p className='text-sm font-medium'>
                  No tables found on this floor.
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className='border-t bg-background/50 p-4 backdrop-blur-sm'>
        <div className='flex flex-wrap items-center justify-center gap-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
          <LegendItem color='bg-emerald-500' label='Free' />
          <LegendItem color='bg-orange-500' label='Occupied' />
          <LegendItem color='bg-indigo-500' label='Reserved' />
          <LegendItem color='bg-amber-500' label='Dirty' />
        </div>
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className='flex items-center gap-2'>
      <div className={cn('h-2 w-2 rounded-full', color)} />
      <span>{label}</span>
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
  const statusStyles =
    TABLE_STATUS_COLORS[table.status] || 'bg-muted border-muted'
  const isOccupied = table.status === 'occupied'

  return (
    <motion.button
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-3xl border-2 p-4 transition-all duration-300',
        'hover:shadow-2xl hover:shadow-orange-500/10 dark:hover:shadow-orange-950/20',
        statusStyles,
        isOccupied && 'shadow-inner'
      )}
    >
      {/* Dynamic Pulse for Occupied */}
      {isOccupied && (
        <span className='absolute inset-0 z-0 animate-pulse rounded-[inherit] bg-orange-400/10' />
      )}

      {/* Table Number */}
      <div className='relative z-10'>
        <span className='text-4xl font-black tracking-tighter'>
          {table.table_number}
        </span>
      </div>

      {/* Info Row */}
      <div className='relative z-10 mt-1 flex flex-col items-center gap-0.5 leading-none'>
        <div className='flex items-center gap-1 opacity-70'>
          <Users className='h-3 w-3' />
          <span className='text-[10px] font-bold'>{table.seats} seats</span>
        </div>

        {isOccupied && (
          <div className='mt-1 flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase dark:text-orange-400'>
            <Clock className='h-2.5 w-2.5' />
            <span>12m</span>
          </div>
        )}
      </div>

      {/* Status Dot */}
      <div className='absolute top-3 right-3 flex h-2 w-2 items-center justify-center'>
        <span
          className={cn(
            'absolute h-full w-full rounded-full opacity-75',
            table.status === 'free' ? 'animate-ping bg-emerald-400' : ''
          )}
        />
        <span className='relative h-1.5 w-1.5 rounded-full bg-current' />
      </div>

      {/* Select Overlay */}
      <div className='absolute inset-0 rounded-[inherit] bg-white opacity-0 transition-opacity group-hover:opacity-5 dark:bg-black' />
    </motion.button>
  )
}
