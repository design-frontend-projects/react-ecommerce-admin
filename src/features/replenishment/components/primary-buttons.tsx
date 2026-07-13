import { useState } from 'react'
import { FileInput, RefreshCw } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import {
  useConvertSuggestions,
  useRunReorderCheck,
} from '../hooks/use-replenishment'
import { useReplenishmentContext } from './provider'

export function ReplenishmentPrimaryButtons() {
  const [convertOpen, setConvertOpen] = useState(false)
  const { selectedIds, setRowSelection } = useReplenishmentContext()
  const runCheck = useRunReorderCheck()
  const convertSuggestions = useConvertSuggestions()

  const handleConvert = async () => {
    try {
      await convertSuggestions.mutateAsync(selectedIds)
      setRowSelection({})
    } catch {
      /* handled by mutation onError toast */
    }
  }

  return (
    <Can permission='purchasing.manage'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          variant='outline'
          onClick={() => runCheck.mutate(undefined)}
          disabled={runCheck.isPending}
        >
          <RefreshCw
            className={`me-1 h-4 w-4 ${runCheck.isPending ? 'animate-spin' : ''}`}
          />
          Run reorder check
        </Button>
        <Button
          onClick={() => setConvertOpen(true)}
          disabled={selectedIds.length === 0 || convertSuggestions.isPending}
        >
          <FileInput className='me-1 h-4 w-4' />
          Convert to requisition
        </Button>
      </div>
      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to requisition?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.length} selected suggestion(s) will be combined into
              a single purchase requisition and marked as converted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleConvert()
                setConvertOpen(false)
              }}
            >
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Can>
  )
}
