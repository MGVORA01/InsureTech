export const AUTH_API_BASE_URL = `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

export const AUTH_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  verifyEmail: "/auth/verify-email",
  resendOtp: "/auth/resend-otp",
  me: "/auth/me",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
} as const;

export const AUTH_REFRESH_INTERVAL_MS = 12 * 60 * 1000;

export const AUTH_MESSAGES = {
  loginTitle: "Welcome back",
  loginSubtitle: "Login to continue your insurance risk assessment work.",
  registerTitle: "Create your workspace",
  registerSubtitle:
    "Start building a structured risk profile for your business.",
  loginButton: "Login",
  registerButton: "Register",
  rememberMe: "Remember me",
  forgotPassword: "Forgot password?",
  noAccount: "Need an account?",
  hasAccount: "Already have an account?",
  registerLink: "Register",
  loginLink: "Login",
  verifyTitle: "Verify your email",
  verifySubtitle: "Enter the OTP sent to your email to complete registration.",
  verifyButton: "Verify email",
  resendOtp: "Resend code",
  codeSent: "A verification code has been sent to your email.",
  genericError: "Something went wrong. Please try again.",
  refreshPending: "Refresh endpoint is pending backend implementation.",
  logoutPending: "Logout endpoint is pending backend implementation.",
} as const;

export const AUTH_VALIDATION = {
  emailRequired: "Email is required.",
  emailInvalid: "Enter a valid email address.",
  passwordRequired: "Password is required.",
  passwordMinLength: "Password must be at least 8 characters.",
  passwordStrong:
    "Password must include uppercase, lowercase, number, and special character.",
  fullNameRequired: "Full name is required.",
  phoneInvalid: "Please enter a valid 10-digit mobile number.",
  confirmPasswordRequired: "Confirm your password.",
  passwordMismatch: "Passwords must match.",
} as const;
