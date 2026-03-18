import { createLazyFileRoute } from '@tanstack/react-router'
import Cities from '@/features/cities'

export const Route = createLazyFileRoute('/_authenticated/cities/')({
  component: Cities,
})
