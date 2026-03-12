import { useEffect, useRef } from 'react'

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void
  enabled?: boolean
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
}: UseBarcodeScannerProps) {
  const barcodeBuffer = useRef('')
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignored focus states (inputs/textareas) unless we want to intercept
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      // Barcode scanners act as keyboards. They type fast and hit Enter.
      if (e.key === 'Enter' && barcodeBuffer.current.length > 0) {
        onScan(barcodeBuffer.current)
        barcodeBuffer.current = ''
        if (timeoutId.current) clearTimeout(timeoutId.current)
        return
      }

      // Collect alphanumeric characters or standard symbols
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key

        // Reset buffer if typing is too slow (human typing vs scanner)
        if (timeoutId.current) clearTimeout(timeoutId.current)
        timeoutId.current = setTimeout(() => {
          barcodeBuffer.current = ''
        }, 50) // 50ms implies fast automated input
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan, enabled])
}

export function BarcodeScannerListener({
  onScan,
}: {
  onScan: (barcode: string) => void
}) {
  useBarcodeScanner({ onScan })
  return null
}
