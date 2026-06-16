import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../store/store'
import {
  clearUser,
  selectAuth,
  setError,
  setLoading,
  setUser,
} from './authSlice'
import type { LoginFormData, RegisterFormData, User } from './auth.types'

export function useAuth() {
  const auth = useSelector(selectAuth)
  const dispatch = useDispatch<AppDispatch>()

  const login = useCallback(
    async (data: LoginFormData) => {
      dispatch(setLoading(true))
      dispatch(setError(null))

      try {
        void data
        // TODO: Replace with login mutation when backend integration is added.
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch],
  )

  const register = useCallback(
    async (data: RegisterFormData) => {
      dispatch(setLoading(true))
      dispatch(setError(null))

      try {
        void data
        // TODO: Replace with register mutation when backend integration is added.
      } finally {
        dispatch(setLoading(false))
      }
    },
    [dispatch],
  )

  const logout = useCallback(() => {
    // TODO: Replace with logout mutation when backend integration is added.
    dispatch(clearUser())
  }, [dispatch])

  return {
    ...auth,
    clearUser: () => dispatch(clearUser()),
    login,
    logout,
    register,
    setError: (message: string | null) => dispatch(setError(message)),
    setLoading: (loading: boolean) => dispatch(setLoading(loading)),
    setUser: (user: User) => dispatch(setUser(user)),
  }
}
