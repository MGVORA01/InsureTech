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
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    const isRemembered = localStorage.getItem(AUTH_MARKER_KEY) === '1'
    if (isRemembered) return

    authApi.me()
      .then(() => {
        const isSameTab = sessionStorage.getItem(AUTH_MARKER_KEY) === '1'
        if (!isSameTab) {
          return authApi.logout()
        }
      })
      .catch(() => {})
      .finally(() => {
        dispatch(clearUser())
        setChecking(false)
      })
  }, [dispatch])

  return { checking }
}
