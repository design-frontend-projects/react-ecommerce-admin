import { type Row } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import {
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Calculator,
  Power,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import type { TaxRate } from '../types'
import {
  useToggleTaxRateStatus,
  useDuplicateTaxRate,
} from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

interface TaxRowActionsProps<TData> {
  row: Row<TData>
}

export function TaxRowActions<TData>({ row }: TaxRowActionsProps<TData>) {
  const { t } = useTranslation()
  const rate = row.original as TaxRate
  const { setOpen, setCurrentRow } = useTaxContext()
  const toggleMutation = useToggleTaxRateStatus()
  const duplicateMutation = useDuplicateTaxRate()

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync({
        id: rate.id,
        isActive: !rate.is_active,
      })
      toast.success(
        rate.is_active
          ? t('taxRates.notifications.deactivated', {
              defaultValue: 'Tax rate deactivated',
            })
          : t('taxRates.notifications.activated', {
              defaultValue: 'Tax rate activated',
            })
      )
    } catch {
      toast.error(
        t('taxRates.notifications.statusChangeError', {
          defaultValue: 'Failed to change status',
        })
      )
    }
  }

  const handleDuplicate = async () => {
    try {
      await duplicateMutation.mutateAsync(rate)
      toast.success(
        t('taxRates.notifications.duplicateSuccess', {
          taxType: rate.tax_type,
          defaultValue: `Cloned ${rate.tax_type}`,
        })
      )
    } catch {
      toast.error(
        t('taxRates.notifications.duplicateError', {
          defaultValue: 'Failed to duplicate tax rate',
        })
      )
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>
            {t('common.openMenu', { defaultValue: 'Open menu' })}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[180px]'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(rate)
            setOpen('view')
          }}
        >
          <Eye className='mr-2 h-4 w-4 text-muted-foreground' />
          {t('taxRates.actions.viewDetails', { defaultValue: 'View Details' })}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(rate)
            setOpen('calculator')
          }}
        >
          <Calculator className='mr-2 h-4 w-4 text-primary' />
          {t('taxRates.actions.testSimulator', {
            defaultValue: 'Test Simulator',
          })}
        </DropdownMenuItem>

        <Can permission='settings.manage'>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(rate)
              setOpen('edit')
            }}
          >
            <Edit className='mr-2 h-4 w-4 text-muted-foreground' />
            {t('taxRates.actions.edit', { defaultValue: 'Edit' })}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
          >
            <Copy className='mr-2 h-4 w-4 text-muted-foreground' />
            {t('taxRates.actions.duplicate', { defaultValue: 'Duplicate' })}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
          >
            <Power className='mr-2 h-4 w-4 text-muted-foreground' />
            {rate.is_active
              ? t('taxRates.actions.deactivate', {
                  defaultValue: 'Deactivate',
                })
              : t('taxRates.actions.activate', { defaultValue: 'Activate' })}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(rate)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            {t('taxRates.actions.delete', { defaultValue: 'Delete' })}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
