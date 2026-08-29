import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader } from "@/components/Loader";
import { useAuth } from "../hooks/useAuth";
import LoginForm from "../features/auth/LoginForm";

interface LocationState {
  from?: { pathname: string };
}

function LoginPage() {
  const { isAuthenticated, status, loadCurrentUser, user, error, setError } =
    useAuth();
  const location = useLocation();

  useEffect(() => {
    if (status === "idle" && !isAuthenticated) {
      loadCurrentUser();
    }
  }, [status, isAuthenticated, loadCurrentUser]);

  useEffect(() => {
    if (status === "unauthenticated" && error) {
      setError(null);
    }
  }, [status, error, setError]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader variant="badge-check" label="Loading your account..." size={56} />
      </div>
    );
  }

  if (isAuthenticated) {
    const state = location.state as LocationState | null;
    const from = state?.from?.pathname;
    if (
      from &&
      from !== "/login" &&
      from !== "/register" &&
      from !== "/forgot-password"
    ) {
      return <Navigate to={from} replace />;
    }
    return (
      <Navigate
        to={
          user?.role?.toUpperCase() === "ADMIN"
            ? "/admin/dashboard"
            : "/dashboard"
        }
        replace
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}

export default LoginPage;
