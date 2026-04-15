# Quickstart: Global System Settings

## Setup

1. **Database Migration**:
   Update `prisma/schema.prisma` and run:
   ```bash
   npx prisma migrate dev --name add_app_settings
   ```

2. **Initialize Settings**:
   The system will automatically create default settings for a new tenant on first login if they don't exist.

## Usage

### Accessing Settings in React
```tsx
import { useSettings } from "@/features/settings";

function MyComponent() {
  const { branding } = useSettings();
  return <h1>{branding.name}</h1>;
}
```

### Updating Settings (Admin Only)
```tsx
import { updateSetting } from "@/features/settings/data/actions";

await updateSetting('branding', { name: 'New Name' });
```

## Global Sync
Settings are synchronized across the app using `SettingsProvider` and a Zustand store. Changing a setting in the admin panel will instantly reflect in the header/footer of other pages.
