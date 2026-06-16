import { z } from 'zod'
import { AUTH_VALIDATION } from '../auth.constants'

const strongPasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, AUTH_VALIDATION.passwordRequired)
      .min(8, AUTH_VALIDATION.passwordMinLength)
      .regex(strongPasswordPattern, AUTH_VALIDATION.passwordStrong),
    confirmPassword: z.string().min(1, AUTH_VALIDATION.confirmPasswordRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_VALIDATION.passwordMismatch,
    path: ['confirmPassword'],
  })
