# Data Model: Global System Settings

## Prisma Schema

```prisma
model app_settings {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key           String    
  value         Json
  group         String?   // branding, localization, etc.
  is_public     Boolean   @default(true)
  created_at    DateTime  @default(now()) @db.Timestamp(6)
  updated_at    DateTime  @default(now()) @db.Timestamp(6)
  clerk_user_id String    @default(dbgenerated("clerk_user_id()"))
  
  @@unique([clerk_user_id, key])
  @@index([group])
}
```

## Zod Schemas (`src/features/settings/data/schema.ts`)

### Base Setting
```typescript
export const SettingSchema = z.object({
  key: z.string(),
  value: z.any(),
  group: z.string().nullable(),
  is_public: z.boolean(),
});
```

### Branding Group
```typescript
export const BrandingSettingsSchema = z.object({
  name: z.string().min(1),
  logo_url: z.string().url().optional(),
  favicon_url: z.string().url().optional(),
  description: z.string().optional(),
});
```

### Localization Group
```typescript
export const LocalizationSettingsSchema = z.object({
  currency: z.string().length(3), // ISO 4217
  date_format: z.string(),
  language: z.string().length(2),
});
```

## State Transitions
1. **Fetch**: `GET /api/settings` -> TanStack Query -> Zustand Store.
2. **Update**: `POST /api/settings` -> Optimistic Update in Store -> Prisma Write -> Invalidate Query.
