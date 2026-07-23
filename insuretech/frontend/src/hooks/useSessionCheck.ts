import axios from 'axios'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { authApi } from '../features/auth/authApi'
import { clearUser } from '../features/auth/authSlice'
import type { AppDispatch } from '../store/store'

const AUTH_MARKER_KEY = 'ins_auth_session'

export function useSessionCheck() {
  const [checking, setChecking] = useState(
    () => localStorage.getItem(AUTH_MARKER_KEY) !== '1'
  )
  const [serverDown, setServerDown] = useState(false)
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    // Always check server health, regardless of session marker
    const isRemembered = localStorage.getItem(AUTH_MARKER_KEY) === '1'

    authApi.me()
      .then(() => {
        // Server is up; if we have a session, validate it
        if (!isRemembered) {
          return
        }
        const isSameTab = sessionStorage.getItem(AUTH_MARKER_KEY) === '1'
        if (!isSameTab) {
          return authApi.logout()
        }
      })
      .catch((error) => {
        // If backend is down (network error or no response), show maintenance page
        if (!axios.isAxiosError(error) || ![401, 403].includes(error.response?.status ?? 0)) {
          setServerDown(true)
        }
        // Clear user on any error
        dispatch(clearUser())
      })
      .finally(() => {
        setChecking(false)
      })
  }, [dispatch])

  return { checking, serverDown }
}
