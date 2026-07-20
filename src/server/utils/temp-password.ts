import { randomInt } from 'node:crypto'

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*-_=+?'
const ALL = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS

const DEFAULT_LENGTH = 20

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)]
}

/**
 * Generate a cryptographically-random temporary password for admin-provisioned users.
 *
 * Guarantees length >= 16 with at least one uppercase, lowercase, digit, and symbol.
 * Uses `node:crypto` (CSPRNG) and is server-side only. The result is returned once to the
 * provisioning admin and never persisted or logged; users must rotate it at first sign-in.
 *
 * Visually ambiguous characters (0/O, 1/l/I) are excluded so the credential can be read
 * aloud or copied without confusion.
 */
export function generateTempPassword(length: number = DEFAULT_LENGTH): string {
  const size = Math.max(16, length)

  // Seed one of each required class so the policy always holds, then fill the rest.
  const required = [pick(UPPERCASE), pick(LOWERCASE), pick(DIGITS), pick(SYMBOLS)]
  const chars = [...required]
  while (chars.length < size) {
    chars.push(pick(ALL))
  }

  // Fisher-Yates shuffle so the seeded class characters are not in fixed positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
