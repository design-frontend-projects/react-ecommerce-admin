# Research: Product Variants Enhancement

## Decision 1: Wizard State Management

**Decision**: Use a single Zustand store to manage the overall wizard state, combined with `react-hook-form` for individual step validation.

**Rationale**: 
- Zustand provides a clean way to persist data across steps without prop drilling.
- It allows for easy "Save as Draft" functionality later if needed.
- `react-hook-form` is excellent for capturing and validating user input within each step before committing it to the global store or the next step.

**Alternatives considered**:
- **Single massive form**: Rejected because multi-step logic becomes complex within one `useForm`.
- **URL-based state**: Rejected because product data can be large (especially with variants) and doesn't belong in query params.

## Decision 2: Prisma Transactional Create

**Decision**: Collect all data (base product + variants) and perform a single nested `create` operation using Prisma.

**Rationale**:
- Atomic execution: Either the product and all variants are created, or none are.
- Efficiency: Reduces the number of database roundtrips.
- Logic:
  ```typescript
  prisma.products.create({
    data: {
      name: productData.name,
      sku: productData.sku,
      has_variants: true,
      product_variants: {
        create: variantsData.map(v => ({
          sku: v.sku,
          price: v.price,
          stock_quantity: v.stock,
          // ...
        }))
      }
    }
  })
  ```

**Alternatives considered**:
- **Step 1 create, Step 2 create**: Rejected because it leaves "orphan" products if the user abandons the process or if an error occurs in step 2.

## Decision 3: Dynamic Variant UI

**Decision**: Use `useFieldArray` from `react-hook-form` for the variants list in Step 2.

**Rationale**:
- Built-in support for appending, removing, and moving items.
- Maintains type safety and form state automatically.

**Alternatives considered**:
- **Custom state array**: Rejected because it requires manual synchronization with the form validation state.

## NEEDS CLARIFICATION Resolved

1. **How to handle Product SKU vs Variant SKU?**
   - Decision: The Base Product will have a "Master SKU" (stored in `products.sku`). Each variant will have its own "Variant SKU" (stored in `product_variants.sku`). In Step 1, the user enters the Master SKU. In Step 2, they enter specific SKUs for each variant.
   
2. **Default variant for "No Variants" products?**
   - Decision: If `has_variants` is false, it should still create a single entry in `product_variants` mirroring the base product's info, as the architecture relies on variants for pricing and stock.
