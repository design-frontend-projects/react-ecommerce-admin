import { useEffect, useRef } from 'react'
// @ts-expect-error - Missing type declarations
import { QRCodeGeneratorComponent } from '@syncfusion/ej2-react-barcode-generator'
import JsBarcode from 'jsbarcode'

interface BarcodeDisplayProps {
  value: string
  type?: 'barcode' | 'qrcode'
}

export function BarcodeDisplay({
  value,
  type = 'barcode',
}: BarcodeDisplayProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (type === 'barcode' && barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to generate barcode:', error)
      }
    }
  }, [value, type])

  if (!value) return null

  return (
    <div className='flex flex-col items-center justify-center space-y-2 rounded-lg border bg-white p-2'>
      {type === 'barcode' ? (
        <svg ref={barcodeRef} className='max-w-full' />
      ) : (
        <QRCodeGeneratorComponent
          id='qrcode'
          width='150px'
          height='100px'
          value={value}
          displayText={{ visibility: true }}
          mode='SVG'
        />
      )}
      <span className='text-xs text-muted-foreground uppercase'>
        {type} Preview
      </span>
    </div>
  )
}
