import ResetPasswordForm from '../features/auth/ResetPasswordForm'
import AuthLayout from '../layout/AuthLayout'

function ResetPasswordPage() {
  return (
    <AuthLayout title="Choose New Password" tagline="Create a new secure credentials to protect your workspace.">
      <ResetPasswordForm />
    </AuthLayout>
  )
}

export default ResetPasswordPage
