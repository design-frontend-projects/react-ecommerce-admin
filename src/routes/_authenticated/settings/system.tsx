import { createFileRoute } from '@tanstack/react-router'
import { SettingsSystem } from '@/features/settings/pages/settings-page'

export const Route = createFileRoute('/_authenticated/settings/system')({
  component: SettingsSystem,
})
