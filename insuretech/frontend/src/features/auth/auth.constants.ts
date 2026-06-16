export const AUTH_MESSAGES = {
  loginTitle: 'Welcome back',
  loginSubtitle: 'Sign in to continue your insurance risk assessment work.',
  registerTitle: 'Create your workspace',
  registerSubtitle: 'Start building a structured risk profile for your business.',
  loginButton: 'Login',
  registerButton: 'Create account',
  rememberMe: 'Remember me',
  forgotPassword: 'Forgot password?',
  noAccount: 'Need an account?',
  hasAccount: 'Already have an account?',
  registerLink: 'Register',
  loginLink: 'Login',
  futureIntegration: 'Backend integration will be added in a future iteration.',
} as const

export const AUTH_VALIDATION = {
  emailRequired: 'Email is required.',
  emailInvalid: 'Enter a valid email address.',
  passwordRequired: 'Password is required.',
  passwordMinLength: 'Password must be at least 8 characters.',
  passwordStrong:
    'Password must include uppercase, lowercase, number, and special character.',
  fullNameRequired: 'Full name is required.',
  companyNameRequired: 'Company name is required.',
  confirmPasswordRequired: 'Confirm your password.',
  passwordMismatch: 'Passwords must match.',
} as const
