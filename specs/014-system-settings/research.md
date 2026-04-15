# Research: Global System Settings

**Feature**: 014-system-settings
**Status**: Completed

## Findings

### 1. Prisma Model Design
**Decision**: Use a single table `app_settings` with a JSON value field and `clerk_user_id` for multi-tenancy.
**Rationale**: Highly flexible. Different tenants can have different keys without schema migrations.
**Entities**:
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

### 2. Global Accessibility (Settings Provider)
**Decision**: Use a `SettingsProvider` at the root of the layout.
**Rationale**: Ensures settings are loaded once and available via context/Zustand hooks.
**Pattern**:
- `SettingsProvider` fetches initial settings via TanStack Query (SSR initial data).
- Exposes a `useSettings()` hook.
- Synchronizes with a Zustand store for reactive UI updates when settings change.

### 3. Core Setting Keys
**Proposed Initial Schema**:
- `branding`: `{ name, logo_url, favicon_url, description }`
- `localization`: `{ currency, date_format, language }`
- `business`: `{ default_tax_rate, service_fee, free_shipping_threshold }`

### 4. Alternatives Considered
- **Environment Variables**: Rejected because they don't support per-tenant customization or runtime changes by admins.
- **Dedicated Columns in Tenant Table**: Rejected as it makes the schema rigid and harder to add new types of settings.

## Decision Summary
Proceed with the JSON-based `app_settings` model and a global React context for distribution.
