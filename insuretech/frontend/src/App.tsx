import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AuthModal from './features/auth-modal/AuthModal'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as any) || {}
  const background = state.backgroundLocation

  // routes that can be shown as modal
  const modalRoutes = ['/login', '/register', '/forgot-password', '/reset-password']

  return (
    <>
      {/* Main routes. If we came here with a background location, render that background */}
      <Routes location={background ?? location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reset-password"  element={background || location.pathname !== '/reset-password' ? <ResetPasswordPage /> : null}/>
        {/* Keep page versions too if desired */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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

      {/* If there's no background and we're directly on an auth path, render Home behind the modal so direct visits show the same modal-over-home UX */}
      {!background && modalRoutes.includes(location.pathname) ? (
        <>
          {location.pathname !== '/reset-password' ? <HomePage /> : null}
          <AuthModal
            initialTab={
              location.pathname === '/register'
                ? 'register'
                : location.pathname === '/forgot-password'
                ? 'forgotPassword'
                : location.pathname === '/reset-password'
                ? 'resetPassword'
                : 'login'
            }
            onClose={() => navigate('/')}
          />
        </>
      ) : null}
    </>
  )
}

export default App
