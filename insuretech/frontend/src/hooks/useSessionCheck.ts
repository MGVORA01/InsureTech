import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../config/api";
import {
  authApi,
  getUserFromStorage,
  getTokenFromStorage,
  hasSessionMarker,
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
    const checkBackendHealth = async () => {
      try {
        await axios.get(BASE_URL, {
          validateStatus: () => true,
          timeout: 4000,
        });
      } catch (error) {
        if (
          !axios.isAxiosError(error) ||
          (!error.response && error.code !== "ECONNABORTED")
        ) {
          setServerDown(true);
        }
      }
    };

    const checkSession = async () => {
      try {
        const authSessionExists = hasSessionMarker();
        const storedUser = getUserFromStorage();
        const storedToken = getTokenFromStorage();

        if (!authSessionExists) {
          try {
            localStorage.removeItem("ins_user_data");
            localStorage.removeItem("ins_access_token");
            sessionStorage.removeItem("ins_user_data");
            sessionStorage.removeItem("ins_access_token");
          } catch (e) {
            // ignore
          }

          setAccessToken(null);
          dispatch(clearUser());
          await checkBackendHealth();
          return;
        }

        if (storedUser && storedToken) {
          setAccessToken(storedToken);
          dispatch(
            setUser({
              ...storedUser,
              role: storedUser.role?.toUpperCase(),
            }),
          );
        } else {
          // Marker exists but storage is inconsistent; clear and treat as signed-out.
          try {
            localStorage.removeItem("ins_user_data");
            localStorage.removeItem("ins_access_token");
            sessionStorage.removeItem("ins_user_data");
            sessionStorage.removeItem("ins_access_token");
          } catch (e) {
            // ignore
          }
          setAccessToken(null);
          dispatch(clearUser());
          await checkBackendHealth();
          return;
        }

        try {
          const meResponse = await authApi.me();
          const currentUser = meResponse.user;
          if (currentUser) {
            dispatch(
              setUser({
                ...currentUser,
                role: currentUser.role?.toUpperCase(),
              }),
            );
          }

          if (currentUser && window.location.pathname === "/") {
            const dashboardPath =
              currentUser.role?.toUpperCase() === "ADMIN"
                ? "/admin/dashboard"
                : "/dashboard";
            navigate(dashboardPath, { replace: true });
          }
        } catch (serverError) {
          if (
            !axios.isAxiosError(serverError) ||
            ![401, 403].includes(serverError.response?.status ?? 0)
          ) {
            setServerDown(true);
          }
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
