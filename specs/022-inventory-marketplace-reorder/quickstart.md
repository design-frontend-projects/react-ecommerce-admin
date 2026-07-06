# Quickstart - Marketplace Inventory & Auto-Reordering Database Changes

This guide outlines how to verify and work with the newly added database fields for the Marketplace Inventory & Auto-Reordering feature.

## Database setup

### 1. Schema Validation
Verify that `prisma/schema.prisma` is correctly configured:
```bash
npx prisma validate
```

### 2. Generate Prisma Client
Generate the updated client type definitions:
```bash
npx prisma generate
```

### 3. Apply Schema Changes
Run the following to push changes directly to your local development database:
```bash
npx prisma db push
```

## Validation & Code Usage

The new fields are fully supported by validation schemas:

### Products
- Zod schema location: [schema.ts](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/src/features/products/data/schema.ts)
- Flag: `is_marketplace: z.boolean()`

### Suppliers
- Zod schema location: [supplier-action-dialog.tsx](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/src/features/suppliers/components/supplier-action-dialog.tsx)
- Flag: `is_preferred: z.boolean()`

### Tenant Settings
- Zod schema location: [schema.ts](file:///e:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/src/features/settings/data/schema.ts)
- Flag: `auto_reorder: z.boolean()`
