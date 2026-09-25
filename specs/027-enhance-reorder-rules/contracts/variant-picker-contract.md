# Contract: Product Variant Virtualized Combobox (`ReorderRuleVariantPicker`)

**Feature Branch**: `027-enhance-reorder-rules`  
**Component**: `ReorderRuleVariantPicker`  
**Purpose**: On-demand, paginated, and virtualized product variant selection using `@tanstack/react-virtual`.

---

## 1. Component Interface Props

```typescript
export interface InitialVariantInfo {
  id: string
  sku: string
  barcode?: string | null
  product_name?: string
  name?: string | null
}

export interface ReorderRuleVariantPickerProps {
  value: string
  onChange: (variantId: string, variant?: VariantSearchResult) => void
  disabled?: boolean
  initialVariant?: InitialVariantInfo | null
  placeholder?: string
  className?: string
  required?: boolean
  'aria-label'?: string
}
```

---

## 2. Interaction & State Specifications

1. **Trigger Element**:
   - Shows currently selected variant SKU and product name.
   - Shows package icon and chevrons up/down.
   - Displays localized placeholder (`reorderRules.variantPicker.placeholder`) if no variant is selected.
   - Accessible keyboard trigger (`Enter`, `Space`, `ArrowDown`).

2. **Search Input**:
   - Text input inside popover auto-focused on open.
   - 300ms debounce interval before issuing query to server.
   - Localized placeholder (`reorderRules.variantPicker.searchPlaceholder`).
   - Clear icon when input has content.

3. **Virtualization Container (`@tanstack/react-virtual`)**:
   - Fixed height viewport (`max-h-[280px]` or `320px`).
   - `estimateSize`: 56px per row.
   - `overscan`: 5 items.
   - Renders only visible items positioned via absolute translateY.
   - Accessible list role (`listbox` and `option`).

4. **Loading & Empty States**:
   - `isDebouncing` or `isLoading`: Non-blocking spinner (`Loader2`) inside search field or list header.
   - Empty search results: Informative state (`reorderRules.variantPicker.noVariantsFound`).

5. **Editing Existing Rules**:
   - When opened in edit mode, the picker displays `initialVariant` without waiting for or depending on search query matching.
