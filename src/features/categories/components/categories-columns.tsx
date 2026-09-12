import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import { CornerDownRight, Folder, FolderTree, Package } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { type Category } from '../hooks/use-categories'
import { CategoryRowActions } from './category-row-actions'

export const getColumns = (t: TFunction): ColumnDef<Category>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: t('categories.columns.name', { defaultValue: 'Category Name' }),
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const nameAr = row.original.name_ar

      return (
        <div className='flex flex-col gap-0.5 min-w-[170px] max-w-[280px]'>
          <div className='flex items-center gap-1.5 font-medium text-foreground'>
            <Folder className='h-3.5 w-3.5 text-primary/80 shrink-0' />
            <span className='truncate'>{name}</span>
          </div>
          {nameAr && (
            <div
              className='text-xs font-arabic text-muted-foreground/90 pl-5 truncate'
              dir='rtl'
            >
              {nameAr}
            </div>
          )}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: 'parent',
    header: t('categories.columns.parent', { defaultValue: 'Parent Category' }),
    accessorFn: (row) => row.parent?.name || '',
    cell: ({ row }) => {
      const parent = row.original.parent

      if (parent) {
        return (
          <Badge
            variant='outline'
            className='flex items-center gap-1.5 py-1 px-2.5 font-normal text-xs bg-muted/30 border-border/80 max-w-[220px]'
          >
            <CornerDownRight className='h-3 w-3 text-primary shrink-0' />
            <span className='truncate font-medium'>{parent.name}</span>
            {parent.name_ar && (
              <span
                className='font-arabic text-[11px] text-muted-foreground/80 truncate hidden sm:inline'
                dir='rtl'
              >
                ({parent.name_ar})
              </span>
            )}
          </Badge>
        )
      }

      return (
        <Badge
          variant='secondary'
          className='text-[11px] font-medium py-0.5 px-2 bg-primary/10 text-primary border-primary/20'
        >
          {t('categories.rootCategory', { defaultValue: 'Root Department' })}
        </Badge>
      )
    },
  },
  {
    id: 'subcategories',
    header: t('categories.columns.subcategories', { defaultValue: 'Subcategories' }),
    accessorFn: (row) => row._count?.children ?? 0,
    cell: ({ row }) => {
      const count = row.original._count?.children ?? 0
      if (count > 0) {
        return (
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <FolderTree className='h-3.5 w-3.5 text-muted-foreground/80' />
            <span className='font-semibold text-foreground'>{count}</span>
            <span className='hidden sm:inline text-[11px]'>
              {count === 1
                ? t('categories.subcategory', { defaultValue: 'sub' })
                : t('categories.subcategories', { defaultValue: 'subs' })}
            </span>
          </div>
        )
      }
      return <span className='text-xs text-muted-foreground/50'>—</span>
    },
  },
  {
    id: 'products',
    header: t('categories.columns.productsCount', { defaultValue: 'Products' }),
    accessorFn: (row) => row._count?.products ?? 0,
    cell: ({ row }) => {
      const count = row.original._count?.products ?? 0
      return (
        <div className='flex items-center gap-1.5 text-xs'>
          <Package className='h-3.5 w-3.5 text-muted-foreground/70' />
          <span className={count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground/60'}>
            {count}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: t('categories.columns.status', { defaultValue: 'Status' }),
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') !== false
      return (
        <div className='flex items-center gap-1.5'>
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted-foreground/40'
            }`}
          />
          <span className='text-xs font-medium'>
            {isActive
              ? t('common.active', { defaultValue: 'Active' })
              : t('common.inactive', { defaultValue: 'Inactive' })}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'description',
    header: t('categories.columns.description', { defaultValue: 'Description' }),
    cell: ({ row }) => {
      const desc = row.getValue('description') as string | null
      return (
        <div className='max-w-[280px] truncate text-xs text-muted-foreground'>
          {desc || '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: t('categories.columns.createdAt', { defaultValue: 'Created At' }),
    cell: ({ row }) => {
      const val = row.getValue('created_at')
      return (
        <div className='flex w-[90px] text-xs text-muted-foreground'>
          {val ? new Date(val as string).toLocaleDateString() : '—'}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: CategoryRowActions,
  },
]
