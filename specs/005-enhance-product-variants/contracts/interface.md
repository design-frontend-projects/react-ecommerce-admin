# Feature Contract: Product and Variants Enhancement

## Internal Component Communication

### Wizard State Interface (Zustand Store)

```typescript
interface ProductWizardStore {
    baseInfo: BaseProductInfo | null;
    variants: VariantInfo[];
    currentStep: number;
    setBaseInfo: (info: BaseProductInfo) => void;
    addVariant: (variant: VariantInfo) => void;
    removeVariant: (index: number) => void;
    updateVariant: (index: number, variant: VariantInfo) => void;
    reset: () => void;
}
```

### Server Action / API Contract

**Endpoint**: `create_product` (RPC or Server Action)

**Input Payload**:
```json
{
  "base": {
    "name": "string",
    "sku": "string",
    "category_id": "number",
    "description": "string (optional)"
  },
  "variants": [
    {
      "sku": "string",
      "price": "number",
      "cost_price": "number (optional)",
      "stock_quantity": "number",
      "min_stock": "number"
    }
  ],
  "has_variants": "boolean (default: true)"
}
```

**Success (201 Created)**:
```json
{
  "product_id": "number",
  "name": "string",
  "num_variants": "number"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "STRING",
  "details": "Zod ValidationError format"
}
```

**Error (409 Conflict)**:
```json
{
  "error": "SKU_ALREADY_EXISTS",
  "sku": "SKU_STRING"
}
```
