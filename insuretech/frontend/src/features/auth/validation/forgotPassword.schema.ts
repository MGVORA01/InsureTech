import { z } from 'zod'
import { AUTH_VALIDATION } from '../auth.constants'

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, AUTH_VALIDATION.emailRequired)
    .email(AUTH_VALIDATION.emailInvalid)
    .transform((value) => value.toLowerCase()),
})
