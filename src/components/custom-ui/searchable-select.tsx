import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
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

export interface SearchableOption {
  id: string
  name: string
  code?: string | null
  description?: string | null
}

export interface SearchableSelectProps {
  value?: string | null
  onChange: (value: string | null) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  allowNone = true,
  noneLabel = '-- None --',
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = React.useMemo(() => {
    if (!value || value === 'none') return null
    return options.find((opt) => opt.id === value) || null
  }, [options, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal text-left h-9 text-xs',
            !selectedOption && 'text-muted-foreground',
            className
          )}
        >
          <span className='truncate'>
            {selectedOption ? (
              <>
                <span className='font-medium text-foreground'>{selectedOption.name}</span>
                {selectedOption.code && (
                  <span className='ml-1 text-muted-foreground font-mono text-[11px]'>
                    ({selectedOption.code})
                  </span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[--radix-popover-trigger-width] min-w-[240px] p-0'
        align='start'
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className='h-8 text-xs' />
          <CommandList className='max-h-60'>
            <CommandEmpty className='py-3 text-center text-xs text-muted-foreground'>
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value='-- none --'
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className='text-xs text-muted-foreground italic'
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5',
                      !value || value === 'none' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {noneLabel}
                </CommandItem>
              )}
              {options.map((opt) => {
                const isSelected = opt.id === value
                return (
                  <CommandItem
                    key={opt.id}
                    value={`${opt.name} ${opt.code || ''} ${opt.description || ''}`}
                    onSelect={() => {
                      onChange(opt.id)
                      setOpen(false)
                    }}
                    className='text-xs'
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className='flex items-center gap-1.5 truncate'>
                      <span className={cn(isSelected && 'font-semibold text-primary')}>
                        {opt.name}
                      </span>
                      {opt.code && (
                        <span className='text-[10px] text-muted-foreground font-mono'>
                          ({opt.code})
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
