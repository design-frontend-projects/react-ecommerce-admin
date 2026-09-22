export function parseDimensionsLabel(
  dimensions?: Record<string, any> | string | null
): string | null {
  if (!dimensions) return null
  if (typeof dimensions === 'object') {
    if (dimensions.label) return String(dimensions.label)
    const entries = Object.entries(dimensions)
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
    }
    return null
  }
  try {
    const parsed = JSON.parse(dimensions)
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.label) return String(parsed.label)
      const entries = Object.entries(parsed)
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
      }
    }
    return parsed?.label || dimensions
  } catch {
    return dimensions
  }
}
