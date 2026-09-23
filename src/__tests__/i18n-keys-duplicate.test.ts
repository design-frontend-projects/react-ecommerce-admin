import path from 'path'
import fs from 'fs'
import { describe, expect, it } from 'vitest'

function findDuplicateKeysInJson(
  content: string
): Array<{ path: string; key: string; line: number }> {
  let pos = 0
  let line = 1

  function nextChar() {
    const ch = content[pos++]
    if (ch === '\n') {
      line++
    }
    return ch
  }

  function peekChar() {
    return content[pos]
  }

  function skipWhitespace() {
    while (pos < content.length && /\s/.test(content[pos])) {
      nextChar()
    }
  }

  function parseString(): string {
    nextChar() // skip opening quote
    let str = ''
    while (pos < content.length) {
      const c = nextChar()
      if (c === '"') return str
      if (c === '\\') {
        const esc = nextChar()
        str += '\\' + esc
      } else {
        str += c
      }
    }
    throw new Error(`Unterminated string at line ${line}`)
  }

  const duplicates: Array<{ path: string; key: string; line: number }> = []

  function parseValue(currentPath: string): void {
    skipWhitespace()
    const c = peekChar()
    if (c === '{') {
      parseObject(currentPath)
    } else if (c === '[') {
      parseArray(currentPath)
    } else if (c === '"') {
      parseString()
    } else {
      while (pos < content.length && !/[,}\]\s]/.test(peekChar())) {
        nextChar()
      }
    }
  }

  function parseArray(currentPath: string): void {
    nextChar() // skip '['
    let idx = 0
    while (pos < content.length) {
      skipWhitespace()
      if (peekChar() === ']') {
        nextChar()
        return
      }
      parseValue(`${currentPath}[${idx}]`)
      idx++
      skipWhitespace()
      if (peekChar() === ',') {
        nextChar()
      } else if (peekChar() === ']') {
        nextChar()
        return
      } else {
        throw new Error(`Unexpected character in array at line ${line}`)
      }
    }
  }

  function parseObject(currentPath: string): void {
    nextChar() // skip '{'
    const seen = new Set<string>()

    while (pos < content.length) {
      skipWhitespace()
      if (peekChar() === '}') {
        nextChar()
        return
      }
      if (peekChar() !== '"') {
        throw new Error(`Expected string key at line ${line}`)
      }
      const kLine = line
      const key = parseString()
      const fullPath = currentPath ? `${currentPath}.${key}` : key

      if (seen.has(key)) {
        duplicates.push({ path: fullPath, key, line: kLine })
      } else {
        seen.add(key)
      }

      skipWhitespace()
      if (peekChar() !== ':') {
        throw new Error(`Expected ':' at line ${line}`)
      }
      nextChar() // skip ':'

      parseValue(fullPath)
      skipWhitespace()
      if (peekChar() === ',') {
        nextChar()
      } else if (peekChar() === '}') {
        nextChar()
        return
      } else {
        throw new Error(`Unexpected character in object at line ${line}`)
      }
    }
  }

  skipWhitespace()
  parseValue('')
  return duplicates
}

describe('i18n Duplication and Parity Validation', () => {
  const enPath = path.resolve(__dirname, '../assets/i18n/en.json')
  const arPath = path.resolve(__dirname, '../assets/i18n/ar.json')

  it('verifies that en.json has zero duplicate keys at all levels', () => {
    const enContent = fs.readFileSync(enPath, 'utf8')
    const duplicates = findDuplicateKeysInJson(enContent)
    expect(duplicates).toEqual([])
  })

  it('verifies that ar.json has zero duplicate keys at all levels', () => {
    const arContent = fs.readFileSync(arPath, 'utf8')
    const duplicates = findDuplicateKeysInJson(arContent)
    expect(duplicates).toEqual([])
  })

  it('ensures products and inventoryMovements are complete without being overwritten', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
    const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'))

    // Products checks
    expect(en.products.title).toBe('Products')
    expect(ar.products.title).toBe('المنتجات')
    expect(en.products.form.name).toBe('Product Name')
    expect(ar.products.form.name).toBe('اسم المنتج')
    expect(en.products.form.taxRate).toBe('Tax Rate')
    expect(ar.products.form.taxRate).toBe('معدل الضريبة')
    expect(en.products.form.pricingNoticeTitle).toBe(
      'Variant-Level Pricing & Tax'
    )
    expect(ar.products.form.pricingNoticeTitle).toBe(
      'التسعير والضريبة على مستوى المتغير'
    )

    // InventoryMovements checks
    expect(en.inventoryMovements.title).toBe('Inventory Movements')
    expect(ar.inventoryMovements.title).toBe('حركات المخزون')
    expect(en.inventoryMovements.columns.product).toBe('Product')
    expect(ar.inventoryMovements.columns.product).toBe('المنتج')
    expect(en.inventoryMovements.filters.allMovementTypes).toBe(
      'All movement types'
    )
    expect(ar.inventoryMovements.filters.allMovementTypes).toBe(
      'جميع أنواع الحركة'
    )
    expect(en.inventoryMovements.table.variantSku).toBe('Variant / SKU')
    expect(ar.inventoryMovements.table.variantSku).toBe('المتغير / SKU')
  })
})
