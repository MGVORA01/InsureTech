export interface User {
  id: string;
  fullName: string;
  businessType?: string;
  companyName?: string;
  email: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  phoneNo?: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
  otp: string;
}

export interface ResendOtpRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "failed";
}

export interface PasswordState {
  loading: boolean;
  error: string | null;
  message: string | null;
}

export interface ApiErrorResponse {
  // Backend sends errors in 'error' field via APIResponse.error_response()
  error?: string | null;
  message?: string | null;
  success?: boolean;
  statusCode?: number;
}

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface AuthResponse {
  // Login returns tokens; user is populated only when /me endpoint exists
  access_token?: string;
  refresh_token?: string;
  verification_token?: string;
  user?: User;
  message?: string;
}

export interface CurrentUserResponse {
  user: User;
}

export interface PasswordResponse {
  message: string;
}
