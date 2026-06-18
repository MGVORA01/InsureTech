import LoginForm from '../features/auth/LoginForm'

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}

export default LoginPage
