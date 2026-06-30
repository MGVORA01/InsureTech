import { z } from 'zod'
import { PROFILE_VALIDATION } from '../profile.constants'

export const businessProfileSchema = z.object({
  segment_id: z.string().min(1, PROFILE_VALIDATION.segmentRequired),
  industry_id: z.string().min(1, PROFILE_VALIDATION.industryRequired),
  business_name: z.string().min(1, PROFILE_VALIDATION.businessNameRequired),
  business_description: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  year_established: z.coerce.number().optional(),
  employee_count: z.coerce.number().optional(),
  annual_turnover_range: z.string().optional(),
})

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>
