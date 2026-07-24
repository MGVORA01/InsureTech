import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import MaintenancePage from "./pages/MaintenancePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminPoliciesPage from "./pages/AdminPoliciesPage";
import AdminInsurersPage from "./pages/AdminInsurersPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AuthModal from "./features/auth-modal/AuthModal";
import DashboardPage from "./pages/DashboardPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import PolicyComparisonPage from "./pages/PolicyComparisonPage";
import ChatPage from "./pages/ChatPage";
import { NavigationLockProvider } from "./store/navigationLock";
import AdminRoute from "./routes/AdminRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import { useSessionCheck } from "./hooks/useSessionCheck";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const state =
    (location.state as { backgroundLocation?: Location } | null) || {};
  const background = state.backgroundLocation;
  const nestedBackground =
    background &&
    ((background.state as { backgroundLocation?: Location } | null)
      ?.backgroundLocation ?? null);
  const mainLocation = nestedBackground ?? background ?? location;
  const { checking, serverDown } = useSessionCheck();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (serverDown) {
    return <MaintenancePage />;
  }

  return (
    <NavigationLockProvider>
      <>
        {/* Main routes. If we came here with a background location, render that background */}
        <Routes location={background ?? location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          {/* Keep page versions too if desired */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/:section" element={<DashboardPage />} />
            <Route
              path="/recommendations/:sessionId"
              element={<RecommendationsPage />}
            />
            <Route
              path="/recommendations/:sessionId/compare"
              element={<PolicyComparisonPage />}
            />
            <Route path="/chat" element={<ChatPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/policies" element={<AdminPoliciesPage />} />
            <Route path="/admin/insurers" element={<AdminInsurersPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          </Route>
        </Routes>

        {/* If nested background exists, render the parent auth modal first */}
        {nestedBackground ? (
          <Routes location={background ?? undefined}>
            <Route
              path="/login"
              element={
                <AuthModal
                  initialTab="login"
                  onClose={() =>
                    navigate(nestedBackground.pathname + nestedBackground.search)
                  }
                />
              }
            />
            <Route
              path="/register"
              element={
                <AuthModal
                  initialTab="register"
                  onClose={() =>
                    navigate(nestedBackground.pathname + nestedBackground.search)
                  }
                />
              }
            />
            <Route
              path="/forgot-password"
              element={
                <AuthModal
                  initialTab="forgotPassword"
                  onClose={() =>
                    navigate(nestedBackground.pathname + nestedBackground.search)
                  }
                />
              }
            />
            <Route
              path="/reset-password"
              element={
                <AuthModal
                  initialTab="resetPassword"
                  onClose={() =>
                    navigate(nestedBackground.pathname + nestedBackground.search)
                  }
                />
              }
            />
          </Routes>
        ) : null}

        {/* If there was a backgroundLocation (meaning user clicked through), render modal routes on top */}
        {background ? (
          <Routes location={location}>
            <Route
              path="/login"
              element={
                <AuthModal
                  initialTab="login"
                  onClose={() =>
                    navigate(background.pathname + background.search)
                  }
                />
              }
            />
            <Route
              path="/register"
              element={
                <AuthModal
                  initialTab="register"
                  onClose={() =>
                    navigate(background.pathname + background.search)
                  }
                />
              }
            />
            <Route
              path="/forgot-password"
              element={
                <AuthModal
                  initialTab="forgotPassword"
                  onClose={() =>
                    navigate(background.pathname + background.search)
                  }
                />
              }
            />
            <Route
              path="/reset-password"
              element={
                <AuthModal
                  initialTab="resetPassword"
                  onClose={() =>
                    navigate(background.pathname + background.search)
                  }
                />
              }
            />
            <Route
              path="/verify-email"
              element={
                <VerifyEmailPage
                  inline
                  onClose={() =>
                    navigate(background.pathname + background.search)
                  }
                />
              }
            />
          </Routes>
        ) : null}
      </>
    </NavigationLockProvider>
  );
}

export default App;
