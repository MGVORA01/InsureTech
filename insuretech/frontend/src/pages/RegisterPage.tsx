import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Loader } from "@/components/Loader";
import { useAuth } from "../hooks/useAuth";
import RegisterForm from "../features/auth/RegisterForm";

function RegisterPage() {
  const { isAuthenticated, status, loadCurrentUser, user, error, setError } =
    useAuth();

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
        <RegisterForm />
      </div>
    </div>
  );
}

export default RegisterPage;
