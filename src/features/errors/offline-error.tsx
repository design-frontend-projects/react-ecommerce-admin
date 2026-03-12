import { useNavigate } from '@tanstack/react-router'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function OfflineError({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const navigate = useNavigate()

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
        <div className='flex h-24 w-24 items-center justify-center rounded-full bg-muted'>
          <WifiOff className='h-12 w-12 text-muted-foreground' />
        </div>
        <h1 className='text-3xl font-bold tracking-tight'>You're offline</h1>
        <p className='max-w-md text-center text-muted-foreground'>
          It looks like you've lost your internet connection. Please check your network settings and try again.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
