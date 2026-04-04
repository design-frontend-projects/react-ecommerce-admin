import Barcode from 'react-barcode'
import { QRCodeSVG } from 'qrcode.react'

interface BarcodeDisplayProps {
  value: string
  type?: 'barcode' | 'qrcode'
}

export function BarcodeDisplay({
  value,
  type = 'barcode',
}: BarcodeDisplayProps) {
  if (!value) return null

  const isInvalid = !/^[A-Za-z0-9]+$/.test(value) && type === 'barcode'

  return (
    <div className='flex flex-col items-center justify-center space-y-3 rounded-lg border bg-card p-4 shadow-sm ring-1 ring-border/20 transition-all hover:shadow-md dark:bg-card/50'>
      <div className='flex min-h-[120px] w-full items-center justify-center overflow-x-auto rounded-md bg-white p-2'>
        {type === 'barcode' ? (
          <div className='flex flex-col items-center'>
            <Barcode
              value={value}
              width={1.5}
              height={70}
              fontSize={14}
              margin={0}
              background='transparent'
              lineColor='#000000'
              displayValue={true}
              textAlign='center'
            />
            {isInvalid && (
              <span className='mt-1 text-[10px] text-destructive'>
                May contain invalid characters for standard barcodes
              </span>
            )}
          </div>
        ) : (
          <div className='flex items-center justify-center p-1'>
            <QRCodeSVG
              value={value}
              size={100}
              level='H'
              includeMargin={false}
            />
          </div>
        )}
      </div>
      <div className='flex flex-col items-center gap-1 text-center'>
        <span className='rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-wider text-primary uppercase'>
          {type} Preview
        </span>
        <span className='max-w-[180px] break-all text-[10px] text-muted-foreground'>
          {value}
        </span>
      </div>
    </div>
  )
}

