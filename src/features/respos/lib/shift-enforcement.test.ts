import { describe, expect, it } from 'vitest'
import { shouldEnforceShiftGate } from './shift-enforcement'

describe('shouldEnforceShiftGate', () => {
  it('returns true for cashier on /respos path without active shift', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        isCashier: true,
        pathname: '/respos/pos',
        hasActiveShift: false,
      })
    ).toBe(true)
  })

  it('returns false when cashier already has an active shift', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        isCashier: true,
        pathname: '/respos/shifts',
        hasActiveShift: true,
      })
    ).toBe(false)
  })

  it('returns false for non-cashier users', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        isCashier: false,
        pathname: '/respos',
        hasActiveShift: false,
      })
    ).toBe(false)
  })

  it('returns false for cashier outside /respos routes', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        isCashier: true,
        pathname: '/products',
        hasActiveShift: false,
      })
    ).toBe(false)
  })
})
