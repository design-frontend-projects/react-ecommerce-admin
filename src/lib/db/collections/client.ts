/**
 * Registry of TanStack DB catalog collections.
 *
 * Each query collection registers itself here on creation so cross-cutting
 * operations (refetch-all on reconnect, reset-on-wipe) can iterate them without
 * hard-coding every collection. Keeps `reconnect.ts` decoupled from the growing
 * set of feature collections.
 */

export interface RegisteredCollection {
  name: string
  /** Re-pull the collection's data from the server. */
  refetch: () => Promise<unknown>
  /** Drop cached rows (best-effort) so the next read re-syncs from server. */
  cleanup?: () => Promise<void>
}

const registry = new Map<string, RegisteredCollection>()

export function registerCatalogCollection(entry: RegisteredCollection): void {
  registry.set(entry.name, entry)
}

export function getCatalogCollections(): RegisteredCollection[] {
  return Array.from(registry.values())
}

/** Re-pull every registered catalog collection from the server. */
export async function refetchAllCatalog(): Promise<void> {
  await Promise.allSettled(getCatalogCollections().map((c) => c.refetch()))
}

/** Best-effort drop of every registered catalog collection's cached rows. */
export async function cleanupAllCatalog(): Promise<void> {
  await Promise.allSettled(
    getCatalogCollections().map((c) => c.cleanup?.() ?? Promise.resolve())
  )
}
