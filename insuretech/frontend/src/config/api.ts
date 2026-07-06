import axios, { type AxiosInstance } from 'axios'

const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`

/**
 * Shared base Axios instance for all API modules.
 * Feature-specific clients should create their own instances using BASE_URL
 * or add interceptors on top of this instance.
 */
const baseApi: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

export { BASE_URL }
export default baseApi
