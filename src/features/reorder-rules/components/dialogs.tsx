import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteRule } from '../hooks/use-reorder-rules'
import { useReorderRulesContext } from './provider'
import { RuleFormDialog } from './rule-form-dialog'

export function ReorderRulesDialogs() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useReorderRulesContext()
  const deleteRule = useDeleteRule()

  return (
    <>
      <RuleFormDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
        rule={null}
      />
      {currentRow ? (
        <>
          <RuleFormDialog
            open={open === 'edit'}
            onOpenChange={(value) => setOpen(value ? 'edit' : null)}
            rule={currentRow}
          />
          <AlertDialog
            open={open === 'delete'}
            onOpenChange={(value) => setOpen(value ? 'delete' : null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('reorderRules.dialog.deleteTitle', 'Delete reorder rule?')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    'reorderRules.dialog.deleteDesc',
                    'The rule for {{sku}} at {{store}} will be permanently deleted. Its open suggestions are removed with it.',
                    {
                      sku: currentRow.product_variants?.sku ?? 'this variant',
                      store: currentRow.stores?.name ?? 'this store',
                    }
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t('reorderRules.dialog.cancel', 'Cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteRule.mutate(currentRow.id)
                    setOpen(null)
                  }}
                >
                  {t('reorderRules.dialog.delete', 'Delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </>
  )
}
