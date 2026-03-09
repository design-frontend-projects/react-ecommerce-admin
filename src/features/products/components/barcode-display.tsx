import {
  BarcodeGeneratorComponent,
  QRCodeGeneratorComponent,
} from '@syncfusion/ej2-react-barcode-generator'

interface BarcodeDisplayProps {
  value: string
  type?: 'barcode' | 'qrcode'
}

export function BarcodeDisplay({
  value,
  type = 'barcode',
}: BarcodeDisplayProps) {
  if (!value) return null

  return (
    <div className='flex flex-col items-center justify-center space-y-2 rounded-lg border bg-white p-4'>
      {type === 'barcode' ? (
        <BarcodeGeneratorComponent
          id='barcode'
          width='100%'
          height='100px'
          value={value}
          displayText={{ visibility: true }}
          mode='SVG'
        />
      ) : (
        <QRCodeGeneratorComponent
          id='qrcode'
          width='150px'
          height='150px'
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
