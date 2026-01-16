import { toast } from 'sonner'

export function showSubmittedData(
  data: unknown,
  title: string = 'You submitted the following values:'
) {
  const replacer = (key: string, value: unknown) => {
    // Keys that invoke redaction if the property name contains them (case-insensitive)
    const sensitivePatterns = [
      'password',
      'secret',
      'token',
      'apikey',
      'api_key',
      'creditcard',
      'cvv',
    ]

    // Keys that invoke redaction only on exact match (case-insensitive)
    const exactSensitiveKeys = ['otp', 'pin']

    const lowerKey = key.toLowerCase()

    if (
      sensitivePatterns.some((pattern) => lowerKey.includes(pattern)) ||
      exactSensitiveKeys.includes(lowerKey)
    ) {
      return '[REDACTED]'
    }

    return value
  }

  toast.message(title, {
    description: (
      // w-[340px]
      <pre className='mt-2 w-full overflow-x-auto rounded-md bg-slate-950 p-4'>
        <code className='text-white'>{JSON.stringify(data, replacer, 2)}</code>
      </pre>
    ),
  })
}
