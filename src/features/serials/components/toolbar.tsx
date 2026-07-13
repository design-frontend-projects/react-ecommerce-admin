import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SERIAL_STATUSES } from '../data/schema'

const ALL = 'all'

export function SerialsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
}) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder='Search serial number...'
        className='h-8 w-56'
      />
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className='h-8 w-40'>
          <SelectValue placeholder='All statuses' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {SERIAL_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
