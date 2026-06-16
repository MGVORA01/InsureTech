import axios, { AxiosError, type AxiosResponse } from 'axios'
import { AUTH_API_BASE_URL, AUTH_ENDPOINTS, AUTH_MESSAGES } from './auth.constants'
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
  baseURL: AUTH_API_BASE_URL,
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
      originalRequest.url !== AUTH_ENDPOINTS.register
    ) {
      originalRequest._retry = true
      // TODO: Enable token refresh logic below when POST /auth/refresh backend API is ready.
      /*
      try {
        const refreshRes = await authApi.refreshToken()
        // Save new token and update headers
        // setAccessToken(newAccessToken)
        // originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return authHttp(originalRequest)
      } catch (refreshError) {
        setAccessToken(null)
        return Promise.reject(refreshError)
      }
      */
    }
    return Promise.reject(error)
  }
)

function unwrapData<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const body = response.data

  if (body && typeof body === 'object' && 'data' in body) {
    return body.data
  }

  return body as T
}

export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    return axiosError.response?.data?.message ?? AUTH_MESSAGES.genericError
  }

  if (error instanceof Error) {
    return error.message
  }

  return AUTH_MESSAGES.genericError
}

export const authApi = {
  async register(payload: RegisterFormData): Promise<AuthResponse> {
    const requestBody = {
      full_name: payload.fullName,
      email: payload.email,
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
      email: payload.email,
      password: payload.password,
    }
    const response = await authHttp.post<any>(
      AUTH_ENDPOINTS.login,
      requestBody,
    )

    const data = unwrapData(response)
    if (data && typeof data === 'object' && 'access_token' in data) {
      setAccessToken(data.access_token)
    }
    return data
  },

  async me(): Promise<CurrentUserResponse> {
    const response = await authHttp.get<
      ApiEnvelope<CurrentUserResponse> | CurrentUserResponse
    >(AUTH_ENDPOINTS.me)

    return unwrapData(response)
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<PasswordResponse> {
    const response = await authHttp.post<
      ApiEnvelope<PasswordResponse> | PasswordResponse
    >(AUTH_ENDPOINTS.forgotPassword, payload)

    return unwrapData(response)
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<PasswordResponse> {
    const requestBody = {
      token: payload.token,
      new_password: payload.password,
      confirm_password: payload.confirmPassword,
    }
    const response = await authHttp.post<
      ApiEnvelope<PasswordResponse> | PasswordResponse
    >(AUTH_ENDPOINTS.resetPassword, requestBody)

    return unwrapData(response)
  },

  async refreshToken(): Promise<PasswordResponse> {
    // TODO: Enable when POST /api/auth/refresh is available.
    // const response = await authHttp.post<ApiEnvelope<PasswordResponse> | PasswordResponse>(
    //   AUTH_ENDPOINTS.refresh,
    // )
    // return unwrapData(response)
    return { message: AUTH_MESSAGES.refreshPending }
  },

  async logout(): Promise<PasswordResponse> {
    // TODO: Enable when POST /api/auth/logout is available.
    // const response = await authHttp.post<ApiEnvelope<PasswordResponse> | PasswordResponse>(
    //   AUTH_ENDPOINTS.logout,
    // )
    // return unwrapData(response)
    return { message: AUTH_MESSAGES.logoutPending }
  },
}
