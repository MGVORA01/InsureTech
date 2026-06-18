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

      {/* Show modal only when opened from another page */}
      {/*{background && (*/}
      {/*  <Routes>*/}
      {/*    <Route*/}
      {/*      path="/login"*/}
      {/*      element={*/}
      {/*        <AuthModal*/}
      {/*          initialTab="login"*/}
      {/*          onClose={() =>*/}
      {/*            navigate(background.pathname + background.search)*/}
      {/*          }*/}
      {/*        />*/}
      {/*      }*/}
      {/*    />*/}

      {/*    <Route*/}
      {/*      path="/register"*/}
      {/*      element={*/}
      {/*        <AuthModal*/}
      {/*          initialTab="register"*/}
      {/*          onClose={() =>*/}
      {/*            navigate(background.pathname + background.search)*/}
      {/*          }*/}
      {/*        />*/}
      {/*      }*/}
      {/*    />*/}

      {/*    <Route*/}
      {/*      path="/forgot-password"*/}
      {/*      element={*/}
      {/*        <AuthModal*/}
      {/*          initialTab="forgotPassword"*/}
      {/*          onClose={() =>*/}
      {/*            navigate(background.pathname + background.search)*/}
      {/*          }*/}
      {/*        />*/}
      {/*      }*/}
      {/*    />*/}

      {/*    <Route*/}
      {/*      path="/reset-password"*/}
      {/*      element={*/}
      {/*        <AuthModal*/}
      {/*          initialTab="resetPassword"*/}
      {/*          onClose={() =>*/}
      {/*            navigate(background.pathname + background.search)*/}
      {/*          }*/}
      {/*        />*/}
      {/*      }*/}
      {/*    />*/}
      {/*  </Routes>*/}
      {/*)}*/}
    </>
  )
}

export default App
