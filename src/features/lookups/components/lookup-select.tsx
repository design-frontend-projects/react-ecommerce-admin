import * as React from 'react'
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useLookupValues } from '../hooks/use-lookups'
import type { LookupValueItem } from '../data/schema'

export interface LookupSelectProps {
  lookupType: string
  value?: string | null
  onChange?: (value: string | null, selectedItem?: LookupValueItem) => void
  placeholder?: string
  valueKey?: 'id' | 'code'
  disabled?: boolean
  allowClear?: boolean
  showColor?: boolean
  className?: string
  onCreateNew?: () => void
}

export function LookupSelect({
  lookupType,
  value,
  onChange,
  placeholder = 'Select an option...',
  valueKey = 'id',
  disabled = false,
  allowClear = true,
  showColor = true,
  className,
  onCreateNew,
}: LookupSelectProps) {
  const [open, setOpen] = React.useState(false)
  const { data, isLoading } = useLookupValues(lookupType, false)

  const items = React.useMemo(() => {
    return data?.values || []
  }, [data])

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return items.find((item) => item[valueKey] === value) || null
  }, [items, value, valueKey])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            'w-full justify-between font-normal text-left h-10',
            !selectedItem && 'text-muted-foreground',
            className
          )}
        >
          {isLoading ? (
            <div className='flex items-center gap-2 text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Loading {lookupType}...</span>
            </div>
          ) : selectedItem ? (
            <div className='flex items-center gap-2 truncate'>
              {showColor && selectedItem.color && (
                <span
                  className='h-3 w-3 rounded-full shrink-0'
                  style={{ backgroundColor: selectedItem.color }}
                />
              )}
              <span className='truncate font-medium text-foreground'>
                {selectedItem.name}
              </span>
              {selectedItem.name_ar && (
                <span className='text-xs text-muted-foreground/80 truncate'>
                  ({selectedItem.name_ar})
                </span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className='ms-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0' align='start'>
        <Command>
          <CommandInput placeholder={`Search ${lookupType}...`} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {allowClear && selectedItem && (
                <CommandItem
                  onSelect={() => {
                    onChange?.(null, undefined)
                    setOpen(false)
                  }}
                  className='text-xs text-muted-foreground italic'
                >
                  Clear selection
                </CommandItem>
              )}
              {items.map((item) => {
                const itemVal = item[valueKey]
                const isSelected = itemVal === value

                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.name_ar || ''} ${item.code}`}
                    onSelect={() => {
                      onChange?.(itemVal, item)
                      setOpen(false)
                    }}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center gap-2 truncate'>
                      {showColor && item.color && (
                        <span
                          className='h-3 w-3 rounded-full shrink-0'
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className={cn('truncate', isSelected && 'font-bold text-primary')}>
                        {item.name}
                      </span>
                      {item.name_ar && (
                        <span className='text-xs text-muted-foreground truncate'>
                          ({item.name_ar})
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      {item.is_tenant_custom && (
                        <Badge variant='outline' className='text-[10px] py-0 px-1 font-normal'>
                          Custom
                        </Badge>
                      )}
                      <Check
                        className={cn(
                          'h-4 w-4 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {onCreateNew && (
              <div className='p-1 border-t'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='w-full justify-start text-xs font-medium text-primary'
                  onClick={() => {
                    setOpen(false)
                    onCreateNew()
                  }}
                >
                  <Plus className='h-3.5 w-3.5 mr-1.5' />
                  Add new value
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
