import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ForgotPasswordForm from '../auth/ForgotPasswordForm'
import LoginForm from '../auth/LoginForm'
import RegisterForm from '../auth/RegisterForm'
import ResetPasswordForm from '../auth/ResetPasswordForm'
import './AuthModal.css'

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

  // Sync activeTab with current pathname (so URL <-> tab stay in sync)
  // Skip when rendered inline inside another page (e.g. HomePage modal)
  useEffect(() => {
    if (inline) return
    let currentTab: AuthModalTab = 'login'
    if (location.pathname === '/register') currentTab = 'register'
    else if (location.pathname === '/forgot-password') currentTab = 'forgotPassword'
    else if (location.pathname === '/reset-password') currentTab = 'resetPassword'

    setActiveTab(currentTab)
  }, [inline, location.pathname])

  // Lock background scroll while modal is open
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // Handle close: just close the modal immediately
  const handleClose = () => {
    onClose()
  }

  // Navigate to a tab
  function goToTab(tab: AuthModalTab) {
    setActiveTab(tab)
    if (inline) return
    const path =
      tab === 'register' ? '/register' : tab === 'forgotPassword' ? '/forgot-password' : '/login'

    // Preserve any existing location.state (e.g backgroundLocation)
    navigate(path, { state: location.state, replace: true })
  }

  return (
    <div
      aria-modal="true"
      className="auth-modal-overlay"
      role="dialog"
      style={activeTab === 'resetPassword' ? { alignItems: 'center' } : undefined}
    >
      <div className="auth-modal-shell animate-fadeIn">
        {activeTab !== 'resetPassword' ? (
          <button
            aria-label="Close"
            className="auth-modal-close"
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

        <div className="auth-modal-card">
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

          <div className="auth-modal-form-host">
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
