import axios, { AxiosError, type AxiosResponse } from 'axios'
import { BASE_URL } from '../../config/api'
import { AUTH_ENDPOINTS, AUTH_MESSAGES } from './auth.constants'
import type {
  ApiEnvelope,
  ApiErrorResponse,
  AuthResponse,
  CurrentUserResponse,
  ForgotPasswordRequest,
  LoginFormData,
  PasswordResponse,
  RegisterFormData,
  ResetPasswordRequest,
  User,
} from './auth.types'
// In-memory token storage to work with backend Bearer auth in current phase
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export const authHttp = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Attach Bearer token to request headers if available
authHttp.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor to handle automatic token refresh retries (to be enabled in future phase)
authHttp.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== AUTH_ENDPOINTS.login &&
      originalRequest.url !== AUTH_ENDPOINTS.register &&
      originalRequest.url !== AUTH_ENDPOINTS.refresh
    ) {
      originalRequest._retry = true
      // TODO: Enable token refresh logic below when POST /auth/refresh backend API is ready.
      try {
        await authApi.refreshToken()
        // Save new token and update headers
        // setAccessToken(newAccessToken)
        // originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return authHttp(originalRequest)
      } catch (refreshError) {
        setAccessToken(null)
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

function unwrapData<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const body = response.data

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    body.data !== null &&
    body.data !== undefined
  ) {
    return body.data as T
  }

  return body as T
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    // Backend uses 'error' field in APIResponse.error_response(), not 'message'
    return (
      axiosError.response?.data?.error ??
      axiosError.response?.data?.message ??
      AUTH_MESSAGES.genericError
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return AUTH_MESSAGES.genericError
}

const AUTH_MARKER_KEY = 'ins_auth_session'

function setSessionMarker(rememberMe: boolean) {
  clearSessionMarkers()
  if (rememberMe) {
    localStorage.setItem(AUTH_MARKER_KEY, '1')
  } else {
    sessionStorage.setItem(AUTH_MARKER_KEY, '1')
  }
}

export function clearSessionMarkers() {
  localStorage.removeItem(AUTH_MARKER_KEY)
  sessionStorage.removeItem(AUTH_MARKER_KEY)
}

export function hasSessionMarker(): boolean {
  return (
    localStorage.getItem(AUTH_MARKER_KEY) === '1' ||
    sessionStorage.getItem(AUTH_MARKER_KEY) === '1'
  )
}

export const authApi = {
  async register(payload: RegisterFormData): Promise<AuthResponse> {
    const requestBody = {
      full_name: payload.fullName,
      email: normalizeEmail(payload.email),
      phone_no: payload.phoneNo || null,
      password: payload.password,
      confirm_password: payload.confirmPassword,
    }
    const response = await authHttp.post<ApiEnvelope<AuthResponse> | AuthResponse>(
      AUTH_ENDPOINTS.register,
      requestBody,
    )

    return unwrapData(response)
  },

  async login(payload: LoginFormData): Promise<AuthResponse> {
    const requestBody = {
      email: normalizeEmail(payload.email),
      password: payload.password,
      remember_me: payload.rememberMe ?? false,
    }
    const response = await authHttp.post<ApiEnvelope<Record<string, unknown>>>(
      AUTH_ENDPOINTS.login,
      requestBody,
    )

    const data = unwrapData<Record<string, unknown>>(response)
    if (data && typeof data === 'object' && 'access_token' in data) {
      setAccessToken(data.access_token as string)
    }
    // Map snake_case from backend to camelCase User type
    const user: User = {
      id: data.id as string,
      fullName: data.full_name as string,
      email: data.email as string,
      role: data.role as string,
    }
    setSessionMarker(payload.rememberMe ?? false)
    return { user }
  },

  async me(): Promise<CurrentUserResponse> {
    const response = await authHttp.get<ApiEnvelope<Record<string, unknown>>>(
      AUTH_ENDPOINTS.me
    )

    const data = unwrapData<Record<string, unknown>>(response)
    const user: User = {
      id: data.id as string,
      fullName: data.full_name as string,
      email: data.email as string,
      role: data.role as string,
    }
    return { user }
  },

  // async forgotPassword(payload: ForgotPasswordRequest): Promise<PasswordResponse> {
  //   const response = await authHttp.post<
  //     ApiEnvelope<PasswordResponse> | PasswordResponse
  //   >(AUTH_ENDPOINTS.forgotPassword, payload)

  //   return unwrapData(response)
  // },
  async forgotPassword(
    payload: ForgotPasswordRequest,
  ): Promise<PasswordResponse> {
    const response = await authHttp.post<PasswordResponse>(
      AUTH_ENDPOINTS.forgotPassword,
      {
        ...payload,
        email: normalizeEmail(payload.email),
      },
    )

    return response.data
  },
  async resetPassword(
    payload: ResetPasswordRequest,
  ): Promise<PasswordResponse> {
    const requestBody = {
      token: payload.token,
      new_password: payload.password,
      confirm_password: payload.confirmPassword,
    }

    const response = await authHttp.post<PasswordResponse>(
      AUTH_ENDPOINTS.resetPassword,
      requestBody,
    )

    return response.data
  },

  async refreshToken(): Promise<CurrentUserResponse> {
    const response = await authHttp.post<ApiEnvelope<Record<string, unknown>>>(
      AUTH_ENDPOINTS.refresh,
    )

    const data = unwrapData<Record<string, unknown>>(response)
    const user: User = {
      id: data.id as string,
      fullName: data.full_name as string,
      email: data.email as string,
      role: data.role as string,
    }
    return { user }
  },

  async logout(): Promise<PasswordResponse> {
    const response = await authHttp.post<ApiEnvelope<PasswordResponse> | PasswordResponse>(
      AUTH_ENDPOINTS.logout,
    )
    setAccessToken(null)
    clearSessionMarkers()
    return unwrapData(response)
  },
}
