import type { ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { Eye, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MovementRow } from '../data/schema'

const defaultT: TFunction = ((key: string, def?: string) =>
  typeof def === 'string' ? def : key) as unknown as TFunction

export interface GetMovementColumnsOptions {
  onInspect?: (movement: MovementRow) => void
  t?: TFunction
}

export function getMovementColumns({
  onInspect,
  t = defaultT,
}: GetMovementColumnsOptions = {}): ColumnDef<MovementRow>[] {
  return [
    {
      accessorKey: 'movement_date',
      header: t('inventoryMovements.table.date', 'Date & Time'),
      cell: ({ row }) => {
        const dateStr = row.original.movement_date
        const formatted = new Date(dateStr).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
        return (
          <div className='flex flex-col'>
            <span className='font-medium text-foreground whitespace-nowrap text-xs sm:text-sm'>
              {formatted}
            </span>
            {row.original.movement_no && (
              <span className='font-mono text-[10px] text-muted-foreground'>
                #{row.original.movement_no}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'movement_type',
      header: t('inventoryMovements.table.type', 'Type'),
      cell: ({ row }) => {
        const type = row.original.movement_type
        const delta = row.original.quantity_delta
        const isInbound = delta > 0 || row.original.qty_in > 0
        const isOutbound = delta < 0 || row.original.qty_out > 0

        const typeLabel = t(
          `inventoryMovements.types.${type}`,
          type.replace(/_/g, ' ')
        )

        return (
          <Badge
            variant='outline'
            className={
              isInbound
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 capitalize whitespace-nowrap text-xs gap-1'
                : isOutbound
                  ? 'border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 capitalize whitespace-nowrap text-xs gap-1'
                  : 'border-slate-500/30 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 capitalize whitespace-nowrap text-xs gap-1'
            }
          >
            {isInbound ? (
              <ArrowDownRight className='h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0' />
            ) : isOutbound ? (
              <ArrowUpRight className='h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0' />
            ) : null}
            <span>{typeLabel}</span>
          </Badge>
        )
      },
    },
    {
      accessorKey: 'product_variants',
      header: t('inventoryMovements.table.variantSku', 'Variant / SKU'),
      cell: ({ row }) => {
        const variant = row.original.product_variants
        const sku = variant?.sku ?? row.original.product_variant_id.slice(0, 8)
        const name = variant?.name
        return (
          <div className='flex flex-col max-w-[200px]'>
            <span className='font-mono font-semibold text-xs sm:text-sm tracking-tight truncate'>
              {sku}
            </span>
            {name && (
              <span className='text-[11px] text-muted-foreground truncate' title={name}>
                {name}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'location',
      header: t('inventoryMovements.table.warehouseStore', 'Location'),
      cell: ({ row }) => {
        const wh = row.original.warehouses
        const store = row.original.stores
        const branch = row.original.branches
        const loc = row.original.warehouse_locations

        const name =
          wh?.name ?? store?.name ?? branch?.name ?? t('common.unspecified', '—')
        const code = wh?.code ? ` (${wh.code})` : ''
        const bin = loc?.code ? ` • ${loc.code}` : ''

        return (
          <div className='flex flex-col text-xs'>
            <span className='font-medium text-foreground truncate max-w-[160px]'>
              {name}
              {code}
            </span>
            {bin && (
              <span className='text-[10px] text-muted-foreground truncate'>
                {bin}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'qty_in',
      header: () => (
        <span className='text-end block'>{t('inventoryMovements.table.in', 'In (+)')}</span>
      ),
      cell: ({ row }) => {
        const val = row.original.qty_in
        if (!val || val <= 0) {
          return <span className='text-end block text-muted-foreground/40 text-xs'>—</span>
        }
        return (
          <span className='text-end block font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-xs sm:text-sm'>
            +{val.toLocaleString()}
          </span>
        )
      },
    },
    {
      accessorKey: 'qty_out',
      header: () => (
        <span className='text-end block'>{t('inventoryMovements.table.out', 'Out (-)')}</span>
      ),
      cell: ({ row }) => {
        const val = row.original.qty_out
        if (!val || val <= 0) {
          return <span className='text-end block text-muted-foreground/40 text-xs'>—</span>
        }
        return (
          <span className='text-end block font-semibold text-rose-600 dark:text-rose-400 font-mono text-xs sm:text-sm'>
            -{val.toLocaleString()}
          </span>
        )
      },
    },
    {
      accessorKey: 'unit_cost',
      header: () => (
        <span className='text-end block'>
          {t('inventoryMovements.table.unitCost', 'Unit Cost')}
        </span>
      ),
      cell: ({ row }) => {
        const cost = Number(row.original.unit_cost ?? 0)
        return (
          <span className='text-end block font-mono text-xs text-muted-foreground'>
            {cost > 0 ? `$${cost.toFixed(2)}` : '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'reference',
      header: t('inventoryMovements.table.reference', 'Reference'),
      cell: ({ row }) => {
        const {
          reference_type,
          reference_id,
          source_document_type,
          source_document_id,
        } = row.original

        const docType = source_document_type ?? reference_type
        const docId = source_document_id ?? reference_id

        if (reference_type === 'inventory_transaction' || source_document_type) {
          return (
            <Link
              to='/inventory-transactions'
              className='font-medium text-primary hover:underline inline-flex items-center gap-1 text-xs max-w-[140px] truncate'
            >
              <span>{docType ?? t('inventoryMovements.reference.txn', 'Txn')}</span>
              <ExternalLink className='h-3 w-3 shrink-0 opacity-70' />
            </Link>
          )
        }

        if (docType || docId) {
          return (
            <span
              className='text-muted-foreground text-xs max-w-[140px] truncate block'
              title={`${docType ?? ''} ${docId ?? ''}`}
            >
              {docType ? docType.replace(/_/g, ' ') : docId}
            </span>
          )
        }

        return <span className='text-muted-foreground/40 text-xs'>—</span>
      },
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>{t('inventoryMovements.table.actions', 'Actions')}</span>,
      cell: ({ row }) => {
        return (
          <div className='flex items-center justify-end'>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
              onClick={(e) => {
                e.stopPropagation()
                onInspect?.(row.original)
              }}
              title={t('inventoryMovements.table.inspect', 'Inspect')}
            >
              <Eye className='h-4 w-4' />
              <span className='sr-only'>{t('inventoryMovements.table.inspect', 'Inspect')}</span>
            </Button>
          </div>
        )
      },
    },
  ]
}
