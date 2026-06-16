import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../store/store'
import {
  clearUser,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  selectAuth,
  setError,
  setLoading,
  setUser,
} from '../features/auth/authSlice'
import type { LoginFormData, RegisterFormData, User } from '../features/auth/auth.types'

export function useAuth() {
  const auth = useSelector(selectAuth)
  const dispatch = useDispatch<AppDispatch>()

  const login = useCallback(
    (data: LoginFormData) => dispatch(loginUser(data)).unwrap(),
    [dispatch],
  )

  const register = useCallback(
    (data: RegisterFormData) => dispatch(registerUser(data)).unwrap(),
    [dispatch],
  )

  const loadCurrentUser = useCallback(
    () => dispatch(fetchCurrentUser()).unwrap(),
    [dispatch],
  )

  const refreshSession = useCallback(
    () => dispatch(refreshToken()).unwrap(),
    [dispatch],
  )

  const logout = useCallback(() => dispatch(logoutUser()).unwrap(), [dispatch])

  return {
    ...auth,
    clearUser: () => dispatch(clearUser()),
    loadCurrentUser,
    login,
    logout,
    refreshSession,
    register,
    setError: (message: string | null) => dispatch(setError(message)),
    setLoading: (loading: boolean) => dispatch(setLoading(loading)),
    setUser: (user: User) => dispatch(setUser(user)),
  }
}
