import { type ColumnDef } from '@tanstack/react-table'
import { ArrowRight, Building2, Store, Warehouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import type { TransferListItem } from '../data/schema'
import { TransferRowActions } from './row-actions'

function getEntityDisplay(
  warehouse?: { name: string | null; code?: string | null } | null,
  store?: { name: string | null } | null,
  branch?: { name: string | null } | null
) {
  if (warehouse?.name) {
    return {
      name: warehouse.name,
      code: warehouse.code,
      type: 'Warehouse',
      Icon: Warehouse,
    }
  }
  if (store?.name) {
    return {
      name: store.name,
      type: 'Store',
      Icon: Store,
    }
  }
  if (branch?.name) {
    return {
      name: branch.name,
      type: 'Branch',
      Icon: Building2,
    }
  }
  return {
    name: '—',
    type: '',
    Icon: Warehouse,
  }
}

export const columns: ColumnDef<TransferListItem>[] = [
  {
    accessorKey: 'reference_no',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reference / Transfer #" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-semibold text-foreground">
          {row.original.reference_no || `TR-${row.original.id.slice(0, 8)}`}
        </span>
        {row.original.transfer_no && (
          <span className="text-xs text-muted-foreground font-mono">
            #{row.original.transfer_no}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'route',
    header: 'Transfer Route (Origin → Target)',
    cell: ({ row }) => {
      const from = getEntityDisplay(
        row.original.source_warehouse,
        row.original.from_store,
        row.original.from_branch
      )
      const to = getEntityDisplay(
        row.original.destination_warehouse,
        row.original.to_store,
        row.original.to_branch
      )

      return (
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            {from.type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
                {from.type}
              </Badge>
            )}
            <span>{from.name}</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5 font-medium">
            {to.type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
                {to.type}
              </Badge>
            )}
            <span>{to.name}</span>
          </div>
        </div>
      )
    },
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => {
      const count = row.original._count?.stock_transfer_items ?? 0
      return (
        <Badge variant="secondary" className="font-semibold">
          {count} {count === 1 ? 'item' : 'items'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Created" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.original.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <TransferRowActions row={row.original} />,
  },
]


