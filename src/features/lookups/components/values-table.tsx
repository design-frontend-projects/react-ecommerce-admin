import * as React from 'react'
import {
  Edit2,
  Lock,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { LookupValueItem } from '../data/schema'
import {
  useDeleteLookupValue,
  useToggleLookupValue,
} from '../hooks/use-lookups'
import { useLookupsContext } from './provider'

interface ValuesTableProps {
  values: LookupValueItem[]
  isLoading?: boolean
}

export function ValuesTable({ values, isLoading }: ValuesTableProps) {
  const { selectedType, setIsCreateOpen, setEditingValue } = useLookupsContext()
  const [filter, setFilter] = React.useState('')
  const [showInactive, setShowInactive] = React.useState(true)

  const toggleMutation = useToggleLookupValue(selectedType?.code || '')
  const deleteMutation = useDeleteLookupValue(selectedType?.code || '')

  const filteredValues = React.useMemo(() => {
    let list = values
    if (!showInactive) {
      list = list.filter((v) => v.is_active)
    }
    if (!filter.trim()) return list
    const q = filter.toLowerCase()
    return list.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        (v.name_ar && v.name_ar.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q))
    )
  }, [values, filter, showInactive])

  if (!selectedType) {
    return (
      <div className='flex h-[400px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card/30'>
        <p className='text-sm text-muted-foreground'>
          Select a lookup catalog from the left panel to manage its options.
        </p>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full rounded-xl border bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs'>
      {/* Header bar */}
      <div className='p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1 min-w-[200px]'>
          <div className='flex items-center gap-2'>
            <h3 className='font-bold text-lg text-foreground tracking-tight'>
              {selectedType.name}
            </h3>
            <Badge variant='outline' className='font-mono text-xs'>
              {selectedType.code}
            </Badge>
            {selectedType.is_system && (
              <Badge variant='secondary' className='text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                System Master
              </Badge>
            )}
          </div>
          {selectedType.description && (
            <p className='text-xs text-muted-foreground'>
              {selectedType.description}
            </p>
          )}
        </div>

        <div className='flex items-center gap-2 ms-auto'>
          <div className='relative w-48'>
            <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              placeholder='Search options...'
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className='pl-8 h-8 text-xs bg-background'
            />
          </div>

          <Button
            size='sm'
            onClick={() => setIsCreateOpen(true)}
            className='h-8 text-xs font-semibold gap-1.5 shadow-xs'
          >
            <Plus className='h-3.5 w-3.5' />
            <span>Add Option</span>
          </Button>
        </div>
      </div>

      {/* Filter / summary bar */}
      <div className='px-4 py-2 bg-muted/40 border-b flex items-center justify-between text-xs text-muted-foreground'>
        <div className='flex items-center gap-3'>
          <span>
            Showing <strong className='text-foreground'>{filteredValues.length}</strong> of{' '}
            {values.length} configured values
          </span>
          <span className='text-muted-foreground/40'>|</span>
          <label className='flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors'>
            <input
              type='checkbox'
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className='rounded border-input text-primary focus:ring-primary h-3.5 w-3.5'
            />
            <span>Show inactive values</span>
          </label>
        </div>

        <div className='flex items-center gap-2'>
          <span className='inline-flex items-center gap-1 text-[11px]'>
            <span className='h-2 w-2 rounded-full bg-blue-500' /> System Default
          </span>
          <span className='inline-flex items-center gap-1 text-[11px]'>
            <span className='h-2 w-2 rounded-full bg-emerald-500' /> Tenant Custom
          </span>
        </div>
      </div>

      {/* Table Body */}
      <div className='flex-1 overflow-auto'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground'>
              <TableHead className='w-[60px] text-center'>Order</TableHead>
              <TableHead>Option Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className='w-[100px] text-center'>Status</TableHead>
              <TableHead className='w-[100px] text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center py-12 text-sm text-muted-foreground'>
                  Loading options...
                </TableCell>
              </TableRow>
            ) : filteredValues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center py-12'>
                  <div className='flex flex-col items-center justify-center space-y-2 text-muted-foreground'>
                    <Sparkles className='h-8 w-8 text-muted-foreground/50' />
                    <p className='text-sm font-medium'>No lookup values found</p>
                    <p className='text-xs'>
                      Click &ldquo;Add Option&rdquo; above to create the first custom value for this catalog.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredValues.map((item) => (
                <TableRow
                  key={item.id}
                  className={`text-xs transition-colors ${
                    !item.is_active ? 'opacity-60 bg-muted/20' : ''
                  }`}
                >
                  {/* Order */}
                  <TableCell className='text-center font-mono text-[11px] text-muted-foreground'>
                    {item.sort_order}
                  </TableCell>

                  {/* Name + Arabic */}
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      {item.color ? (
                        <span
                          className='h-3 w-3 rounded-full shrink-0 border shadow-xs'
                          style={{ backgroundColor: item.color }}
                        />
                      ) : (
                        <span className='h-3 w-3 rounded-full shrink-0 bg-muted border' />
                      )}
                      <div className='space-y-0.5 min-w-0'>
                        <div className='flex items-center gap-1.5'>
                          <span className='font-semibold text-foreground truncate'>
                            {item.name}
                          </span>
                          {item.is_default && (
                            <Badge
                              variant='secondary'
                              className='text-[9px] py-0 px-1 font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            >
                              Default
                            </Badge>
                          )}
                        </div>
                        {item.name_ar && (
                          <div className='text-[11px] text-muted-foreground/90 font-arabic' dir='rtl'>
                            {item.name_ar}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Code */}
                  <TableCell>
                    <code className='px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground'>
                      {item.code}
                    </code>
                  </TableCell>

                  {/* Scope */}
                  <TableCell>
                    {item.is_tenant_custom ? (
                      <Badge
                        variant='outline'
                        className='text-[10px] font-normal border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      >
                        Custom
                      </Badge>
                    ) : (
                      <Badge
                        variant='outline'
                        className='text-[10px] font-normal border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      >
                        Global
                      </Badge>
                    )}
                  </TableCell>

                  {/* Description */}
                  <TableCell className='max-w-[200px] truncate text-muted-foreground'>
                    {item.description || '—'}
                  </TableCell>

                  {/* Status Toggle */}
                  <TableCell className='text-center'>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='inline-flex items-center justify-center'>
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => toggleMutation.mutate(item.id)}
                              disabled={toggleMutation.isPending}
                              aria-label='Toggle Active'
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.is_active ? 'Active (Click to deactivate)' : 'Inactive (Click to activate)'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 text-muted-foreground hover:text-foreground'
                        onClick={() => setEditingValue(item)}
                        title='Edit Option'
                      >
                        <Edit2 className='h-3.5 w-3.5' />
                      </Button>

                      {item.is_tenant_custom ? (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          onClick={() => {
                            if (window.confirm(`Deactivate '${item.name}'?`)) {
                              deleteMutation.mutate(item.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          title='Deactivate'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className='p-1.5 text-muted-foreground/40 cursor-not-allowed'>
                                <Lock className='h-3.5 w-3.5' />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              System defaults cannot be deleted. You can deactivate them instead.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
