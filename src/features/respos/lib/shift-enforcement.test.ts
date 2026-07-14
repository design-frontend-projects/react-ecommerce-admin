import { UserRole } from '@/types/user-role.enum'
import { describe, expect, it } from 'vitest'
import { isShiftGatedUser, shouldEnforceShiftGate } from './shift-enforcement'

const cashier = {
  roleNames: [UserRole.Cashier],
  permissionNames: ['pos.access', 'shifts.use'],
}
const manager = {
  roleNames: [UserRole.Manager],
  permissionNames: ['pos.access', 'shifts.use', 'shifts.view'],
}
const admin = {
  roleNames: [UserRole.Admin],
  permissionNames: ['pos.access', 'shifts.use', 'shifts.view', 'shifts.manage'],
}
const superAdmin = { roleNames: [UserRole.SuperAdmin], permissionNames: ['*'] }
const kitchen = {
  roleNames: [UserRole.Kitchen],
  permissionNames: ['pos.access'],
}

describe('isShiftGatedUser', () => {
  it('gates cash-handling roles with shifts.use', () => {
    expect(isShiftGatedUser(cashier.roleNames, cashier.permissionNames)).toBe(
      true
    )
    expect(isShiftGatedUser(manager.roleNames, manager.permissionNames)).toBe(
      true
    )
  })

  it('gates legacy cashiers without the shifts.use grant', () => {
    expect(isShiftGatedUser(['cashier'], ['pos.access'])).toBe(true)
  })

  it('exempts shift managers and admin roles', () => {
    expect(isShiftGatedUser(admin.roleNames, admin.permissionNames)).toBe(false)
    expect(
      isShiftGatedUser(superAdmin.roleNames, superAdmin.permissionNames)
    ).toBe(false)
  })

  it('does not gate roles without cash handling (kitchen)', () => {
    expect(isShiftGatedUser(kitchen.roleNames, kitchen.permissionNames)).toBe(
      false
    )
  })
})

describe('shouldEnforceShiftGate', () => {
  it('returns true for cashier on /respos path without active shift', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        ...cashier,
        pathname: '/respos/pos',
        hasActiveShift: false,
      })
    ).toBe(true)
  })

  it('returns true for manager (shifts.use without manage) on /respos', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        ...manager,
        pathname: '/respos/pos',
        hasActiveShift: false,
      })
    ).toBe(true)
  })

  it('returns false when cashier already has an active shift', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        ...cashier,
        pathname: '/respos/shifts',
        hasActiveShift: true,
      })
    ).toBe(false)
  })

  it('returns false for admins and wildcard holders', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        ...admin,
        pathname: '/respos',
        hasActiveShift: false,
      })
    ).toBe(false)
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        ...superAdmin,
        pathname: '/respos',
        hasActiveShift: false,
      })
    ).toBe(false)
  })

  it('returns false for kitchen (no cash handling)', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        ...kitchen,
        pathname: '/respos/kitchen',
        hasActiveShift: false,
      })
    ).toBe(false)
  })

  it('returns false for cashier outside /respos routes', () => {
    expect(
      shouldEnforceShiftGate({
        isSignedIn: true,
        ...cashier,
        pathname: '/products',
        hasActiveShift: false,
      })
    ).toBe(false)
  })
})
