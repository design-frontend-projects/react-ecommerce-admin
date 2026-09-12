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
  name_ar?: string | null
  code?: string | null
  description?: string | null
  badge?: string | null
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
          <div className='flex items-center justify-between gap-2 w-full min-w-0 pr-1'>
            {selectedOption ? (
              <>
                <div className='flex items-center gap-1.5 truncate'>
                  <span className='font-medium text-foreground truncate'>
                    {selectedOption.name}
                  </span>
                  {selectedOption.code && (
                    <span className='text-muted-foreground font-mono text-[11px] shrink-0'>
                      ({selectedOption.code})
                    </span>
                  )}
                </div>
                {selectedOption.name_ar && (
                  <span
                    dir='rtl'
                    className='text-xs text-muted-foreground font-medium shrink-0 max-w-[45%] truncate font-sans'
                  >
                    {selectedOption.name_ar}
                  </span>
                )}
              </>
            ) : (
              <span className='truncate text-muted-foreground'>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[--radix-popover-trigger-width] min-w-[280px] p-0'
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
                const searchValue = `${opt.name} ${opt.name_ar || ''} ${opt.code || ''} ${opt.description || ''}`
                return (
                  <CommandItem
                    key={opt.id}
                    value={searchValue}
                    onSelect={() => {
                      onChange(opt.id)
                      setOpen(false)
                    }}
                    className='text-xs py-2 cursor-pointer'
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5 shrink-0',
                        isSelected ? 'opacity-100 text-primary' : 'opacity-0'
                      )}
                    />
                    <div className='flex items-center justify-between gap-2 w-full min-w-0'>
                      <div className='flex flex-col min-w-0 truncate'>
                        <div className='flex items-center gap-1.5 truncate'>
                          <span
                            className={cn(
                              'truncate',
                              isSelected ? 'font-semibold text-primary' : 'font-medium'
                            )}
                          >
                            {opt.name}
                          </span>
                          {opt.code && (
                            <span className='text-[10px] text-muted-foreground font-mono shrink-0'>
                              ({opt.code})
                            </span>
                          )}
                          {opt.badge && (
                            <span className='text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0'>
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <span className='text-[11px] text-muted-foreground/75 truncate'>
                            {opt.description}
                          </span>
                        )}
                      </div>
                      {opt.name_ar && (
                        <span
                          dir='rtl'
                          className={cn(
                            'text-xs shrink-0 max-w-[45%] truncate font-sans',
                            isSelected
                              ? 'font-semibold text-primary'
                              : 'text-muted-foreground'
                          )}
                        >
                          {opt.name_ar}
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
