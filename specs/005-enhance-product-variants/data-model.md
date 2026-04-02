# Data Model: Product and Variants Enhancement

## Entities

### `Product` (Prisma Table: `products`)

- **Primary Key**: `product_id` (Autoincrement)
- **Relationships**:
  - `product_variants`: 1:N (One product has multiple variants)
  - `categories`: N:1 (Each product belongs to one category)
  - `inventory`: 1:1 (Optional, if variants aren't used; our logic prefers variants)
- **Validation Rules**:
  - `name`: Required, String (Max 200).
  - `sku`: Unique, Required, String (Max 50).
  - `has_variants`: Boolean, Defaults to `true` (for this enhancement).
- **State Transitions**:
  - `is_active`: Boolean (Toggle to disable product without deleting).

### `ProductVariant` (Prisma Table: `product_variants`)

- **Primary Key**: `id` (UUID)
- **Foreign Key**: `product_id` (References `products.product_id`, CASCADE on delete)
- **Validation Rules**:
  - `sku`: Unique, Required, String (Max 100).
  - `price`: Decimal (Required, > 0).
  - `cost_price`: Decimal (Optional, > 0).
  - `stock_quantity`: Integer (Default 0).
  - `min_stock`: Integer (Default 0).
- **Attributes**:
  - `clerk_user_id`: String (Audit Trail).
  - `is_active`: Boolean (Default true).

## Validation Rules (Zod)

### `BaseProductSchema`
```typescript
z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  category_id: z.number().int().positive("Category is required"),
  sku: z.string().min(1, "Base SKU is required").max(50),
})
```

### `VariantSchema`
```typescript
z.object({
  sku: z.string().min(1, "SKU is required").max(100),
  price: z.number().positive("Price must be greater than zero"),
  cost_price: z.number().optional(),
  stock_quantity: z.number().int().min(0, "Stock cannot be negative"),
  min_stock: z.number().int().min(0).default(0),
})
```

### `FullProductWizardSchema`
```typescript
z.object({
  base: BaseProductSchema,
  variants: z.array(VariantSchema).min(1, "At least one variant required"),
})
```
