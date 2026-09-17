import * as React from 'react'
import {
  VirtualSearchableSelect,
  type SearchableOption,
  type VirtualSearchableSelectProps,
} from './virtual-searchable-select'

export type { SearchableOption }

export interface SearchableSelectProps extends VirtualSearchableSelectProps {}

/**
 * High-performance virtualized select component powered by @tanstack/react-virtual.
 * Features lazy progressive loading on scroll down, real-time search filtering,
 * bilingual English & Arabic display, and full keyboard navigation.
 */
export function SearchableSelect(props: SearchableSelectProps) {
  return <VirtualSearchableSelect {...props} />
}

export { VirtualSearchableSelect }
