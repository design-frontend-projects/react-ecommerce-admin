import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, RefreshCw, Loader2, Monitor, ShieldAlert } from 'lucide-react'
import { usePosScreenLogs } from '../hooks/use-pos-queries'
import { usePosStore } from '../store/use-pos-store'
import { cn } from '@/lib/utils'

interface PosScreenLogDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PosScreenLogDrawer({ open, onOpenChange }: PosScreenLogDrawerProps) {
  const { terminal, session } = usePosStore()

  const { data: response, isLoading, refetch } = usePosScreenLogs({
    terminalId: terminal?.id,
    sessionId: session?.id,
    pageSize: 30,
  })

  const logs = response?.data?.logs || []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-md p-0 flex flex-col'>
        <SheetHeader className='p-4 border-b bg-muted/20'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Activity className='h-5 w-5 text-primary' />
              <SheetTitle className='text-base font-bold'>POS Activity Log Stream</SheetTitle>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>
          <SheetDescription className='text-xs flex items-center gap-2 pt-1'>
            <Monitor className='h-3 w-3' />
            <span>Terminal: {terminal?.code || 'None'}</span>
            {session && <Badge variant='secondary' className='text-[9px] py-0'>Session Active</Badge>}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className='flex-1 p-4'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
              <span className='text-xs'>Loading recent events...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className='py-20 text-center text-muted-foreground text-xs'>
              No events recorded yet for this terminal session.
            </div>
          ) : (
            <div className='space-y-3'>
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'p-2.5 rounded-lg border text-xs space-y-1.5 transition-colors',
                    log.level === 'critical' || log.level === 'error'
                      ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20'
                      : log.level === 'warn'
                      ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20'
                      : 'bg-card hover:bg-muted/40'
                  )}
                >
                  <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
                    <span className='font-mono'>
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[9px] font-mono py-0',
                        log.action.includes('REFUND')
                          ? 'text-rose-600 border-rose-300'
                          : log.action.includes('PIN')
                          ? 'text-purple-600 border-purple-300'
                          : ''
                      )}
                    >
                      {log.action}
                    </Badge>
                  </div>

                  <p className='font-medium text-foreground text-xs leading-snug'>
                    {log.message}
                  </p>

                  <div className='flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40'>
                    <span>By: {log.userName}</span>
                    <span className='uppercase font-semibold'>{log.level}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
