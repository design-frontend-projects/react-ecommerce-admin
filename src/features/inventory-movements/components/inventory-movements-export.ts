import type { MovementRow } from '../data/schema'

/**
 * Sanitize a string cell value to prevent CSV Formula Injection (CWE-1236)
 * while properly escaping quotes and delimiters.
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""'
  }

  let str = String(value).trim()

  // Prevent formula injection if the string starts with risky characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // Escape existing double quotes by doubling them
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

export function generateMovementsCsv(movements: MovementRow[]): string {
  const headers = [
    'Movement #',
    'Date & Time',
    'Movement Type',
    'SKU',
    'Variant Name',
    'Barcode',
    'Location',
    'Bin Location',
    'Inbound (+)',
    'Outbound (-)',
    'Net Delta',
    'Unit Cost',
    'Total Value',
    'Stock Before',
    'Stock After',
    'Condition',
    'Batch ID',
    'Serial ID',
    'Reference Type',
    'Reference ID',
    'Remarks',
  ]

  const rows = movements.map((m) => {
    const locName =
      m.warehouses?.name ??
      m.stores?.name ??
      m.branches?.name ??
      ''
    const locCode = m.warehouses?.code ? ` (${m.warehouses.code})` : ''
    const binCode = m.warehouse_locations?.code ?? m.warehouse_locations?.name ?? ''

    return [
      sanitizeCsvCell(m.movement_no ?? ''),
      sanitizeCsvCell(m.movement_date ? new Date(m.movement_date).toISOString() : ''),
      sanitizeCsvCell(m.movement_type),
      sanitizeCsvCell(m.product_variants?.sku ?? m.product_variant_id),
      sanitizeCsvCell(m.product_variants?.name ?? ''),
      sanitizeCsvCell(m.product_variants?.barcode ?? ''),
      sanitizeCsvCell(`${locName}${locCode}`),
      sanitizeCsvCell(binCode),
      sanitizeCsvCell(m.qty_in > 0 ? m.qty_in : 0),
      sanitizeCsvCell(m.qty_out > 0 ? m.qty_out : 0),
      sanitizeCsvCell(m.quantity_delta),
      sanitizeCsvCell(Number(m.unit_cost ?? 0).toFixed(2)),
      sanitizeCsvCell(Number(m.total_cost ?? 0).toFixed(2)),
      sanitizeCsvCell(m.qty_before != null ? m.qty_before : ''),
      sanitizeCsvCell(m.qty_after != null ? m.qty_after : ''),
      sanitizeCsvCell(m.condition ?? ''),
      sanitizeCsvCell(m.batch_id ?? ''),
      sanitizeCsvCell(m.serial_id ?? ''),
      sanitizeCsvCell(m.reference_type ?? ''),
      sanitizeCsvCell(m.reference_id ?? ''),
      sanitizeCsvCell(m.remarks ?? ''),
    ].join(',')
  })

  // Prepend UTF-8 BOM so Microsoft Excel renders international characters properly
  return '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n')
}

export function downloadMovementsCsv(
  movements: MovementRow[],
  filename?: string
): void {
  const csvContent = generateMovementsCsv(movements)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const dateStr = new Date().toISOString().slice(0, 10)
  const actualFilename = filename ?? `inventory-movements-${dateStr}.csv`

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', actualFilename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
