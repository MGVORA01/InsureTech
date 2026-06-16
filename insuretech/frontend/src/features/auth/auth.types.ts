export interface User {
  id: string
  fullName: string
  businessType?: string
  companyName?: string
  email: string
  role?: string
  createdAt?: string
  updatedAt?: string
}

export interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterFormData {
  fullName: string
  email: string
  phoneNo?: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
  confirmPassword: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'failed'
}

export interface PasswordState {
  loading: boolean
  error: string | null
  message: string | null
}

export interface ApiErrorResponse {
  message: string
  statusCode?: number
  errors?: Record<string, string[]>
}

export interface ApiEnvelope<T> {
  data: T
  message?: string
  success?: boolean
}

export interface AuthResponse {
  user?: User
  message?: string
}

export interface CurrentUserResponse {
  user: User
}

export interface PasswordResponse {
  message: string
}
