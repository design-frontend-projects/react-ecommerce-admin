import { Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NumpadProps {
  onKeyPress: (key: string) => void
  onBackspace: () => void
  onEnter?: () => void
  disabled?: boolean
}

export function Numpad({
  onKeyPress,
  onBackspace,
  onEnter,
  disabled = false,
}: NumpadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

  return (
    <div className='grid grid-cols-3 gap-2'>
      {keys.map((key) => (
        <Button
          key={key}
          type='button'
          variant='outline'
          className='h-16 text-2xl font-medium'
          onClick={() => onKeyPress(key)}
          disabled={disabled}
        >
          {key}
        </Button>
      ))}
      <Button
        type='button'
        variant='outline'
        className='h-16 text-2xl font-medium text-destructive'
        onClick={onBackspace}
        disabled={disabled}
        aria-label='Backspace'
      >
        <Delete className='h-6 w-6' />
      </Button>

      {onEnter && (
        <Button
          type='button'
          className='col-span-3 mt-2 h-16 text-xl font-bold'
          onClick={onEnter}
          disabled={disabled}
        >
          Enter
        </Button>
      )}
    </div>
  )
}
