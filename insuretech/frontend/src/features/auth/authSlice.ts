import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../store/store'
import type { AuthState, User } from './auth.types'

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
      state.isAuthenticated = true
      state.error = null
    },
    clearUser(state) {
      state.user = null
      state.isAuthenticated = false
      state.error = null
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
  },
})

export const { clearUser, setError, setLoading, setUser } = authSlice.actions

export const selectAuth = (state: RootState) => state.auth
export const selectAuthUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectAuthLoading = (state: RootState) => state.auth.loading
export const selectAuthError = (state: RootState) => state.auth.error

export default authSlice.reducer
