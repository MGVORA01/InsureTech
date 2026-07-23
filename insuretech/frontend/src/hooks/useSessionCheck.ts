import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  authApi,
  getUserFromStorage,
  getTokenFromStorage,
  setAccessToken,
} from "../features/auth/authApi";
import { setUser, clearUser } from "../features/auth/authSlice";
import type { AppDispatch } from "../store/store";

export function useSessionCheck() {
  const [checking, setChecking] = useState(true);
  const [serverDown, setServerDown] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // First, try to restore user from storage (for server restart recovery)
        const storedUser = getUserFromStorage();
        const storedToken = getTokenFromStorage();

        if (storedUser && storedToken) {
          // User was previously logged in; restore session and token for axios auth
          setAccessToken(storedToken);
          dispatch(
            setUser({
              ...storedUser,
              role: storedUser.role?.toUpperCase(),
            }),
          );
        }

        // ALWAYS verify server is up, even after restoring from storage
        // This ensures maintenance page shows when backend is down
        try {
          const meResponse = await authApi.me();
          // Server is responding and session is valid

          // Use the server response to get the current user data (including role)
          const currentUser = meResponse.user;
          if (currentUser) {
            dispatch(
              setUser({
                ...currentUser,
                role: currentUser.role?.toUpperCase(),
              }),
            );
          }

          // Redirect to appropriate dashboard based on user role
          if (currentUser && window.location.pathname === "/") {
            const dashboardPath =
              currentUser.role?.toUpperCase() === "ADMIN"
                ? "/admin/dashboard"
                : "/dashboard";
            navigate(dashboardPath, { replace: true });
          }
        } catch (serverError) {
          // Server health check failed; check if it's a network error
          if (
            !axios.isAxiosError(serverError) ||
            ![401, 403].includes(serverError.response?.status ?? 0)
          ) {
            // Network error or server down (not 401/403) → show maintenance page
            setServerDown(true);
          }
          // Clear user on error
          dispatch(clearUser());
        }
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [dispatch, navigate]);

  return { checking, serverDown };
}
