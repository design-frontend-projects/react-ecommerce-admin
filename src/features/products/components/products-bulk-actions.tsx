import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Download, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type Product } from '../data/schema'
import { computeTotalStock } from './products-columns'

interface ProductsBulkActionsProps {
  table: Table<Product>
}

export function ProductsBulkActions({ table }: ProductsBulkActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isUpdating, setIsUpdating] = useState(false)

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = async (isActive: boolean) => {
    const selectedIds = selectedRows
      .map((row) => row.original.id)
      .filter(Boolean) as string[]

    if (!selectedIds.length) return

    setIsUpdating(true)
    const actionName = isActive ? 'Activating' : 'Deactivating'
    const successName = isActive ? 'Activated' : 'Deactivated'

    toast.promise(
      async () => {
        const { error } = await supabase
          .from('products')
          .update({
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .in('id', selectedIds)

        if (error) throw error
        await queryClient.invalidateQueries({ queryKey: ['products'] })
        table.resetRowSelection()
      },
      {
        loading: `${actionName} ${selectedIds.length} products...`,
        success: `${successName} ${selectedIds.length} products successfully`,
        error: `Failed to update products status`,
      }
    )

    setIsUpdating(false)
  }

  const handleExportSelected = () => {
    const products = selectedRows.map((row) => row.original)
    if (!products.length) return

    const headers = [
      'ID',
      'Name',
      'SKU',
      'Barcode',
      'Category',
      'Brand',
      'Product Type',
      'Stock',
      'Status',
      'Created At',
    ]

    const csvRows = products.map((p) => [
      `"${p.id || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      `"${(p.barcode || '').replace(/"/g, '""')}"`,
      `"${(p.categories?.name || '').replace(/"/g, '""')}"`,
      `"${(p.brands?.name || '').replace(/"/g, '""')}"`,
      `"${p.product_type || 'simple'}"`,
      computeTotalStock(p),
      p.is_active ? 'Active' : 'Inactive',
      `"${p.created_at || ''}"`,
    ])

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `selected_products_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(
      t('products.bulk.exportSuccess', {
        defaultValue: `Exported ${products.length} products to CSV`,
        count: products.length,
      })
    )
  }

  return (
    <BulkActionsToolbar table={table} entityName='product'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            disabled={isUpdating}
            onClick={() => handleBulkStatusChange(true)}
            className='h-8 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700'
          >
            <CheckCircle className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>{t('common.activate', { defaultValue: 'Activate' })}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('products.bulk.activateTooltip', { defaultValue: 'Mark selected as active' })}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            disabled={isUpdating}
            onClick={() => handleBulkStatusChange(false)}
            className='h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive'
          >
            <XCircle className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>{t('common.deactivate', { defaultValue: 'Deactivate' })}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('products.bulk.deactivateTooltip', { defaultValue: 'Mark selected as inactive' })}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportSelected}
            className='h-8 gap-1.5 text-xs'
          >
            <Download className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>{t('common.exportCsv', { defaultValue: 'Export' })}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('products.bulk.exportTooltip', { defaultValue: 'Export selected products to CSV' })}</p>
        </TooltipContent>
      </Tooltip>
    </BulkActionsToolbar>
  )
}
