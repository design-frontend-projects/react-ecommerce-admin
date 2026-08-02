import { Temporal } from '@js-temporal/polyfill'

export { Temporal }

/**
 * Returns the current instant using Temporal.
 */
export function nowInstant(): Temporal.Instant {
  return Temporal.Now.instant()
}

/**
 * Returns the current date in ISO calendar using Temporal.
 */
export function nowPlainDate(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO()
}

/**
 * Returns the current ISO string timestamp.
 */
export function nowIsoString(): string {
  return Temporal.Now.instant().toString()
}

/**
 * Converts a string, Date, or Temporal.PlainDate to a Temporal.PlainDate.
 */
export function toPlainDate(
  date: string | Date | Temporal.PlainDate
): Temporal.PlainDate {
  if (date instanceof Temporal.PlainDate) {
    return date
  }
  if (date instanceof Date) {
    return Temporal.PlainDate.from(date.toISOString().split('T')[0])
  }
  const str = typeof date === 'string' && date.includes('T') ? date.split('T')[0] : String(date)
  return Temporal.PlainDate.from(str)
}

/**
 * Converts a string, Date, or Temporal.Instant to a Temporal.Instant.
 */
export function toInstant(
  date: string | Date | Temporal.Instant
): Temporal.Instant {
  if (date instanceof Temporal.Instant) {
    return date
  }
  if (date instanceof Date) {
    return Temporal.Instant.from(date.toISOString())
  }
  return Temporal.Instant.from(String(date))
}

/**
 * Subtracts days from a PlainDate using Temporal.
 */
export function subtractDays(
  date: string | Date | Temporal.PlainDate,
  days: number
): Temporal.PlainDate {
  return toPlainDate(date).subtract({ days })
}

/**
 * Adds days to a PlainDate using Temporal.
 */
export function addDays(
  date: string | Date | Temporal.PlainDate,
  days: number
): Temporal.PlainDate {
  return toPlainDate(date).add({ days })
}

/**
 * Subtracts months from a PlainDate using Temporal.
 */
export function subtractMonths(
  date: string | Date | Temporal.PlainDate,
  months: number
): Temporal.PlainDate {
  return toPlainDate(date).subtract({ months })
}

/**
 * Adds months to a PlainDate using Temporal.
 */
export function addMonths(
  date: string | Date | Temporal.PlainDate,
  months: number
): Temporal.PlainDate {
  return toPlainDate(date).add({ months })
}

/**
 * Returns true if date A is before date B using Temporal.PlainDate comparison.
 */
export function isBeforePlainDate(
  a: string | Date | Temporal.PlainDate,
  b: string | Date | Temporal.PlainDate
): boolean {
  return Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)) < 0
}

/**
 * Returns true if date A is after date B using Temporal.PlainDate comparison.
 */
export function isAfterPlainDate(
  a: string | Date | Temporal.PlainDate,
  b: string | Date | Temporal.PlainDate
): boolean {
  return Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b)) > 0
}
