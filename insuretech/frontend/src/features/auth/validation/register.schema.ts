import { z } from 'zod'
import { AUTH_VALIDATION } from '../auth.constants'

const strongPasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, AUTH_VALIDATION.fullNameRequired),
    companyName: z.string().trim().min(1, AUTH_VALIDATION.companyNameRequired),
    email: z
      .string()
      .trim()
      .min(1, AUTH_VALIDATION.emailRequired)
      .email(AUTH_VALIDATION.emailInvalid),
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
