import * as React from 'react'
import {
  Search,
  Download,
  Edit2,
  Trash2,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDeleteLookupValue,
  useToggleLookupValue,
} from '../hooks/use-lookups'
import { useLookupsContext } from './provider'
import type { LookupTypeTreeNode, LookupValueItem, TreeLookupValueNode } from '../data/schema'

interface GlobalValuesMatrixProps {
  types: LookupTypeTreeNode[]
  isLoading?: boolean
}

export function GlobalValuesMatrix({ types, isLoading }: GlobalValuesMatrixProps) {
  const [search, setSearch] = React.useState('')
  const [selectedCatalog, setSelectedCatalog] = React.useState<string>('all')
  const [showInactive, setShowInactive] = React.useState(true)

  // Flatten all values across types
  const allValues = React.useMemo(() => {
    const list: (LookupValueItem & { type_code: string; type_name: string; domain_label: string })[] = []
    types.forEach((t) => {
      (t.flat_values || []).forEach((v) => {
        list.push({
          ...v,
          type_code: t.code,
          type_name: t.name,
          domain_label: t.domain_label,
        })
      })
    })
    return list
  }, [types])

  const filteredValues = React.useMemo(() => {
    let list = allValues

    if (selectedCatalog !== 'all') {
      list = list.filter((v) => v.type_code === selectedCatalog)
    }

    if (!showInactive) {
      list = list.filter((v) => v.is_active)
    }

    if (!search.trim()) return list

    const q = search.toLowerCase()
    return list.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        v.type_name.toLowerCase().includes(q) ||
        v.type_code.toLowerCase().includes(q) ||
        (v.name_ar && v.name_ar.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q))
    )
  }, [allValues, selectedCatalog, showInactive, search])

  const handleExportCSV = () => {
    if (filteredValues.length === 0) {
      toast.error('No values to export')
      return
    }

    const headers = [
      'Catalog Code',
      'Catalog Name',
      'Option Code',
      'Option Name',
      'Arabic Name',
      'Scope',
      'Status',
      'Default',
      'Sort Order',
      'Description',
    ]

    const rows = filteredValues.map((v) => [
      `"${v.type_code}"`,
      `"${v.type_name}"`,
      `"${v.code}"`,
      `"${v.name}"`,
      `"${v.name_ar || ''}"`,
      v.is_tenant_custom ? 'Custom' : 'System',
      v.is_active ? 'Active' : 'Inactive',
      v.is_default ? 'Yes' : 'No',
      v.sort_order,
      `"${(v.description || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `lookups_matrix_export_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${filteredValues.length} lookup values to CSV`)
  }

  return (
    <div className='flex flex-col h-full rounded-xl border bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs'>
      {/* Search and Filters Toolbar */}
      <div className='p-3.5 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2 flex-1'>
          <div className='relative w-64'>
            <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              placeholder='Search across all catalogs...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-8 h-8 text-xs bg-background'
            />
          </div>

          <Select value={selectedCatalog} onValueChange={setSelectedCatalog}>
            <SelectTrigger className='w-52 h-8 text-xs bg-background'>
              <SelectValue placeholder='Filter by Catalog' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Catalogs ({types.length})</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.code}>
                  {t.name} ({t.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className='flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors'>
            <input
              type='checkbox'
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className='rounded border-input text-primary focus:ring-primary h-3.5 w-3.5'
            />
            <span>Show Inactive</span>
          </label>
        </div>

        <div className='flex items-center gap-2 ms-auto'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportCSV}
            className='h-8 text-xs gap-1.5'
          >
            <Download className='h-3.5 w-3.5' />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className='px-4 py-2 bg-muted/30 border-b flex items-center justify-between text-xs text-muted-foreground'>
        <span>
          Showing <strong className='text-foreground'>{filteredValues.length}</strong> of{' '}
          {allValues.length} total options
        </span>
        <span className='font-mono text-[11px]'>
          {types.length} Master Catalogs
        </span>
      </div>

      {/* Table Body */}
      <div className='flex-1 overflow-auto'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground'>
              <TableHead>Catalog</TableHead>
              <TableHead>Option Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className='w-[80px] text-center'>Status</TableHead>
              <TableHead className='w-[100px] text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center py-12 text-xs text-muted-foreground'>
                  Loading matrix data...
                </TableCell>
              </TableRow>
            ) : filteredValues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center py-12 text-xs text-muted-foreground'>
                  No lookup values match your search and filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredValues.map((item) => (
                <MatrixRow key={`${item.type_code}_${item.id}`} item={item} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MatrixRow({
  item,
}: {
  item: LookupValueItem & { type_code: string; type_name: string; domain_label: string }
}) {
  const {
    setSelectedType,
    setEditingValue,
    setSelectedInspectorNode,
    setIsInspectorOpen,
  } = useLookupsContext()

  const toggleMutation = useToggleLookupValue(item.type_code)
  const deleteMutation = useDeleteLookupValue(item.type_code)

  return (
    <TableRow className={`text-xs transition-colors ${!item.is_active ? 'opacity-60 bg-muted/20' : ''}`}>
      {/* Catalog */}
      <TableCell className='font-medium text-foreground'>
        <div className='space-y-0.5 min-w-[140px]'>
          <div className='font-semibold'>{item.type_name}</div>
          <div className='font-mono text-[10px] text-muted-foreground'>
            {item.type_code}
          </div>
        </div>
      </TableCell>

      {/* Option Name & Arabic */}
      <TableCell>
        <div className='flex items-center gap-2 min-w-[160px]'>
          {item.color ? (
            <span
              className='h-3 w-3 rounded-full shrink-0 border'
              style={{ backgroundColor: item.color }}
            />
          ) : (
            <span className='h-3 w-3 rounded-full shrink-0 bg-muted border' />
          )}
          <div className='space-y-0.5'>
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
            className='text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          >
            Custom
          </Badge>
        ) : (
          <Badge
            variant='outline'
            className='text-[10px] border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
          >
            System
          </Badge>
        )}
      </TableCell>

      {/* Description */}
      <TableCell className='max-w-[180px] truncate text-muted-foreground'>
        {item.description || '—'}
      </TableCell>

      {/* Status Toggle */}
      <TableCell className='text-center'>
        <Switch
          checked={item.is_active}
          onCheckedChange={() => toggleMutation.mutate(item.id)}
          disabled={toggleMutation.isPending}
          aria-label='Toggle Active'
        />
      </TableCell>

      {/* Actions */}
      <TableCell className='text-right'>
        <div className='flex items-center justify-end gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-muted-foreground hover:text-foreground'
            onClick={() => {
              setSelectedInspectorNode({
                type: 'value',
                data: item as unknown as TreeLookupValueNode,
              })
              setIsInspectorOpen(true)
            }}
            title='Inspect Details'
          >
            <Info className='h-3.5 w-3.5' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-muted-foreground hover:text-foreground'
            onClick={() => {
              setSelectedType({
                id: item.lookup_type_id,
                code: item.type_code,
                name: item.type_name,
                is_system: false,
                is_active: true,
                sort_order: 0,
                values_count: 0,
                custom_count: 0,
                system_count: 0,
              })
              setEditingValue(item)
            }}
            title='Edit Option'
          >
            <Edit2 className='h-3.5 w-3.5' />
          </Button>

          {item.is_tenant_custom && (
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
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
