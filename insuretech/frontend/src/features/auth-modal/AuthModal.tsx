import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ForgotPasswordForm from '../auth/ForgotPasswordForm'
import LoginForm from '../auth/LoginForm'
import RegisterForm from '../auth/RegisterForm'
import ResetPasswordForm from '../auth/ResetPasswordForm'

export type AuthModalTab = 'login' | 'register' | 'forgotPassword' | 'resetPassword'

interface AuthModalProps {
  initialTab?: AuthModalTab
  onClose: () => void
  inline?: boolean
}

function AuthModal({ initialTab = 'login', onClose, inline = false }: AuthModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<AuthModalTab>(initialTab)

  useEffect(() => {
    if (inline) return
    let currentTab: AuthModalTab = 'login'
    if (location.pathname === '/register') currentTab = 'register'
    else if (location.pathname === '/forgot-password') currentTab = 'forgotPassword'
    else if (location.pathname === '/reset-password') currentTab = 'resetPassword'

    setActiveTab(currentTab)
  }, [inline, location.pathname])

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  const handleClose = () => {
    onClose()
  }

  function goToTab(tab: AuthModalTab) {
    setActiveTab(tab)
    if (inline) return
    const path =
      tab === 'register' ? '/register' : tab === 'forgotPassword' ? '/forgot-password' : '/login'

    navigate(path, { state: location.state, replace: true })
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[color:var(--overlay-primary-dark-55)] px-4 py-5 backdrop-blur-sm"
      role="dialog"
      style={activeTab === 'resetPassword' ? { alignItems: 'center' } : undefined}
    >
      <div className="grid max-h-[calc(100vh-40px)] w-full max-w-[440px] grid-rows-[auto_minmax(0,1fr)] animate-fadeIn">
        {activeTab !== 'resetPassword' ? (
          <button
            aria-label="Close"
            className="mb-2 justify-self-end rounded-full border-0 bg-transparent p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            onClick={handleClose}
            type="button"
          >
            <svg
              fill="none"
              height="22"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="22"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        ) : null}

        <div className="min-h-0 overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[0_24px_64px_rgba(16,42,69,0.32)]">
          {activeTab !== 'forgotPassword' && activeTab !== 'resetPassword' ? (
            <div className="flex border-b border-border px-8 pt-6" role="tablist">
              <button
                aria-selected={activeTab === 'login'}
                className={`-mb-px flex-1 border-b-2 pb-3 text-center text-[15px] font-semibold transition-colors ${
                  activeTab === 'login'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
                onClick={() => goToTab('login')}
                role="tab"
                type="button"
              >
                Login
              </button>
              <button
                aria-selected={activeTab === 'register'}
                className={`-mb-px flex-1 border-b-2 pb-3 text-center text-[15px] font-semibold transition-colors ${
                  activeTab === 'register'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
                onClick={() => goToTab('register')}
                role="tab"
                type="button"
              >
                Register
              </button>
            </div>
          ) : null}

          <div className="max-h-[calc(100vh-132px)] overflow-y-auto [&>form]:w-full [&>form]:rounded-none [&>form]:border-none [&>form]:bg-transparent [&>form]:p-7 [&>form]:shadow-none sm:[&>form]:px-8 sm:[&>form]:pb-8">
            {activeTab === 'login' ? (
              <LoginForm
                onForgotPassword={() => goToTab('forgotPassword')}
                onRegister={() => goToTab('register')}
              />
            ) : null}
            {activeTab === 'register' ? <RegisterForm onLogin={() => goToTab('login')} /> : null}
            {activeTab === 'forgotPassword' ? (
              <ForgotPasswordForm onLogin={() => goToTab('login')} />
            ) : null}
            {activeTab === 'resetPassword' ? <ResetPasswordForm /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
