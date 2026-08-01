import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TaskSchedulerProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (title: string, dueDate: string) => void
}

export function TaskScheduler({
  isOpen,
  onClose,
  onSchedule,
}: TaskSchedulerProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const { t } = useTranslation()

  const handleSchedule = () => {
    if (!title || !dueDate) return
    onSchedule(title, dueDate)
    setTitle('')
    setDueDate('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('crm.scheduleTask', 'Schedule a Task')}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='title' className='text-right'>
              {t('crm.task', 'Task')}
            </Label>
            <Input
              id='title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('crm.taskPlaceholder', 'e.g., Follow up call')}
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='dueDate' className='text-right'>
              {t('crm.dueDate', 'Due Date')}
            </Label>
            <Input
              id='dueDate'
              type='datetime-local'
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className='col-span-3'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSchedule} disabled={!title || !dueDate}>
            {t('crm.schedule', 'Schedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
