import { z } from 'zod'
import {
  authorizedRequest,
  type TokenGetter,
} from '@/lib/authorized-request'

export const navigationScreenSchema = z.object({
  code: z.string(),
  name: z.string(),
  route: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
})

export const navigationModuleSchema = z.object({
  code: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  screens: z.array(navigationScreenSchema),
})

export const navigationPayloadSchema = z.object({
  modules: z.array(navigationModuleSchema),
  /** route -> allowed, for EVERY active screen (including denied ones). */
  screens: z.record(z.string(), z.boolean()),
})

export type NavigationScreen = z.infer<typeof navigationScreenSchema>
export type NavigationModule = z.infer<typeof navigationModuleSchema>
export type NavigationPayload = z.infer<typeof navigationPayloadSchema>

export async function fetchNavigation(
  getToken: TokenGetter
): Promise<NavigationPayload> {
  const payload = (await authorizedRequest(
    getToken,
    '/api/access-control/navigation'
  )) as { data?: unknown }
  return navigationPayloadSchema.parse(payload.data)
}
