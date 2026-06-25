import { z } from 'zod'

export const onboardingSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  billing_contact: z.string().email('Please enter a valid email address'),
  timezone: z.string().min(1, 'Please select a timezone'),
  industry: z.string().min(1, 'Please select an industry'),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>
