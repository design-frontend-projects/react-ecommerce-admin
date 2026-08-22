import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Trash2, Edit, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import { type Product } from '../data/schema'
import { useProductsContext } from './products-provider'

interface ProductRowActionsProps<TData> {
  row: Row<TData>
}

export function ProductRowActions<TData>({
  row,
}: ProductRowActionsProps<TData>) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useProductsContext()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>{t('products.columns.actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <Can permission='products.manage'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original as Product)
              setOpen('edit')
            }}
          >
            {t('products.editProduct')}
            <DropdownMenuShortcut>
              <Edit size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </Can>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original as Product)
            setOpen('view')
          }}
        >
          {t('products.viewProduct')}
          <DropdownMenuShortcut>
            <Eye size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <Can permission='products.manage'>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original as Product)
              setOpen('delete')
            }}
            className='text-red-500!'
          >
            {t('products.deleteProduct')}
            <DropdownMenuShortcut>
              <Trash2 size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
