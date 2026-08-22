import * as React from 'react'
import { Search, Database, Layers, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { LookupTypeItem } from '../data/schema'
import { useLookupsContext } from './provider'

interface TypesListProps {
  types: LookupTypeItem[]
}

export function TypesList({ types }: TypesListProps) {
  const { selectedType, setSelectedType } = useLookupsContext()
  const [search, setSearch] = React.useState('')

  const filteredTypes = React.useMemo(() => {
    if (!search.trim()) return types
    const q = search.toLowerCase()
    return types.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    )
  }, [types, search])

  // Select first type on initial load if none selected
  React.useEffect(() => {
    if (!selectedType && types.length > 0) {
      setSelectedType(types[0])
    }
  }, [types, selectedType, setSelectedType])

  return (
    <div className='flex flex-col h-full rounded-xl border bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs'>
      <div className='p-3.5 border-b bg-muted/30 space-y-2.5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Database className='h-4 w-4 text-primary' />
            <h3 className='font-semibold text-sm'>Lookup Catalogs</h3>
          </div>
          <Badge variant='secondary' className='text-xs font-mono'>
            {filteredTypes.length}
          </Badge>
        </div>
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Filter catalogs...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-8 h-8 text-xs bg-background'
          />
        </div>
      </div>

      <ScrollArea className='flex-1 p-2'>
        <div className='space-y-1'>
          {filteredTypes.map((type) => {
            const isSelected = selectedType?.id === type.id

            return (
              <button
                key={type.id}
                type='button'
                onClick={() => setSelectedType(type)}
                className={cn(
                  'w-full flex items-start justify-between p-2.5 rounded-lg text-left transition-all text-xs group',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                    : 'hover:bg-accent text-foreground'
                )}
              >
                <div className='space-y-1 min-w-0 pr-2'>
                  <div className='flex items-center gap-1.5'>
                    <span className='truncate font-medium text-sm'>
                      {type.name}
                    </span>
                    {type.is_system ? (
                      <ShieldCheck
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          isSelected ? 'text-primary-foreground/80' : 'text-blue-500'
                        )}
                        title='System Core Catalog'
                      />
                    ) : (
                      <Layers
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-mono truncate',
                      isSelected ? 'text-primary-foreground/75' : 'text-muted-foreground'
                    )}
                  >
                    {type.code}
                  </div>
                </div>

                <div className='flex items-center gap-1 shrink-0 pt-0.5'>
                  {type.custom_count > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-primary/10 text-primary'
                      )}
                      title={`${type.custom_count} custom options added`}
                    >
                      +{type.custom_count}
                    </span>
                  )}
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px]',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {type.values_count}
                  </span>
                </div>
              </button>
            )
          })}

          {filteredTypes.length === 0 && (
            <div className='p-6 text-center text-xs text-muted-foreground'>
              No catalogs match your search.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
