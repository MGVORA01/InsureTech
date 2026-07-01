import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AuthModal from './features/auth-modal/AuthModal'
import DashboardPage from './pages/DashboardPage'
import RecommendationsPage from './pages/RecommendationsPage'
import AdminRoute from './Routes/AdminRoute'
import ProtectedRoute from './Routes/ProtectedRoute'
import { useSessionCheck } from './hooks/useSessionCheck'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as any) || {}
  const background = state.backgroundLocation
  const { checking } = useSessionCheck()

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      {/* Main routes. If we came here with a background location, render that background */}
      <Routes location={background ?? location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />}/>
        {/* Keep page versions too if desired */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/recommendations/:sessionId" element={<RecommendationsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>
      </Routes>

      {/* If there was a backgroundLocation (meaning user clicked through), render modal routes on top */}
      {background ? (
        <Routes>
          <Route
            path="/login"
            element={<AuthModal initialTab="login" onClose={() => navigate(background.pathname + background.search)} />}
          />
          <Route
            path="/register"
            element={<AuthModal initialTab="register" onClose={() => navigate(background.pathname + background.search)} />}
          />
          <Route
            path="/forgot-password"
            element={<AuthModal initialTab="forgotPassword" onClose={() => navigate(background.pathname + background.search)} />}
          />
          <Route
            path="/reset-password"
            element={<AuthModal initialTab="resetPassword" onClose={() => navigate(background.pathname + background.search)} />}
          />
        </Routes>
      ) : null}

    </>
  )
}

export default App
