// Pushes the active tax rate into the respos store so calculateCartTotals
// always uses the current configuration. Mount once per POS surface.
// Falls back to the hardcoded default (exclusive) when the fetch fails or no
// rate is configured; an in-flight cart recalculates on every change.
import { useEffect } from 'react'
import { useResposStore } from '@/stores/respos-store'
import { DEFAULT_TAX_RATE } from '../constants'
import { useActiveTaxRate } from './use-active-tax-rate'

export function useTaxSync() {
  const { data, isError, isSuccess } = useActiveTaxRate()
  const setTaxConfig = useResposStore((state) => state.setTaxConfig)

  useEffect(() => {
    if (!isSuccess && !isError) return
    if (data) {
      setTaxConfig({ rate: data.rate, isInclusive: data.is_inclusive })
    } else {
      setTaxConfig({ rate: DEFAULT_TAX_RATE, isInclusive: false })
    }
  }, [data, isError, isSuccess, setTaxConfig])
}
