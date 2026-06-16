export interface User {
  id: string
  fullName: string
  companyName: string
  email: string
}

export interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export interface RegisterFormData {
  fullName: string
  companyName: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}
