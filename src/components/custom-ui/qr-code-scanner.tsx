import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface QRCodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (data: string) => void
  allowMultiple?: boolean
}

export function QRCodeScanner({
  open,
  onOpenChange,
  onScan,
  allowMultiple = false,
}: QRCodeScannerProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const handleScan = (result: { rawValue: string }[]) => {
    if (result && result.length > 0) {
      const data = result[0].rawValue
      onScan(data)

      if (!isMuted) {
        const audio = new Audio('/assets/sounds/scan-success.mp3')
        audio.play().catch(() => {
          /* Ignore audio play errors */
        })
      }

      if (!allowMultiple) {
        onOpenChange(false)
      } else {
        // Briefly pause to prevent double scans
        setIsPaused(true)
        setTimeout(() => setIsPaused(false), 1500)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`transition-all duration-300 ${
          isMinimized
            ? 'fixed right-4 bottom-4 w-60 p-2 sm:max-w-[240px]'
            : 'sm:max-w-md'
        }`}
      >
        {!isMinimized && (
          <DialogHeader>
            <DialogTitle>Scan QR/Barcode</DialogTitle>
            <DialogDescription>
              Position the code within the camera frame to scan.
            </DialogDescription>
          </DialogHeader>
        )}

        <div
          className={`relative overflow-hidden rounded-lg bg-black transition-all duration-300 ${
            isMinimized ? 'aspect-video' : 'aspect-square'
          }`}
        >
          {!isPaused && open && (
            <Scanner
              onScan={handleScan}
              allowMultiple={allowMultiple}
              styles={{
                container: { width: '100%', height: '100%' },
              }}
            />
          )}

          {isPaused && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/50 text-white'>
              <div className='text-center'>
                <div className='mb-2 text-xl font-bold'>Scan Successful!</div>
                <div className='text-sm opacity-80'>
                  Resuming in a moment...
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className='h-4 w-4 text-muted-foreground' />
              ) : (
                <Volume2 className='h-4 w-4' />
              )}
            </Button>

            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className='h-4 w-4' />
              ) : (
                <Minimize2 className='h-4 w-4' />
              )}
            </Button>
          </div>

          {!isMinimized && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
