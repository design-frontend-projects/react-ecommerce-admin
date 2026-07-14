export function parseDimensionsLabel(
  dimensions?: string | null
): string | null {
  if (!dimensions) return null
  try {
    const parsed = JSON.parse(dimensions)
    return parsed?.label || dimensions
  } catch {
    return dimensions
  }
}
