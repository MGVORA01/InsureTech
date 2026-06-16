import ForgotPasswordForm from '../features/auth/ForgotPasswordForm'
import AuthLayout from '../layout/AuthLayout'

function ForgotPasswordPage() {
  return (
    <AuthLayout title="Reset Your Password" tagline="Request a secure password reset link to get back to your work.">
      <ForgotPasswordForm />
    </AuthLayout>
  )
}

export default ForgotPasswordPage
