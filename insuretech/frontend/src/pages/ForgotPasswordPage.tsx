import ForgotPasswordForm from '../features/auth/ForgotPasswordForm'

function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

export default ForgotPasswordPage
