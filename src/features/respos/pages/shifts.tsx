// ResPOS Shift Management
import { useState } from 'react'
import { format } from 'date-fns'
import { Clock, Loader2, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCloseShift, useOpenShift } from '../api/mutations'
import { useActiveShift, useShifts } from '../api/queries'
import { formatCurrency } from '../lib/formatters'
import type { ResShift } from '../types'

export function ShiftManagement() {
  const { data: activeShift, isLoading: shiftLoading } = useActiveShift()
  const { data: shifts, isLoading: shiftsLoading } = useShifts()
  const openShift = useOpenShift()
  const closeShift = useCloseShift()
  const { currentEmployee } = useResposStore()

  // Dialog states
  const [isOpenShiftDialogOpen, setIsOpenShiftDialogOpen] = useState(false)
  const [isCloseShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false)

  // Form states
  const [openingCash, setOpeningCash] = useState('0')
  const [closingCash, setClosingCash] = useState('0')
  const [closingNotes, setClosingNotes] = useState('')

  const isLoading = shiftLoading || shiftsLoading

  const handleOpenShift = async () => {
    if (currentEmployee) {
      try {
        await openShift.mutateAsync({
          employeeId: currentEmployee.id,
          openingCash: Number.parseFloat(openingCash) || 0,
        })
        setIsOpenShiftDialogOpen(false)
        setOpeningCash('0')
        toast.success('Shift opened successfully')
      } catch {
        toast.error('Failed to open shift')
      }
    }
  }

  const handleCloseShift = async () => {
    if (activeShift && currentEmployee) {
      try {
        await closeShift.mutateAsync({
          shiftId: activeShift.id,
          closingCash: Number.parseFloat(closingCash) || 0,
          employeeId: currentEmployee.id,
          notes: closingNotes,
        })
        setIsCloseShiftDialogOpen(false)
        setClosingCash('0')
        setClosingNotes('')
        toast.success('Shift closed successfully')
      } catch {
        toast.error('Failed to close shift')
      }
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Timer className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Shift Management</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {isLoading ? (
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Current Shift */}
            <Card>
              <CardHeader>
                <CardTitle>Current Shift</CardTitle>
                <CardDescription>
                  {activeShift
                    ? 'A shift is currently active'
                    : 'No active shift'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeShift ? (
                  <div className='space-y-4'>
                    <div className='flex items-center gap-4'>
                      <div className='flex h-3 w-3 animate-pulse rounded-full bg-green-500' />
                      <span className='font-medium'>Shift Active</span>
                    </div>
                    <div className='grid gap-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                          Opened At:
                        </span>
                        <span>
                          {format(new Date(activeShift.opened_at), 'PPp')}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                          Opening Cash:
                        </span>
                        <span>{formatCurrency(activeShift.opening_cash)}</span>
                      </div>
                    </div>
                    <Button
                      variant='destructive'
                      onClick={() => setIsCloseShiftDialogOpen(true)}
                    >
                      <Clock className='mr-2 h-4 w-4' />
                      Close Shift
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsOpenShiftDialogOpen(true)}
                    className='bg-linear-to-r from-green-500 to-emerald-500'
                  >
                    <Timer className='mr-2 h-4 w-4' />
                    Open New Shift
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Shift History */}
            <Card>
              <CardHeader>
                <CardTitle>Shift History</CardTitle>
                <CardDescription>Recent shifts</CardDescription>
              </CardHeader>
              <CardContent>
                {shifts && shifts.length > 0 ? (
                  <div className='space-y-2'>
                    {shifts.slice(0, 10).map((shift: ResShift) => (
                      <div
                        key={shift.id}
                        className='flex items-center justify-between rounded-lg border p-3'
                      >
                        <div>
                          <p className='font-medium'>
                            {format(new Date(shift.opened_at), 'PP')}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {format(new Date(shift.opened_at), 'p')} -
                            {shift.closed_at
                              ? format(new Date(shift.closed_at), 'p')
                              : 'Active'}
                          </p>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm'>
                            {shift.status === 'open' ? (
                              <span className='text-green-500'>Active</span>
                            ) : (
                              <span className='text-muted-foreground'>
                                Closed
                              </span>
                            )}
                          </div>
                          {shift.closed_at && (
                            <div className='text-xs text-muted-foreground'>
                              Total: {formatCurrency(shift.closing_cash || 0)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground'>No shift history yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Main>

      {/* Open Shift Dialog */}
      <Dialog
        open={isOpenShiftDialogOpen}
        onOpenChange={setIsOpenShiftDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
            <DialogDescription>
              Enter the starting cash amount for this shift.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='opening-cash'>Opening Cash</Label>
              <Input
                id='opening-cash'
                type='number'
                min='0'
                step='0.01'
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsOpenShiftDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleOpenShift} disabled={openShift.isPending}>
              {openShift.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Open Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog
        open={isCloseShiftDialogOpen}
        onOpenChange={setIsCloseShiftDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>
              Enter the closing cash amount and any notes.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='closing-cash'>Closing Cash</Label>
              <Input
                id='closing-cash'
                type='number'
                min='0'
                step='0.01'
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='closing-notes'>Notes</Label>
              <Textarea
                id='closing-notes'
                placeholder='Any discrepancies or notes about the shift...'
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsCloseShiftDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseShift}
              disabled={closeShift.isPending}
              variant='destructive'
            >
              {closeShift.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
