/**
 * Exact Decimal Arithmetic Utility
 * 
 * Provides decimal-safe financial and quantity calculations without JavaScript
 * floating-point rounding anomalies. Safe for both browser and server environments.
 */

export class DecimalMath {
  private value: bigint
  private static readonly SCALE = 8
  private static readonly MULTIPLIER = 100_000_000n

  private constructor(rawBigInt: bigint) {
    this.value = rawBigInt
  }

  public static from(val: number | string | DecimalMath | null | undefined): DecimalMath {
    if (val instanceof DecimalMath) {
      return new DecimalMath(val.value)
    }
    if (val === null || val === undefined || val === '') {
      return new DecimalMath(0n)
    }

    const str = typeof val === 'number' ? (Number.isFinite(val) ? val.toString() : '0') : String(val).trim()
    if (!str || str === 'NaN') return new DecimalMath(0n)

    const isNeg = str.startsWith('-')
    const cleanStr = isNeg ? str.slice(1) : str
    const [intPart = '0', fracPart = ''] = cleanStr.split('.')

    const paddedFrac = fracPart.slice(0, DecimalMath.SCALE).padEnd(DecimalMath.SCALE, '0')
    const combined = BigInt(intPart || '0') * DecimalMath.MULTIPLIER + BigInt(paddedFrac)
    return new DecimalMath(isNeg ? -combined : combined)
  }

  public add(other: number | string | DecimalMath): DecimalMath {
    const o = DecimalMath.from(other)
    return new DecimalMath(this.value + o.value)
  }

  public sub(other: number | string | DecimalMath): DecimalMath {
    const o = DecimalMath.from(other)
    return new DecimalMath(this.value - o.value)
  }

  public mul(other: number | string | DecimalMath): DecimalMath {
    const o = DecimalMath.from(other)
    // (a * b) / MULTIPLIER
    return new DecimalMath((this.value * o.value) / DecimalMath.MULTIPLIER)
  }

  public div(other: number | string | DecimalMath): DecimalMath {
    const o = DecimalMath.from(other)
    if (o.value === 0n) {
      throw new Error('Division by zero in DecimalMath')
    }
    return new DecimalMath((this.value * DecimalMath.MULTIPLIER) / o.value)
  }

  public gt(other: number | string | DecimalMath): boolean {
    return this.value > DecimalMath.from(other).value
  }

  public gte(other: number | string | DecimalMath): boolean {
    return this.value >= DecimalMath.from(other).value
  }

  public lt(other: number | string | DecimalMath): boolean {
    return this.value < DecimalMath.from(other).value
  }

  public lte(other: number | string | DecimalMath): boolean {
    return this.value <= DecimalMath.from(other).value
  }

  public eq(other: number | string | DecimalMath): boolean {
    return this.value === DecimalMath.from(other).value
  }

  public isZero(): boolean {
    return this.value === 0n
  }

  public isNegative(): boolean {
    return this.value < 0n
  }

  public isPositive(): boolean {
    return this.value > 0n
  }

  public toNumber(): number {
    return Number(this.value) / Number(DecimalMath.MULTIPLIER)
  }

  public toFixed(digits = 4): string {
    const isNeg = this.value < 0n
    const absVal = isNeg ? -this.value : this.value
    const intPart = absVal / DecimalMath.MULTIPLIER
    const fracPart = absVal % DecimalMath.MULTIPLIER

    const fracStr = fracPart.toString().padStart(DecimalMath.SCALE, '0')
    if (digits <= 0) {
      return (isNeg ? '-' : '') + intPart.toString()
    }
    const truncatedOrPadded = fracStr.slice(0, digits).padEnd(digits, '0')
    return (isNeg ? '-' : '') + `${intPart}.${truncatedOrPadded}`
  }

  public toString(): string {
    return this.toFixed(4)
  }
}

export const d = (val: number | string | DecimalMath | null | undefined) => DecimalMath.from(val)
