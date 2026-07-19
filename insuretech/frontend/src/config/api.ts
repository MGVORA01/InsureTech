import axios, { type AxiosInstance } from "axios";

const BASE_URL = `${import.meta.env.VITE_API_URL || ""}/api/v1`;

/**
 * Shared base Axios instance for all API modules.
 * Feature-specific clients should create their own instances using BASE_URL
 * or add interceptors on top of this instance.
 */
const baseApi: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Response interceptor to attempt refresh on 401 and retry the original request.
baseApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        // Call refresh endpoint directly to avoid circular imports.
        await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          },
        );

        // Retry original request after refresh; credentials/cookies will be sent.
        return baseApi(originalRequest);
      } catch (refreshErr) {
        // On refresh failure, clear client-side session marker and let caller handle logout.
        try {
          localStorage.removeItem("ins_auth_session");
          sessionStorage.removeItem("ins_auth_session");
        } catch (e) {
          // ignore
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export { BASE_URL };
export default baseApi;
