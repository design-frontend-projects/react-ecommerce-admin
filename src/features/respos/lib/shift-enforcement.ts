export function isResposPath(pathname: string): boolean {
  return (
    pathname === '/respos' ||
    pathname.startsWith('/respos/') ||
    pathname === '/_authenticated/respos' ||
    pathname.startsWith('/_authenticated/respos/')
  )
}

export interface ShiftEnforcementParams {
  isSignedIn: boolean
  isCashier: boolean
  pathname: string
  hasActiveShift: boolean
}

export function shouldEnforceShiftGate({
  isSignedIn,
  isCashier,
  pathname,
  hasActiveShift,
}: ShiftEnforcementParams): boolean {
  return isSignedIn && isCashier && isResposPath(pathname) && !hasActiveShift
}
