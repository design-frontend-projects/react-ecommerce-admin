import { useEffect, useState } from 'react'

/**
 * Custom hook to debounce any fast-changing value with a configurable delay.
 * Useful for server-side search queries, auto-complete inputs, and window resize listeners.
 *
 * @param value The value to debounce
 * @param delay Milliseconds to delay updating the debounced value (default: 350ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
