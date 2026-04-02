# Quickstart: Product Variants Enhanced Discovery

This document provides a quick overview of how to implement the Product and Variants Creation Flow.

## Step 1: Base Product Form

- **Component**: `src/features/products/components/ProductBaseForm.tsx`
- **Fields**: Name, SKU, Category, Description.
- **Action**: Validates the base info and progresses to the variants step as a local state or within a Zustand store.

## Step 2: Variants Selection

- **Component**: `src/features/products/components/ProductVariantsForm.tsx`
- **Logic**: Use `useFieldArray` from `react-hook-form` to allow adding multiple variants. Each variant requires its own SKU, Price, and initial Stock levels.

## Implementation Guide

1.  **Initialize Zustand Store**: `src/features/products/store/wizard.ts` to hold temporary data between Step 1 and Step 2.
2.  **Define Zod Schemas**: Capture validation rules in `src/features/products/schemas/product.ts`.
3.  **Persistence Logic**: Use a server action or TanStack Mutation to perform the nested `create` in Step 2 for transactional safety.

### Example Mutation

```typescript
const createProduct = async (data: FullProductWizardSchema) => {
  return await prisma.products.create({
    data: {
      ...data.base,
      has_variants: true,
      product_variants: {
        create: data.variants.map((v) => ({
          ...v,
          clerk_user_id: session.userId,
        })),
      },
    },
  });
};
```

## Testing

- **Unit**: Test the Zod validation schemas for Step 1 and Step 2 independently.
- **Integration**: mock the prisma create call and verify the data structure passed.
- **Component**: Test Step 1 navigation logic and Step 2's "Add Variant" button.
